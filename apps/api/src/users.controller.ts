import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async createUser(@Body() body: { email: string; airtmAccount: string }) {
    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        airtmAccount: body.airtmAccount,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_CREATED',
        details: `User created with email ${body.email} and Airtm account ${body.airtmAccount}`,
      },
    });

    return user;
  }

  @Get(':id/balance')
  async getBalance(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    return {
      userId: user.id,
      availableBalance: user.availableBalance.toString(),
      reservedBalance: user.reservedBalance.toString(),
    };
  }

  @Get(':id/transactions')
  async getTransactions(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    const txs = await this.prisma.transaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    });

    return txs.map(t => ({
      ...t,
      amount: t.amount.toString(),
    }));
  }
}
