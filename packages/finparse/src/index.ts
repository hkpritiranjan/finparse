import type { BankStatement, FormatType, ParseOptions, Parser } from '@finparse/core';
import { UnsupportedFormatError } from '@finparse/core';
import { ofxParser } from '@finparse/ofx';
import { mt940Parser } from '@finparse/mt940';
import { camt053Parser } from '@finparse/camt053';
import { bai2Parser } from '@finparse/bai2';

export type { BankStatement, FormatType, ParseOptions, Transaction, AccountInfo, Balance } from '@finparse/core';
export { ParseError, UnsupportedFormatError, NotImplementedError } from '@finparse/core';

const PARSERS: Parser[] = [ofxParser, mt940Parser, camt053Parser, bai2Parser];

/**
 * Auto-detect the format of the given input string.
 * Returns null if no registered parser can identify the format.
 */
export function detect(input: string): FormatType | null {
  return PARSERS.find((p) => p.detect(input))?.format ?? null;
}

/**
 * Parse a bank statement file into a unified BankStatement.
 *
 * @example
 * import { parse } from 'finparse';
 * import { readFileSync } from 'node:fs';
 *
 * const stmt = parse(readFileSync('statement.ofx', 'utf-8'));
 * console.log(stmt.transactions.length);
 */
export function parse(input: string, options?: ParseOptions): BankStatement {
  const format = options?.format ?? detect(input);
  if (!format) {
    throw new UnsupportedFormatError(`No parser matched the input. First 80 chars: "${input.slice(0, 80)}"`);
  }

  const parser = PARSERS.find((p) => p.format === format);
  if (!parser) {
    throw new UnsupportedFormatError(`No parser registered for format "${format}"`);
  }

  return parser.parse(input, options);
}
