export type UIState =
  | 'DISCONNECTED'
  | 'WALLET_CONNECTING'
  | 'SUBMITTING'
  | 'WAITING_FOR_CONSENSUS'
  | 'ACCEPTED'
  | 'FINALIZED'
  | 'UNDETERMINED'
  | 'RETRY_AVAILABLE'
  | 'PAID_OUT'
  | 'ERROR';

export interface OrderState {
  orderId: number;
  seller: string;
  buyer: string;
  escrowAmount: bigint;
  listingUrl: string;
  itemDescription: string;
  status: 'NONE' | 'OPEN' | 'DISPUTE_PENDING' | 'RESOLVED' | 'UNDETERMINED' | 'PAID_OUT';
  disputeAttempts: number;
  disputeReason: string;
  evidenceUrls: string[];
  refundTier: number | null;
  buyerPayout: bigint | null;
  sellerPayout: bigint | null;
  outcome: string;
  lastError: string;
}
