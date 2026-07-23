import type {
  AccountInfo,
  AccountType,
  Balance,
  BankStatement,
  Transaction,
  TransactionType,
} from '@finparse/core';
import { ParseError } from '@finparse/core';
import type { OFXNode } from './tokenizer.js';
import { childValue, findChild, findChildren } from './tokenizer.js';

const OFX_TXN_TYPE_MAP: Record<string, TransactionType> = {
  CREDIT: 'credit',
  DEBIT: 'debit',
  INT: 'interest',
  DIV: 'dividend',
  FEE: 'fee',
  SRVCHG: 'fee',
  DEP: 'credit',
  ATM: 'atm',
  POS: 'pos',
  XFER: 'transfer',
  CHECK: 'check',
  PAYMENT: 'payment',
  CASH: 'atm',
  DIRECTDEP: 'credit',
  DIRECTDEBIT: 'debit',
  REPEATPMT: 'payment',
  HOLD: 'other',
  OTHER: 'other',
};

const ACCOUNT_TYPE_MAP: Record<string, AccountType> = {
  CHECKING: 'CHECKING',
  SAVINGS: 'SAVINGS',
  CREDITLINE: 'CREDITLINE',
  MONEYMRKT: 'MONEYMRKT',
};

/**
 * Parse OFX date strings into JavaScript Date objects.
 * Formats: YYYYMMDD, YYYYMMDDHHMMSS, YYYYMMDDHHMMSS.mmm, YYYYMMDDHHMMSS[±hh:TZ]
 */
export function parseOFXDate(raw: string): Date {
  const s = raw.trim();
  const year = s.slice(0, 4);
  const month = s.slice(4, 6);
  const day = s.slice(6, 8);
  const hour = s.slice(8, 10) || '00';
  const min = s.slice(10, 12) || '00';
  const sec = s.slice(12, 14) || '00';

  const tzMatch = /\[([+-]?\d+(?:\.\d+)?):/.exec(s);
  let offsetMin = 0;
  if (tzMatch?.[1] !== undefined) {
    offsetMin = parseFloat(tzMatch[1]) * 60;
  }

  const isoStr = `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
  const base = new Date(isoStr);
  if (isNaN(base.getTime())) {
    throw new ParseError(`Invalid OFX date: "${raw}"`, 'OFX');
  }

  return new Date(base.getTime() - offsetMin * 60_000);
}

/** Parse OFX amount string to a signed float (positive = credit, negative = debit). */
export function parseOFXAmount(raw: string): number {
  const n = parseFloat(raw.trim().replace(/,/g, ''));
  if (isNaN(n)) throw new ParseError(`Invalid OFX amount: "${raw}"`, 'OFX');
  return n;
}

function mapAccountType(raw: string | undefined): AccountType {
  return ACCOUNT_TYPE_MAP[raw?.toUpperCase() ?? ''] ?? 'UNKNOWN';
}

function mapTransactionType(raw: string | undefined): TransactionType {
  return OFX_TXN_TYPE_MAP[raw?.toUpperCase() ?? ''] ?? 'other';
}

function mapAccount(acctNode: OFXNode): AccountInfo {
  const routingNumber = childValue(acctNode, 'BANKID');
  return {
    id: childValue(acctNode, 'ACCTID') ?? '',
    type: mapAccountType(childValue(acctNode, 'ACCTTYPE')),
    ...(routingNumber !== undefined ? { routingNumber } : {}),
  };
}

function mapBalance(balNode: OFXNode | undefined, currency: string): Balance | undefined {
  if (!balNode) return undefined;
  const amtRaw = childValue(balNode, 'BALAMT');
  const dtRaw = childValue(balNode, 'DTASOF');
  if (!amtRaw || !dtRaw) return undefined;
  return {
    amount: parseOFXAmount(amtRaw),
    currency,
    date: parseOFXDate(dtRaw),
  };
}

function mapTransaction(txnNode: OFXNode, currency: string): Transaction {
  const id = childValue(txnNode, 'FITID') ?? '';
  const amtRaw = childValue(txnNode, 'TRNAMT') ?? '0';
  const dtPostedRaw = childValue(txnNode, 'DTPOSTED');
  const dtUserRaw = childValue(txnNode, 'DTUSER');
  const name = childValue(txnNode, 'NAME') ?? '';
  const memo = childValue(txnNode, 'MEMO') ?? '';
  const description = [name, memo].filter(Boolean).join(' — ') || 'No description';
  const reference = childValue(txnNode, 'REFNUM');
  const checkNumber = childValue(txnNode, 'CHECKNUM');

  const raw: Record<string, unknown> = {};
  for (const child of txnNode.children) {
    raw[child.tag] = child.value ?? null;
  }

  const counterpartyName = name || undefined;

  return {
    id,
    valueDate: dtPostedRaw ? parseOFXDate(dtPostedRaw) : new Date(0),
    amount: parseOFXAmount(amtRaw),
    currency,
    type: mapTransactionType(childValue(txnNode, 'TRNTYPE')),
    description,
    raw,
    ...(dtUserRaw !== undefined ? { bookingDate: parseOFXDate(dtUserRaw) } : {}),
    ...(reference !== undefined ? { reference } : {}),
    ...(checkNumber !== undefined ? { checkNumber } : {}),
    ...(counterpartyName !== undefined ? { counterparty: { name: counterpartyName } } : {}),
  };
}

/** Map a parsed OFX node tree to a BankStatement. */
export function mapOFXTree(root: OFXNode): BankStatement {
  const bankMsgs =
    findChild(root, 'BANKMSGSRSV1') ??
    findChild(root, 'CREDITCARDMSGSRSV1') ??
    findChild(root, 'INVSTMTMSGSRSV1');

  if (!bankMsgs) {
    throw new ParseError('No bank message set (BANKMSGSRSV1 / CREDITCARDMSGSRSV1) found in OFX', 'OFX');
  }

  const stmtTrnRs =
    findChild(bankMsgs, 'STMTTRNRS') ??
    findChild(bankMsgs, 'CCSTMTTRNRS') ??
    findChild(bankMsgs, 'INVSTMTTRNRS');

  if (!stmtTrnRs) {
    throw new ParseError('No STMTTRNRS element found in OFX', 'OFX');
  }

  const stmtRs =
    findChild(stmtTrnRs, 'STMTRS') ??
    findChild(stmtTrnRs, 'CCSTMTRS') ??
    findChild(stmtTrnRs, 'INVSTMTRS');

  if (!stmtRs) {
    throw new ParseError('No STMTRS element found in OFX', 'OFX');
  }

  const currency = childValue(stmtRs, 'CURDEF') ?? 'USD';

  const acctNode =
    findChild(stmtRs, 'BANKACCTFROM') ??
    findChild(stmtRs, 'CCACCTFROM') ??
    findChild(stmtRs, 'INVACCTFROM');

  if (!acctNode) {
    throw new ParseError('No account element found in OFX', 'OFX');
  }

  const account = mapAccount(acctNode);

  const tranList = findChild(stmtRs, 'BANKTRANLIST');
  const transactions: Transaction[] = tranList
    ? findChildren(tranList, 'STMTTRN').map((t) => mapTransaction(t, currency))
    : [];

  const fromRaw = tranList ? childValue(tranList, 'DTSTART') : undefined;
  const toRaw = tranList ? childValue(tranList, 'DTEND') : undefined;

  const firstTxDate = transactions[0]?.valueDate ?? new Date(0);
  const lastTxDate = transactions[transactions.length - 1]?.valueDate ?? new Date(0);

  const period = {
    from: fromRaw ? parseOFXDate(fromRaw) : firstTxDate,
    to: toRaw ? parseOFXDate(toRaw) : lastTxDate,
  };

  const openingBalance = mapBalance(findChild(stmtRs, 'LEDGERBAL'), currency);
  const closingBalance = mapBalance(findChild(stmtRs, 'AVAILBAL'), currency);

  return {
    format: 'OFX',
    account,
    currency,
    period,
    transactions,
    raw: root,
    ...(openingBalance !== undefined ? { openingBalance } : {}),
    ...(closingBalance !== undefined ? { closingBalance } : {}),
  };
}
