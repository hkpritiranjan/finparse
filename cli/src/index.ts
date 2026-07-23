import { readFileSync } from 'node:fs';
import { parse, detect } from 'finparse';

const args = process.argv.slice(2);

function usage(): void {
  process.stdout.write(`
finparse — convert bank statement files to JSON

Usage:
  finparse <file> [options]

Options:
  --pretty          Pretty-print JSON output (default: false)
  --format <fmt>    Force format: ofx | mt940 | camt053 | bai2 (default: auto-detect)
  --version         Print version
  --help            Show this help

Examples:
  finparse statement.ofx
  finparse statement.mt940 --pretty
  finparse statement.xml --format camt053 --pretty
`.trimStart());
}

function version(): void {
  // Loaded from package.json at build time by tsup
  process.stdout.write('0.1.0\n');
}

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  usage();
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  version();
  process.exit(0);
}

const filePath = args.find((a) => !a.startsWith('--'));
if (!filePath) {
  process.stderr.write('Error: no input file specified\n');
  usage();
  process.exit(1);
}

const pretty = args.includes('--pretty');
const fmtIdx = args.indexOf('--format');
const forceFmt = fmtIdx !== -1 ? args[fmtIdx + 1] : undefined;

let input: string;
try {
  input = readFileSync(filePath, 'utf-8');
} catch (err) {
  process.stderr.write(`Error reading file "${filePath}": ${(err as Error).message}\n`);
  process.exit(1);
}

const detectedFormat = detect(input);
if (!detectedFormat && !forceFmt) {
  process.stderr.write(
    `Error: could not detect format for "${filePath}". Use --format to specify it.\n`,
  );
  process.exit(1);
}

try {
  const stmt = parse(input, forceFmt ? { format: forceFmt.toUpperCase() as never } : undefined);
  const json = pretty ? JSON.stringify(stmt, null, 2) : JSON.stringify(stmt);
  process.stdout.write(json + '\n');
} catch (err) {
  process.stderr.write(`Parse error: ${(err as Error).message}\n`);
  process.exit(1);
}
