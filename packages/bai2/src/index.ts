import type { BankStatement, ParseOptions, Parser } from '@finparse/core';
import { NotImplementedError } from '@finparse/core';

export const bai2Parser: Parser = {
  format: 'BAI2',

  detect(input: string): boolean {
    // BAI2 files start with record type 01 (file header)
    return /^01,/.test(input.trimStart());
  },

  parse(_input: string, _options?: ParseOptions): BankStatement {
    throw new NotImplementedError('BAI2');
  },
};

export function parse(_input: string, _options?: ParseOptions): BankStatement {
  throw new NotImplementedError('BAI2');
}
