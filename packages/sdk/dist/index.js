"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VeloHubClient = void 0;
const axios_1 = __importDefault(require("axios"));
class VeloHubClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async getBalances(userId) {
        const res = await axios_1.default.get(`${this.baseUrl}/users/${userId}/balance`);
        return res.data;
    }
    async topUp(dto, idempotencyKey) {
        const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
        const res = await axios_1.default.post(`${this.baseUrl}/payments/topup`, dto, { headers });
        return res.data;
    }
    async withdraw(dto, idempotencyKey) {
        const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
        const res = await axios_1.default.post(`${this.baseUrl}/payments/withdraw`, dto, { headers });
        return res.data;
    }
    async lockEscrow(dto, idempotencyKey) {
        const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
        const res = await axios_1.default.post(`${this.baseUrl}/escrows/lock`, dto, { headers });
        return res.data;
    }
    async releaseEscrow(dto, idempotencyKey) {
        const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
        const res = await axios_1.default.post(`${this.baseUrl}/escrows/release`, dto, { headers });
        return res.data;
    }
    async refundEscrow(dto, idempotencyKey) {
        const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
        const res = await axios_1.default.post(`${this.baseUrl}/escrows/refund`, dto, { headers });
        return res.data;
    }
}
exports.VeloHubClient = VeloHubClient;
//# sourceMappingURL=index.js.map