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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyMiddleware = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let IdempotencyMiddleware = class IdempotencyMiddleware {
    redis;
    constructor() {
        this.redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
    }
    async use(req, res, next) {
        const key = req.headers['idempotency-key'];
        if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
            return next();
        }
        if (!key) {
            throw new common_1.BadRequestException('Idempotency-Key header is required for mutation requests.');
        }
        const redisKey = `idempotency:${key}`;
        const status = await this.redis.get(redisKey);
        if (status === 'processing') {
            throw new common_1.ConflictException('A request with this Idempotency-Key is already being processed.');
        }
        if (status) {
            const cachedResponse = JSON.parse(status);
            return res.status(cachedResponse.statusCode).json(cachedResponse.body);
        }
        await this.redis.set(redisKey, 'processing', 'EX', 120);
        const originalSend = res.send;
        res.send = function (body) {
            res.send = originalSend;
            let parsedBody = body;
            try {
                parsedBody = JSON.parse(body);
            }
            catch (e) {
            }
            const cacheValue = JSON.stringify({
                statusCode: res.statusCode,
                body: parsedBody,
            });
            this.redis.set(redisKey, cacheValue, 'EX', 86400).catch((err) => {
                console.error('Failed to cache response in Redis:', err);
            });
            return originalSend.call(this, body);
        }.bind(this);
        next();
    }
};
exports.IdempotencyMiddleware = IdempotencyMiddleware;
exports.IdempotencyMiddleware = IdempotencyMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], IdempotencyMiddleware);
//# sourceMappingURL=idempotency.middleware.js.map