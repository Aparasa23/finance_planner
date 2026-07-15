export interface ProviderAccount {
  id: string; // external account ID
  name: string;
  type: string; // depository, credit, loan, etc.
  subtype: string | null;
  mask: string | null;
  currentBalance: number;
  availableBalance: number | null;
  creditLimit: number | null;
}

export interface ProviderTransaction {
  id: string; // external transaction ID
  accountId: string;
  amount: number;
  date: string;
  description: string;
  merchantName: string;
  category: string;
  subcategory: string | null;
  pending: boolean;
}

export interface ProviderCreditCardDetails {
  accountId: string;
  statementBalance: number;
  minimumPayment: number;
  dueDate: string | null;
  statementClosingDate: string | null;
}

export interface ProviderLoanDetails {
  accountId: string;
  outstandingBalance: number;
  nextPaymentDate: string | null;
  nextPaymentAmount: number | null;
}

export interface SyncTransactionsResult {
  added: ProviderTransaction[];
  modified: ProviderTransaction[];
  removed: string[]; // external transaction IDs
  nextCursor: string;
}
