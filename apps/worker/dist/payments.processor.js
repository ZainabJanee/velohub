"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
let PaymentsProcessor = class PaymentsProcessor extends bullmq_1.WorkerHost {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async process(job) {
        console.log(`Processing job: ${job.name} (ID: ${job.id})`);
        switch (job.name) {
            case 'process-topup':
                return this.handleTopup(job.data);
            case 'process-withdrawal':
                return this.handleWithdrawal(job.data);
            case 'stellar-escrow-lock':
                return this.handleStellarLock(job.data);
            case 'stellar-escrow-release':
                return this.handleStellarRelease(job.data);
            case 'stellar-escrow-refund':
                return this.handleStellarRefund(job.data);
            default:
                console.warn(`Unknown job name: ${job.name}`);
        }
    }
    async handleTopup(data) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: data.userId },
                data: {
                    availableBalance: { increment: data.amount },
                },
            });
            await tx.transaction.update({
                where: { id: data.transactionId },
                data: {
                    status: 'SUCCESS',
                    reference: `airtm_deposit_${Math.floor(Math.random() * 1000000)}`,
                },
            });
        });
        await this.prisma.auditLog.create({
            data: {
                userId: data.userId,
                action: 'TOPUP_SUCCESS',
                details: `Topup of ${data.amount} USDC completed successfully. Tx ID: ${data.transactionId}`,
            },
        });
        console.log(`Topup processed successfully for user ${data.userId}`);
    }
    async handleWithdrawal(data) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const isSuccess = !data.airtmAccount.includes('fail');
        if (isSuccess) {
            await this.prisma.transaction.update({
                where: { id: data.transactionId },
                data: {
                    status: 'SUCCESS',
                    reference: `airtm_payout_${Math.floor(Math.random() * 1000000)}`,
                },
            });
            await this.prisma.auditLog.create({
                data: {
                    userId: data.userId,
                    action: 'WITHDRAWAL_SUCCESS',
                    details: `Withdrawal of ${data.amount} USDC paid out to Airtm account ${data.airtmAccount}. Tx ID: ${data.transactionId}`,
                },
            });
            console.log(`Withdrawal payout processed successfully for user ${data.userId}`);
        }
        else {
            await this.prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: data.userId },
                    data: {
                        availableBalance: { increment: data.amount },
                    },
                });
                await tx.transaction.update({
                    where: { id: data.transactionId },
                    data: {
                        status: 'FAILED',
                    },
                });
            });
            await this.prisma.auditLog.create({
                data: {
                    userId: data.userId,
                    action: 'WITHDRAWAL_FAILED',
                    details: `Withdrawal of ${data.amount} USDC failed. Funds returned to balance. Tx ID: ${data.transactionId}`,
                },
            });
            console.error(`Withdrawal payout failed for user ${data.userId}`);
        }
    }
    async handleStellarLock(data) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const mockStellarEscrowId = `stellar_escrow_${Math.floor(Math.random() * 1000000)}`;
        const mockStellarTxHash = `0xstellarhash_${Math.floor(Math.random() * 1000000)}`;
        await this.prisma.$transaction(async (tx) => {
            await tx.escrow.update({
                where: { id: data.escrowId },
                data: {
                    stellarEscrowId: mockStellarEscrowId,
                },
            });
            await tx.transaction.updateMany({
                where: { reference: data.escrowId, type: 'ESCROW_LOCK' },
                data: {
                    status: 'SUCCESS',
                    reference: mockStellarTxHash,
                },
            });
        });
        await this.prisma.auditLog.create({
            data: {
                userId: data.clientId,
                action: 'STELLAR_ESCROW_LOCKED_ONCHAIN',
                details: `Stellar escrow lock transaction submitted. Escrow ID: ${data.escrowId}. On-chain Escrow ID: ${mockStellarEscrowId}. Hash: ${mockStellarTxHash}`,
            },
        });
        console.log(`On-chain Stellar escrow lock simulated for escrow ${data.escrowId}`);
    }
    async handleStellarRelease(data) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const mockStellarTxHash = `0xstellarhash_${Math.floor(Math.random() * 1000000)}`;
        await this.prisma.transaction.updateMany({
            where: { reference: data.escrowId, type: 'ESCROW_RELEASE' },
            data: {
                reference: mockStellarTxHash,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                action: 'STELLAR_ESCROW_RELEASED_ONCHAIN',
                details: `Stellar escrow release transaction submitted. Escrow ID: ${data.escrowId}. Hash: ${mockStellarTxHash}`,
            },
        });
        console.log(`On-chain Stellar escrow release simulated for escrow ${data.escrowId}`);
    }
    async handleStellarRefund(data) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const mockStellarTxHash = `0xstellarhash_${Math.floor(Math.random() * 1000000)}`;
        await this.prisma.transaction.updateMany({
            where: { reference: data.escrowId, type: 'ESCROW_REFUND' },
            data: {
                reference: mockStellarTxHash,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                action: 'STELLAR_ESCROW_REFUNDED_ONCHAIN',
                details: `Stellar escrow refund transaction submitted. Escrow ID: ${data.escrowId}. Hash: ${mockStellarTxHash}`,
            },
        });
        console.log(`On-chain Stellar escrow refund simulated for escrow ${data.escrowId}`);
    }
};
exports.PaymentsProcessor = PaymentsProcessor;
exports.PaymentsProcessor = PaymentsProcessor = __decorate([
    (0, bullmq_1.Processor)('payments'),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsProcessor);
//# sourceMappingURL=payments.processor.js.map