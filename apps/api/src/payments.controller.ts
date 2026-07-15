import { Controller, Post, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TopUpDto, WithdrawDto } from '@velohub/shared';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('payments') private readonly paymentsQueue: Queue
  ) {}

  @Post('topup')
  async topUp(@Body() dto: TopUpDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found.`);
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Top-up amount must be greater than zero.');
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        userId: dto.userId,
        type: 'TOPUP',
        amount: dto.amount,
        status: 'PENDING',
      },
    });

    await this.paymentsQueue.add('process-topup', {
      transactionId: transaction.id,
      userId: dto.userId,
      amount: dto.amount,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: dto.userId,
        action: 'TOPUP_INITIATED',
        details: `Topup of ${dto.amount} USDC initiated. Tx ID: ${transaction.id}`,
      },
    });

    return {
      message: 'Top-up initiated. Processing asynchronously...',
      transactionId: transaction.id,
      status: 'PENDING',
    };
  }

  @Post('withdraw')
  async withdraw(@Body() dto: WithdrawDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Withdrawal amount must be greater than zero.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${dto.userId} not found.`);
      }

      if (user.availableBalance.toNumber() < dto.amount) {
        throw new BadRequestException('Insufficient available balance for withdrawal.');
      }

      await tx.user.update({
        where: { id: dto.userId },
        data: {
          availableBalance: { decrement: dto.amount },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: dto.userId,
          type: 'WITHDRAWAL',
          amount: dto.amount,
          status: 'PENDING',
        },
      });

      return { transaction, user };
    });

    await this.paymentsQueue.add('process-withdrawal', {
      transactionId: result.transaction.id,
      userId: dto.userId,
      amount: dto.amount,
      airtmAccount: result.user.airtmAccount,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: dto.userId,
        action: 'WITHDRAWAL_INITIATED',
        details: `Withdrawal of ${dto.amount} USDC initiated. Tx ID: ${result.transaction.id}`,
      },
    });

    return {
      message: 'Withdrawal processing payout...',
      transactionId: result.transaction.id,
      status: 'PENDING',
    };
  }
}
