import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from './prisma.service';
import { PaymentsProcessor } from './payments.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({
      name: 'payments',
    }),
  ],
  providers: [PrismaService, PaymentsProcessor],
})
export class WorkerModule {}
