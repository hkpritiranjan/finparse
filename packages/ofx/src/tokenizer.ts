export type OFXVersion = 'SGML' | 'XML';

export interface OFXHeader {
  version: string;
  encoding: string;
  charset: string;
  ofxVersion: OFXVersion;
}

export type OpenToken = { type: 'open'; name: string };
export type CloseToken = { type: 'close'; name: string };
export type ValueToken = { type: 'value'; name: string; value: string };
export type Token = OpenToken | CloseToken | ValueToken;

export interface OFXNode {
  tag: string;
  value?: string;
  children: OFXNode[];
}

const SGML_HEADER_RE = /^OFXHEADER:/;
const XML_HEADER_RE = /^<\?xml|^<OFX[\s>]/;

export function detectVersion(input: string): OFXVersion {
  const head = input.trimStart().slice(0, 20);
  if (SGML_HEADER_RE.test(head)) return 'SGML';
  if (XML_HEADER_RE.test(head)) return 'XML';
  // QFX sometimes omits the OFXHEADER line but uses SGML format
  if (input.includes('<OFX>')) return 'SGML';
  throw new Error('Cannot determine OFX version from input');
}

export function parseHeader(input: string): { header: OFXHeader; body: string } {
  const version = detectVersion(input);

  if (version === 'XML') {
    return {
      header: { version: '2', encoding: 'UTF-8', charset: 'UTF-8', ofxVersion: 'XML' },
      body: input,
    };
  }

  // SGML: header block ends at the first blank line before <OFX>
  const blankLine = input.indexOf('\n\n');
  const headerText = blankLine !== -1 ? input.slice(0, blankLine) : '';
  const body = blankLine !== -1 ? input.slice(blankLine).trimStart() : input;

  const get = (key: string): string => {
    const m = new RegExp(`^${key}:(.*)$`, 'im').exec(headerText);
    return m?.[1]?.trim() ?? '';
  };

  return {
    header: {
      version: get('VERSION'),
      encoding: get('ENCODING'),
      charset: get('CHARSET'),
      ofxVersion: 'SGML',
    },
    body,
  };
}

/**
 * Tokenises OFX SGML body into a flat token stream.
 * Also handles OFX v2 XML (stray close tags for leaf elements are tolerated
 * during tree construction).
 */
export function tokenize(body: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = body.length;

  while (i < len) {
    // skip whitespace
    while (i < len && (body[i] === ' ' || body[i] === '\t' || body[i] === '\r' || body[i] === '\n')) {
      i++;
    }
    if (i >= len) break;

    if (body[i] !== '<') {
      // bare text outside a tag — skip until next tag
      while (i < len && body[i] !== '<') i++;
      continue;
    }

    i++; // consume '<'

    const isClose = body[i] === '/';
    if (isClose) i++;

    // read tag name (stop at '>' or whitespace)
    let name = '';
    while (i < len && body[i] !== '>' && body[i] !== ' ' && body[i] !== '\t') {
      name += body[i++];
    }
    // skip to '>'
    while (i < len && body[i] !== '>') i++;
    i++; // consume '>'

    name = name.trim().toUpperCase();
    if (!name) continue;

    if (isClose) {
      tokens.push({ type: 'close', name });
      continue;
    }

    // peek ahead: is there a value before the next '<' or newline?
    let value = '';
    while (i < len && body[i] !== '<' && body[i] !== '\r' && body[i] !== '\n') {
      value += body[i++];
    }
    value = value.trim();

    if (value) {
      tokens.push({ type: 'value', name, value });
    } else {
      tokens.push({ type: 'open', name });
    }
  }

  return tokens;
}

/** Build an OFXNode tree from a flat token stream. */
export function buildTree(tokens: Token[]): OFXNode {
  let i = 0;

  function parseContainer(tag: string): OFXNode {
    const node: OFXNode = { tag, children: [] };

    while (i < tokens.length) {
      const tok = tokens[i];
      if (!tok) break;

      if (tok.type === 'close') {
        i++;
        if (tok.name === tag) break; // matching close tag
        // stray close tag (OFX v2 leaf element) — ignore and continue
        continue;
      }

      if (tok.type === 'value') {
        i++;
        node.children.push({ tag: tok.name, value: tok.value, children: [] });
        continue;
      }

      // tok.type === 'open'
      i++;
      node.children.push(parseContainer(tok.name));
    }

    return node;
  }

  // find the OFX root element
  while (i < tokens.length) {
    const tok = tokens[i];
    if (!tok) break;
    if (tok.type === 'open' && tok.name === 'OFX') {
      i++;
      return parseContainer('OFX');
    }
    i++;
  }

  throw new Error('No <OFX> root element found');
}

/** Convenience: find the first child node with the given tag. */
export function findChild(node: OFXNode, tag: string): OFXNode | undefined {
  return node.children.find((c) => c.tag === tag.toUpperCase());
}

/** Convenience: find all children with the given tag. */
export function findChildren(node: OFXNode, tag: string): OFXNode[] {
  return node.children.filter((c) => c.tag === tag.toUpperCase());
}

/** Get the string value of a leaf child node. */
export function childValue(node: OFXNode, tag: string): string | undefined {
  return findChild(node, tag)?.value;
}
