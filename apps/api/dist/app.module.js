"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const prisma_service_1 = require("./prisma.service");
const users_controller_1 = require("./users.controller");
const payments_controller_1 = require("./payments.controller");
const escrows_controller_1 = require("./escrows.controller");
const idempotency_middleware_1 = require("./idempotency.middleware");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(idempotency_middleware_1.IdempotencyMiddleware)
            .forRoutes(payments_controller_1.PaymentsController, escrows_controller_1.EscrowsController);
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379', 10),
                },
            }),
            bullmq_1.BullModule.registerQueue({
                name: 'payments',
            }),
        ],
        controllers: [users_controller_1.UsersController, payments_controller_1.PaymentsController, escrows_controller_1.EscrowsController],
        providers: [prisma_service_1.PrismaService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map