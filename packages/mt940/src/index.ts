import type { BankStatement, ParseOptions, Parser } from '@finparse/core';
import { NotImplementedError } from '@finparse/core';

export const mt940Parser: Parser = {
  format: 'MT940',

  detect(input: string): boolean {
    // MT940 messages start with field :20: (transaction reference number)
    return /^:20:/.test(input.trimStart());
  },

  parse(_input: string, _options?: ParseOptions): BankStatement {
    throw new NotImplementedError('MT940');
  },
};

export function parse(_input: string, _options?: ParseOptions): BankStatement {
  throw new NotImplementedError('MT940');
}
