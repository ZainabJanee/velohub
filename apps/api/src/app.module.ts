import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from './prisma.service';
import { UsersController } from './users.controller';
import { PaymentsController } from './payments.controller';
import { EscrowsController } from './escrows.controller';
import { IdempotencyMiddleware } from './idempotency.middleware';

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
  controllers: [UsersController, PaymentsController, EscrowsController],
  providers: [PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(IdempotencyMiddleware)
      .forRoutes(PaymentsController, EscrowsController);
  }
}
