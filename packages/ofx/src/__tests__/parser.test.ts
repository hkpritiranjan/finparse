import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '../index.js';
import { parseOFXAmount, parseOFXDate } from '../mapper.js';
import { buildTree, tokenize } from '../tokenizer.js';

const fixturesDir = resolve(import.meta.dirname, '../../../../fixtures/ofx');

function fixture(name: string): string {
  return readFileSync(resolve(fixturesDir, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------
describe('parseOFXDate', () => {
  it('parses YYYYMMDD', () => {
    const d = parseOFXDate('20240115');
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(0); // January
    expect(d.getUTCDate()).toBe(15);
  });

  it('parses YYYYMMDDHHMMSS', () => {
    const d = parseOFXDate('20240115143000');
    expect(d.getUTCHours()).toBe(14);
    expect(d.getUTCMinutes()).toBe(30);
  });

  it('parses datetime with timezone offset', () => {
    const d = parseOFXDate('20240115120000[-5:EST]');
    // UTC = 12:00 - (-5h) → 17:00 UTC
    expect(d.getUTCHours()).toBe(17);
  });

  it('parses datetime with GMT offset [0:GMT]', () => {
    const d = parseOFXDate('20240115120000[0:GMT]');
    expect(d.getUTCHours()).toBe(12);
  });

  it('throws on invalid date', () => {
    expect(() => parseOFXDate('NOTADATE')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Amount parsing
// ---------------------------------------------------------------------------
describe('parseOFXAmount', () => {
  it('parses positive amounts', () => {
    expect(parseOFXAmount('2500.00')).toBe(2500);
    expect(parseOFXAmount('+500.50')).toBe(500.5);
  });

  it('parses negative amounts', () => {
    expect(parseOFXAmount('-52.35')).toBe(-52.35);
  });

  it('handles amounts with commas', () => {
    expect(parseOFXAmount('1,200.00')).toBe(1200);
  });

  it('throws on non-numeric input', () => {
    expect(() => parseOFXAmount('N/A')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------
describe('tokenize', () => {
  it('produces value tokens for SGML leaf elements', () => {
    const tokens = tokenize('<CURDEF>USD\n<TRNAMT>-52.35\n');
    expect(tokens).toEqual([
      { type: 'value', name: 'CURDEF', value: 'USD' },
      { type: 'value', name: 'TRNAMT', value: '-52.35' },
    ]);
  });

  it('produces open/close tokens for container elements', () => {
    const tokens = tokenize('<STMTRS>\n<CURDEF>USD\n</STMTRS>');
    expect(tokens[0]).toEqual({ type: 'open', name: 'STMTRS' });
    expect(tokens[1]).toEqual({ type: 'value', name: 'CURDEF', value: 'USD' });
    expect(tokens[2]).toEqual({ type: 'close', name: 'STMTRS' });
  });

  it('normalises tag names to uppercase', () => {
    const tokens = tokenize('<CurDef>USD');
    expect(tokens[0]).toMatchObject({ name: 'CURDEF' });
  });
});

// ---------------------------------------------------------------------------
// Tree builder
// ---------------------------------------------------------------------------
describe('buildTree', () => {
  it('builds a nested tree from tokens', () => {
    const tokens = tokenize('<OFX>\n<BANKMSGSRSV1>\n<STMTTRNRS>\n</STMTTRNRS>\n</BANKMSGSRSV1>\n</OFX>');
    const tree = buildTree(tokens);
    expect(tree.tag).toBe('OFX');
    expect(tree.children[0]?.tag).toBe('BANKMSGSRSV1');
    expect(tree.children[0]?.children[0]?.tag).toBe('STMTTRNRS');
  });

  it('tolerates stray close tags (OFX v2 leaf elements)', () => {
    // Simulates <TRNTYPE>CHECK</TRNTYPE> — value token + stray close tag
    const tokens = tokenize('<OFX>\n<TRNTYPE>CHECK\n</TRNTYPE>\n</OFX>');
    const tree = buildTree(tokens);
    expect(tree.children[0]).toMatchObject({ tag: 'TRNTYPE', value: 'CHECK' });
  });

  it('throws when no OFX root element is present', () => {
    const tokens = tokenize('<NOTOFX>\n</NOTOFX>');
    expect(() => buildTree(tokens)).toThrow('No <OFX> root element found');
  });
});

// ---------------------------------------------------------------------------
// Full parse — checking account fixture
// ---------------------------------------------------------------------------
describe('parse (checking fixture)', () => {
  const stmt = parse(fixture('sample-checking.ofx'));

  it('returns format OFX', () => {
    expect(stmt.format).toBe('OFX');
  });

  it('maps account info', () => {
    expect(stmt.account.id).toBe('123456789');
    expect(stmt.account.routingNumber).toBe('021000021');
    expect(stmt.account.type).toBe('CHECKING');
  });

  it('maps currency', () => {
    expect(stmt.currency).toBe('USD');
  });

  it('maps period', () => {
    expect(stmt.period.from.getUTCFullYear()).toBe(2024);
    expect(stmt.period.from.getUTCMonth()).toBe(0);
    expect(stmt.period.from.getUTCDate()).toBe(1);
  });

  it('maps 5 transactions', () => {
    expect(stmt.transactions).toHaveLength(5);
  });

  it('maps debit transaction correctly', () => {
    const t = stmt.transactions.find((x) => x.id === '20240103001');
    expect(t).toBeDefined();
    expect(t?.amount).toBe(-52.35);
    expect(t?.type).toBe('debit');
    expect(t?.description).toContain('WHOLE FOODS');
  });

  it('maps credit transaction correctly', () => {
    const t = stmt.transactions.find((x) => x.id === '20240110001');
    expect(t?.amount).toBe(3250);
    expect(t?.type).toBe('credit');
  });

  it('maps ATM transaction type', () => {
    const t = stmt.transactions.find((x) => x.type === 'atm');
    expect(t?.amount).toBe(-200);
  });

  it('maps fee transaction type', () => {
    const t = stmt.transactions.find((x) => x.type === 'fee');
    expect(t?.amount).toBe(-12);
  });

  it('maps check number', () => {
    const t = stmt.transactions.find((x) => x.id === '20240105001');
    expect(t?.checkNumber).toBe('1042');
  });

  it('maps closing balance', () => {
    expect(stmt.closingBalance?.amount).toBe(4821.47);
    expect(stmt.closingBalance?.currency).toBe('USD');
  });
});

// ---------------------------------------------------------------------------
// Full parse — savings account fixture
// ---------------------------------------------------------------------------
describe('parse (savings fixture)', () => {
  const stmt = parse(fixture('sample-savings.ofx'));

  it('maps SAVINGS account type', () => {
    expect(stmt.account.type).toBe('SAVINGS');
  });

  it('maps transfer transaction', () => {
    const t = stmt.transactions.find((x) => x.type === 'transfer');
    expect(t?.amount).toBe(500);
  });

  it('maps interest transaction', () => {
    const t = stmt.transactions.find((x) => x.type === 'interest');
    expect(t?.amount).toBe(12.43);
  });
});

// ---------------------------------------------------------------------------
// detect()
// ---------------------------------------------------------------------------
describe('ofxParser.detect', () => {
  it('detects SGML OFX by header', async () => {
    const { ofxParser } = await import('../index.js');
    expect(ofxParser.detect('OFXHEADER:100\nDATA:OFXSGML')).toBe(true);
  });

  it('detects XML OFX', async () => {
    const { ofxParser } = await import('../index.js');
    expect(ofxParser.detect('<?xml version="1.0"?>\n<OFX>')).toBe(true);
  });

  it('rejects non-OFX input', async () => {
    const { ofxParser } = await import('../index.js');
    expect(ofxParser.detect(':20:STMT\n:25:GB29NWBK60161331926819')).toBe(false);
  });
});
