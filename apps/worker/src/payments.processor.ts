import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from './prisma.service';

@Processor('payments')
@Injectable()
export class PaymentsProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
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

  private async handleTopup(data: { transactionId: string; userId: string; amount: number }) {
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

  private async handleWithdrawal(data: { transactionId: string; userId: string; amount: number; airtmAccount: string }) {
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
    } else {
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

  private async handleStellarLock(data: { escrowId: string; clientId: string; providerId: string; amount: number }) {
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

  private async handleStellarRelease(data: { escrowId: string; stellarEscrowId: string }) {
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

  private async handleStellarRefund(data: { escrowId: string; stellarEscrowId: string }) {
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
}
