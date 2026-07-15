import { Injectable, NestMiddleware, ConflictException, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const key = req.headers['idempotency-key'] as string;
    
    // Only apply to mutation methods (POST, PUT, PATCH)
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    if (!key) {
      throw new BadRequestException('Idempotency-Key header is required for mutation requests.');
    }

    const redisKey = `idempotency:${key}`;
    const status = await this.redis.get(redisKey);

    if (status === 'processing') {
      throw new ConflictException('A request with this Idempotency-Key is already being processed.');
    }

    if (status) {
      const cachedResponse = JSON.parse(status);
      return res.status(cachedResponse.statusCode).json(cachedResponse.body);
    }

    // Lock the key as processing (expires in 120s to prevent permanent locks on crash)
    await this.redis.set(redisKey, 'processing', 'EX', 120);

    const originalSend = res.send;
    res.send = function (body: any) {
      res.send = originalSend;
      
      let parsedBody = body;
      try {
        parsedBody = JSON.parse(body);
      } catch (e) {
        // Body is already raw
      }

      const cacheValue = JSON.stringify({
        statusCode: res.statusCode,
        body: parsedBody,
      });
      
      // Cache response for 24 hours
      this.redis.set(redisKey, cacheValue, 'EX', 86400).catch((err: any) => {
        console.error('Failed to cache response in Redis:', err);
      });

      return originalSend.call(this, body);
    }.bind(this);

    next();
  }
}
