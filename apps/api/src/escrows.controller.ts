import { Controller, Post, Get, Body, Param, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { LockEscrowDto, ReleaseEscrowDto, RefundEscrowDto } from '@velohub/shared';

@Controller('escrows')
export class EscrowsController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('payments') private readonly paymentsQueue: Queue
  ) {}

  @Post('lock')
  async lockEscrow(@Body() dto: LockEscrowDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Escrow lock amount must be positive.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const client = await tx.user.findUnique({ where: { id: dto.clientId } });
      const provider = await tx.user.findUnique({ where: { id: dto.providerId } });

      if (!client) {
        throw new NotFoundException(`Client ID ${dto.clientId} not found.`);
      }
      if (!provider) {
        throw new NotFoundException(`Provider ID ${dto.providerId} not found.`);
      }

      if (client.availableBalance.toNumber() < dto.amount) {
        throw new BadRequestException('Insufficient available balance to lock in escrow.');
      }

      await tx.user.update({
        where: { id: dto.clientId },
        data: {
          availableBalance: { decrement: dto.amount },
          reservedBalance: { increment: dto.amount },
        },
      });

      const escrow = await tx.escrow.create({
        data: {
          clientId: dto.clientId,
          providerId: dto.providerId,
          amount: dto.amount,
          status: 'PENDING',
        },
      });

      await tx.transaction.create({
        data: {
          userId: dto.clientId,
          type: 'ESCROW_LOCK',
          amount: dto.amount,
          status: 'PENDING',
          reference: escrow.id,
        },
      });

      return escrow;
    });

    await this.paymentsQueue.add('stellar-escrow-lock', {
      escrowId: result.id,
      clientId: dto.clientId,
      providerId: dto.providerId,
      amount: dto.amount,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: dto.clientId,
        action: 'ESCROW_LOCKED',
        details: `Escrow of ${dto.amount} USDC locked for provider ${dto.providerId}. Escrow ID: ${result.id}`,
      },
    });

    return result;
  }

  @Post('release')
  async releaseEscrow(@Body() dto: ReleaseEscrowDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const escrow = await tx.escrow.findUnique({ where: { id: dto.escrowId } });

      if (!escrow) {
        throw new NotFoundException(`Escrow with ID ${dto.escrowId} not found.`);
      }

      if (escrow.status !== 'PENDING') {
        throw new BadRequestException('Only PENDING escrows can be released.');
      }

      const updatedEscrow = await tx.escrow.update({
        where: { id: dto.escrowId },
        data: { status: 'RELEASED' },
      });

      await tx.user.update({
        where: { id: escrow.clientId },
        data: { reservedBalance: { decrement: escrow.amount } },
      });

      await tx.user.update({
        where: { id: escrow.providerId },
        data: { availableBalance: { increment: escrow.amount } },
      });

      await tx.transaction.create({
        data: {
          userId: escrow.providerId,
          type: 'ESCROW_RELEASE',
          amount: escrow.amount,
          status: 'SUCCESS',
          reference: escrow.id,
        },
      });

      return updatedEscrow;
    });

    await this.paymentsQueue.add('stellar-escrow-release', {
      escrowId: dto.escrowId,
      stellarEscrowId: result.stellarEscrowId,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: result.clientId,
        action: 'ESCROW_RELEASED',
        details: `Escrow ${dto.escrowId} released to provider ${result.providerId}. Amount: ${result.amount}`,
      },
    });

    return result;
  }

  @Post('refund')
  async refundEscrow(@Body() dto: RefundEscrowDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const escrow = await tx.escrow.findUnique({ where: { id: dto.escrowId } });

      if (!escrow) {
        throw new NotFoundException(`Escrow with ID ${dto.escrowId} not found.`);
      }

      if (escrow.status !== 'PENDING') {
        throw new BadRequestException('Only PENDING escrows can be refunded.');
      }

      const updatedEscrow = await tx.escrow.update({
        where: { id: dto.escrowId },
        data: { status: 'REFUNDED' },
      });

      await tx.user.update({
        where: { id: escrow.clientId },
        data: {
          reservedBalance: { decrement: escrow.amount },
          availableBalance: { increment: escrow.amount },
        },
      });

      await tx.transaction.create({
        data: {
          userId: escrow.clientId,
          type: 'ESCROW_REFUND',
          amount: escrow.amount,
          status: 'SUCCESS',
          reference: escrow.id,
        },
      });

      return updatedEscrow;
    });

    await this.paymentsQueue.add('stellar-escrow-refund', {
      escrowId: dto.escrowId,
      stellarEscrowId: result.stellarEscrowId,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: result.clientId,
        action: 'ESCROW_REFUNDED',
        details: `Escrow ${dto.escrowId} refunded to client ${result.clientId}. Amount: ${result.amount}`,
      },
    });

    return result;
  }

  @Get(':id')
  async getEscrow(@Param('id') id: string) {
    const escrow = await this.prisma.escrow.findUnique({ where: { id } });
    if (!escrow) {
      throw new NotFoundException(`Escrow with ID ${id} not found.`);
    }

    return {
      ...escrow,
      amount: escrow.amount.toString(),
    };
  }
}
