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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let PaymentsController = class PaymentsController {
    prisma;
    paymentsQueue;
    constructor(prisma, paymentsQueue) {
        this.prisma = prisma;
        this.paymentsQueue = paymentsQueue;
    }
    async topUp(dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${dto.userId} not found.`);
        }
        if (dto.amount <= 0) {
            throw new common_1.BadRequestException('Top-up amount must be greater than zero.');
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
    async withdraw(dto) {
        if (dto.amount <= 0) {
            throw new common_1.BadRequestException('Withdrawal amount must be greater than zero.');
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: dto.userId },
            });
            if (!user) {
                throw new common_1.NotFoundException(`User with ID ${dto.userId} not found.`);
            }
            if (user.availableBalance.toNumber() < dto.amount) {
                throw new common_1.BadRequestException('Insufficient available balance for withdrawal.');
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
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('topup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "topUp", null);
__decorate([
    (0, common_1.Post)('withdraw'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "withdraw", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    __param(1, (0, bullmq_1.InjectQueue)('payments')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_2.Queue])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map