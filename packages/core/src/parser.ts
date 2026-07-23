import type { BankStatement, FormatType } from './schema.js';

export type InputEncoding = 'utf-8' | 'utf8' | 'latin1' | 'ascii' | 'binary';

export interface ParseOptions {
  /** Encoding of the input. Defaults to 'utf-8'. */
  encoding?: InputEncoding;
  /** Override auto-detection and force a specific format. */
  format?: FormatType;
  /**
   * Timezone to assume for dates that have no timezone info.
   * Expressed as UTC offset in minutes. Defaults to 0 (UTC).
   */
  defaultTimezoneOffset?: number;
}

export interface Parser {
  readonly format: FormatType;
  /** Returns true if this parser can handle the given input. */
  detect(input: string): boolean;
  /** Parse the full input and return a BankStatement. */
  parse(input: string, options?: ParseOptions): BankStatement;
}
