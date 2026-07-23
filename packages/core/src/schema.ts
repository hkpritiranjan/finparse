export type FormatType = 'OFX' | 'QFX' | 'MT940' | 'CAMT053' | 'BAI2' | 'CSV';

export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDITLINE' | 'MONEYMRKT' | 'UNKNOWN';

export type TransactionType =
  | 'credit'
  | 'debit'
  | 'check'
  | 'payment'
  | 'atm'
  | 'pos'
  | 'transfer'
  | 'fee'
  | 'interest'
  | 'dividend'
  | 'other';

export interface AccountInfo {
  id: string;
  iban?: string;
  bban?: string;
  routingNumber?: string;
  name?: string;
  type: AccountType;
}

export interface Balance {
  amount: number;
  currency: string;
  date: Date;
}

export interface Counterparty {
  name?: string;
  iban?: string;
  bic?: string;
  accountId?: string;
}

export interface Transaction {
  id: string;
  valueDate: Date;
  bookingDate?: Date;
  /** Positive = credit (money in), negative = debit (money out) */
  amount: number;
  currency: string;
  type: TransactionType;
  description: string;
  reference?: string;
  checkNumber?: string;
  counterparty?: Counterparty;
  /** Original parsed fields for format-specific access */
  raw: Record<string, unknown>;
}

export interface BankStatement {
  format: FormatType;
  account: AccountInfo;
  currency: string;
  period: {
    from: Date;
    to: Date;
  };
  openingBalance?: Balance;
  closingBalance?: Balance;
  transactions: Transaction[];
  /** Original parsed root object */
  raw: unknown;
}
