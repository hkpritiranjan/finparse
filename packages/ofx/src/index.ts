import type { BankStatement, ParseOptions, Parser } from '@finparse/core';
import { ParseError } from '@finparse/core';
import { buildTree, parseHeader, tokenize } from './tokenizer.js';
import { mapOFXTree } from './mapper.js';

export { parseOFXDate, parseOFXAmount } from './mapper.js';
export type { OFXNode, OFXHeader, OFXVersion, Token } from './tokenizer.js';

const OFX_DETECT_RE = /^OFXHEADER:|^<\?xml[\s\S]*?<OFX|^<OFX[\s>]/;

export const ofxParser: Parser = {
  format: 'OFX',

  detect(input: string): boolean {
    return OFX_DETECT_RE.test(input.trimStart().slice(0, 512));
  },

  parse(input: string, _options?: ParseOptions): BankStatement {
    try {
      const { body } = parseHeader(input);
      const tokens = tokenize(body);
      const tree = buildTree(tokens);
      return mapOFXTree(tree);
    } catch (err) {
      if (err instanceof ParseError) throw err;
      throw new ParseError(
        err instanceof Error ? err.message : String(err),
        'OFX',
        { cause: err },
      );
    }
  },
};

/** Parse an OFX or QFX file string into a normalised BankStatement. */
export function parse(input: string, options?: ParseOptions): BankStatement {
  return ofxParser.parse(input, options);
}
