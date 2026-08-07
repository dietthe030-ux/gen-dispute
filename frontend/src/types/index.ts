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
  createdAt: number;
  expiresAt: number;
  listingUrl: string;
  itemDescription: string;
  itemId: string;
  evidencePolicyHash: string;
  evidenceReceiptUrl?: string;
  evidenceReceiptSha256?: string;
  evidenceNonce?: string;
  evidenceReceiptRegisteredAt?: number;
  evidenceReceiptObservedAt?: number;
  evidenceObservedAt: number[];
  status: 'NONE' | 'OPEN' | 'DISPUTE_PENDING' | 'RESOLVED' | 'UNDETERMINED' | 'PAID_OUT';
  disputeAttempts: number;
  disputeReason: string;
  evidenceUrls: string[];
  evidenceHashes: string[];
  evidenceCommitments: string[];
  refundTier: number | null;
  buyerPayout: bigint | null;
  sellerPayout: bigint | null;
  outcome: string;
  lastError: string;
}
