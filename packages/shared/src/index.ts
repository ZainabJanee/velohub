export interface TopUpDto {
  userId: string;
  amount: number;
}

export interface WithdrawDto {
  userId: string;
  amount: number;
}

export interface LockEscrowDto {
  clientId: string;
  providerId: string;
  amount: number;
}

export interface ReleaseEscrowDto {
  escrowId: string;
}

export interface RefundEscrowDto {
  escrowId: string;
}

export interface BalanceResponse {
  userId: string;
  availableBalance: string;
  reservedBalance: string;
}

export interface EscrowResponse {
  id: string;
  clientId: string;
  providerId: string;
  amount: string;
  status: 'PENDING' | 'RELEASED' | 'REFUNDED';
  stellarEscrowId: string | null;
}
