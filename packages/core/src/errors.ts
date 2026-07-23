export class ParseError extends Error {
  readonly format: string;
  readonly line: number | undefined;
  readonly column: number | undefined;

  constructor(
    message: string,
    format: string,
    options?: { line?: number; column?: number; cause?: unknown },
  ) {
    super(message);
    this.name = 'ParseError';
    this.format = format;
    this.line = options?.line;
    this.column = options?.column;
    if (options?.cause !== undefined) {
      Object.defineProperty(this, 'cause', { value: options.cause, writable: true, configurable: true });
    }
  }
}

export class UnsupportedFormatError extends Error {
  constructor(hint?: string) {
    super(
      hint
        ? `Could not detect file format: ${hint}`
        : 'Could not detect file format. Pass { format } explicitly or check the file is not empty.',
    );
    this.name = 'UnsupportedFormatError';
  }
}

export class NotImplementedError extends Error {
  readonly format: string;

  constructor(format: string) {
    super(`Parser for ${format} is not yet implemented. Track progress at https://github.com/hkpritiranjan/finparse`);
    this.name = 'NotImplementedError';
    this.format = format;
  }
}
