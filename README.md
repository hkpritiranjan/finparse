# finparse

Parse any bank statement file into a single, normalised schema — zero runtime dependencies.

```ts
import { parse } from 'finparse';

const stmt = parse(readFileSync('statement.ofx', 'utf-8'));
// { format: 'OFX', account: {...}, transactions: [...], ... }
```

## Supported formats

| Format | Status | Used by |
|--------|--------|---------|
| OFX / QFX (v1 SGML + v2 XML) | ✅ Ready | US banks, Quicken, QuickBooks |
| MT940 / MT942 | 🚧 v0.2 | European banks, SWIFT |
| CAMT.053 / CAMT.054 | 🚧 v0.2 | ISO 20022, post-PSD2 Europe |
| BAI2 | 🚧 v0.2 | US corporate banking (BoA, Wells Fargo) |
| CSV | 🚧 v0.3 | Generic bank export |

## Bank compatibility

Tested files accepted. Open an issue to add your bank.

| Bank | Country | Format | Status |
|------|---------|--------|--------|
| Chase | 🇺🇸 | OFX | ✅ |
| Bank of America | 🇺🇸 | OFX | ✅ |
| Wells Fargo | 🇺🇸 | OFX | ✅ |

## Install

```sh
npm install finparse
# or
pnpm add finparse
```

## Usage

### Auto-detect format

```ts
import { parse } from 'finparse';

const stmt = parse(fileContent);
console.log(stmt.format);        // 'OFX'
console.log(stmt.currency);      // 'USD'
console.log(stmt.transactions);  // Transaction[]
```

### Force a specific format

```ts
import { parse } from 'finparse';

const stmt = parse(fileContent, { format: 'MT940' });
```

### Parse only OFX (tree-shakable)

```ts
import { parse } from '@finparse/ofx';

const stmt = parse(ofxContent);
```

### Detect format without parsing

```ts
import { detect } from 'finparse';

const format = detect(fileContent); // 'OFX' | 'MT940' | ... | null
```

### CLI

```sh
npx finparse statement.ofx --pretty
npx finparse statement.mt940 --format mt940
```

## Output schema

```ts
interface BankStatement {
  format: 'OFX' | 'QFX' | 'MT940' | 'CAMT053' | 'BAI2' | 'CSV';
  account: {
    id: string;
    iban?: string;
    routingNumber?: string;
    type: 'CHECKING' | 'SAVINGS' | 'CREDITLINE' | 'MONEYMRKT' | 'UNKNOWN';
  };
  currency: string;           // ISO 4217
  period: { from: Date; to: Date };
  openingBalance?: Balance;
  closingBalance?: Balance;
  transactions: Transaction[];
  raw: unknown;               // original parsed structure
}

interface Transaction {
  id: string;
  valueDate: Date;
  bookingDate?: Date;
  amount: number;             // positive = credit, negative = debit
  currency: string;
  type: 'credit' | 'debit' | 'check' | 'payment' | 'atm' | 'pos'
       | 'transfer' | 'fee' | 'interest' | 'dividend' | 'other';
  description: string;
  reference?: string;
  checkNumber?: string;
  counterparty?: { name?: string; iban?: string; bic?: string };
  raw: Record<string, unknown>;
}
```

## Error handling

```ts
import { parse, ParseError, UnsupportedFormatError, NotImplementedError } from 'finparse';

try {
  const stmt = parse(content);
} catch (err) {
  if (err instanceof UnsupportedFormatError) { /* unrecognised file */ }
  if (err instanceof NotImplementedError)    { /* format detected but parser not ready */ }
  if (err instanceof ParseError)             { /* malformed file */ }
}
```

## Packages

| Package | Description |
|---------|-------------|
| `finparse` | Main package — auto-detect + parse |
| `@finparse/core` | Shared types and interfaces |
| `@finparse/ofx` | OFX / QFX parser |
| `@finparse/mt940` | MT940 / MT942 parser |
| `@finparse/camt053` | CAMT.053 / CAMT.054 parser |
| `@finparse/bai2` | BAI2 parser |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Adding a new bank or a new format is a great first contribution.

## License

MIT
