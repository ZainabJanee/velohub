import axios from 'axios';
import { 
  TopUpDto, 
  WithdrawDto, 
  LockEscrowDto, 
  ReleaseEscrowDto, 
  RefundEscrowDto, 
  BalanceResponse, 
  EscrowResponse 
} from '@velohub/shared';

export class VeloHubClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getBalances(userId: string): Promise<BalanceResponse> {
    const res = await axios.get(`${this.baseUrl}/users/${userId}/balance`);
    return res.data;
  }

  async topUp(dto: TopUpDto, idempotencyKey?: string): Promise<any> {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await axios.post(`${this.baseUrl}/payments/topup`, dto, { headers });
    return res.data;
  }

  async withdraw(dto: WithdrawDto, idempotencyKey?: string): Promise<any> {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await axios.post(`${this.baseUrl}/payments/withdraw`, dto, { headers });
    return res.data;
  }

  async lockEscrow(dto: LockEscrowDto, idempotencyKey?: string): Promise<EscrowResponse> {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await axios.post(`${this.baseUrl}/escrows/lock`, dto, { headers });
    return res.data;
  }

  async releaseEscrow(dto: ReleaseEscrowDto, idempotencyKey?: string): Promise<EscrowResponse> {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await axios.post(`${this.baseUrl}/escrows/release`, dto, { headers });
    return res.data;
  }

  async refundEscrow(dto: RefundEscrowDto, idempotencyKey?: string): Promise<EscrowResponse> {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await axios.post(`${this.baseUrl}/escrows/refund`, dto, { headers });
    return res.data;
  }
}
