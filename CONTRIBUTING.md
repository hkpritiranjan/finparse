# Contributing to finparse

Thanks for helping. The most valuable contributions right now are:

1. **New bank compatibility reports** — does your bank's export parse correctly?
2. **New format parsers** — MT940, CAMT.053, BAI2
3. **Bug fixes** — wrong field mapped, date off by a day, etc.

## Setup

```sh
git clone https://github.com/hkpritiranjan/finparse
cd finparse
pnpm install
pnpm build
pnpm test
```

Requires Node 18+ and pnpm 9+.

## Adding a bank compatibility fixture

1. Export a statement from your bank (OFX, MT940, etc.)
2. **Anonymise it**: replace account numbers, names, real amounts with fake data
3. Add it to `fixtures/<format>/sample-<bank-name>.ofx` (or `.mt940`, etc.)
4. Add a test case in `packages/<format>/src/__tests__/parser.test.ts`
5. Add the bank to the compatibility table in `README.md`
6. Open a PR

## Adding a new format parser

Each parser lives in `packages/<format>/` and must implement the `Parser` interface from `@finparse/core`:

```ts
import type { Parser } from '@finparse/core';

export const myParser: Parser = {
  format: 'MYFORMAT',

  detect(input: string): boolean {
    // return true if this input looks like your format
  },

  parse(input: string, options): BankStatement {
    // parse and return BankStatement
  },
};
```

Steps:
1. Copy `packages/mt940` as a template (it's a clean stub)
2. Implement `detect()` and `parse()`
3. Add fixtures in `fixtures/<format>/`
4. Write tests — aim for >80% coverage
5. Register your parser in `packages/finparse/src/index.ts`
6. Update the status table in `README.md`
7. Open a PR

## Commit style

```
feat(ofx): handle QFX Intuit extensions
fix(ofx): correct timezone offset sign
feat(mt940): initial parser implementation
```

## Changesets

When your PR is ready, run `pnpm changeset` to describe the change. Pick the right semver bump (patch for bug fix, minor for new feature/parser).

## Tests

```sh
pnpm test              # run all tests
pnpm test:watch        # watch mode
pnpm test:coverage     # coverage report
```
