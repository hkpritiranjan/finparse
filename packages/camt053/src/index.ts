import type { BankStatement, ParseOptions, Parser } from '@finparse/core';
import { NotImplementedError } from '@finparse/core';

export const camt053Parser: Parser = {
  format: 'CAMT053',

  detect(input: string): boolean {
    // CAMT.053 is XML and contains the BkToCstmrStmt or CstmrAcctStmt element
    return input.includes('BkToCstmrStmt') || input.includes('CstmrAcctStmt');
  },

  parse(_input: string, _options?: ParseOptions): BankStatement {
    throw new NotImplementedError('CAMT053');
  },
};

export function parse(_input: string, _options?: ParseOptions): BankStatement {
  throw new NotImplementedError('CAMT053');
}
