export interface CrossmarkWalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  error: string | null;
}

export interface CrossmarkSignResult {
  hash: string;
  tx_blob: string;
}

export interface XrplPayment {
  destination: string;
  amount: string;
  memos?: Array<{
    Memo: {
      MemoData: string;
      MemoType: string;
    };
  }>;
}
