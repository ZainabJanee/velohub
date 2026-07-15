import { TopUpDto, WithdrawDto, LockEscrowDto, ReleaseEscrowDto, RefundEscrowDto, BalanceResponse, EscrowResponse } from '@velohub/shared';
export declare class VeloHubClient {
    private baseUrl;
    constructor(baseUrl: string);
    getBalances(userId: string): Promise<BalanceResponse>;
    topUp(dto: TopUpDto, idempotencyKey?: string): Promise<any>;
    withdraw(dto: WithdrawDto, idempotencyKey?: string): Promise<any>;
    lockEscrow(dto: LockEscrowDto, idempotencyKey?: string): Promise<EscrowResponse>;
    releaseEscrow(dto: ReleaseEscrowDto, idempotencyKey?: string): Promise<EscrowResponse>;
    refundEscrow(dto: RefundEscrowDto, idempotencyKey?: string): Promise<EscrowResponse>;
}
