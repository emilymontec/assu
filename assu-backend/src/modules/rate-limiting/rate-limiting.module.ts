import { Module } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimitingService } from './rate-limiting.service';

@Module({
  // RedisModule y ConfigModule son @Global(), no hace falta importarlos.
  providers: [RateLimiterService, RateLimitingService],
  exports: [RateLimitingService],
})
export class RateLimitingModule {}
