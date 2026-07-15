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
exports.EscrowsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let EscrowsController = class EscrowsController {
    prisma;
    paymentsQueue;
    constructor(prisma, paymentsQueue) {
        this.prisma = prisma;
        this.paymentsQueue = paymentsQueue;
    }
    async lockEscrow(dto) {
        if (dto.amount <= 0) {
            throw new common_1.BadRequestException('Escrow lock amount must be positive.');
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const client = await tx.user.findUnique({ where: { id: dto.clientId } });
            const provider = await tx.user.findUnique({ where: { id: dto.providerId } });
            if (!client) {
                throw new common_1.NotFoundException(`Client ID ${dto.clientId} not found.`);
            }
            if (!provider) {
                throw new common_1.NotFoundException(`Provider ID ${dto.providerId} not found.`);
            }
            if (client.availableBalance.toNumber() < dto.amount) {
                throw new common_1.BadRequestException('Insufficient available balance to lock in escrow.');
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
    async releaseEscrow(dto) {
        const result = await this.prisma.$transaction(async (tx) => {
            const escrow = await tx.escrow.findUnique({ where: { id: dto.escrowId } });
            if (!escrow) {
                throw new common_1.NotFoundException(`Escrow with ID ${dto.escrowId} not found.`);
            }
            if (escrow.status !== 'PENDING') {
                throw new common_1.BadRequestException('Only PENDING escrows can be released.');
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
    async refundEscrow(dto) {
        const result = await this.prisma.$transaction(async (tx) => {
            const escrow = await tx.escrow.findUnique({ where: { id: dto.escrowId } });
            if (!escrow) {
                throw new common_1.NotFoundException(`Escrow with ID ${dto.escrowId} not found.`);
            }
            if (escrow.status !== 'PENDING') {
                throw new common_1.BadRequestException('Only PENDING escrows can be refunded.');
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
    async getEscrow(id) {
        const escrow = await this.prisma.escrow.findUnique({ where: { id } });
        if (!escrow) {
            throw new common_1.NotFoundException(`Escrow with ID ${id} not found.`);
        }
        return {
            ...escrow,
            amount: escrow.amount.toString(),
        };
    }
};
exports.EscrowsController = EscrowsController;
__decorate([
    (0, common_1.Post)('lock'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EscrowsController.prototype, "lockEscrow", null);
__decorate([
    (0, common_1.Post)('release'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EscrowsController.prototype, "releaseEscrow", null);
__decorate([
    (0, common_1.Post)('refund'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EscrowsController.prototype, "refundEscrow", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EscrowsController.prototype, "getEscrow", null);
exports.EscrowsController = EscrowsController = __decorate([
    (0, common_1.Controller)('escrows'),
    __param(1, (0, bullmq_1.InjectQueue)('payments')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_2.Queue])
], EscrowsController);
//# sourceMappingURL=escrows.controller.js.map