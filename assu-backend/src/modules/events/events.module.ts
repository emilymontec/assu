import { Module } from '@nestjs/common';
import { EVENT_PUBLISHER_PORT } from '../../core/ports/event-publisher.port';
import { RedisEventPublisherService } from './redis-event-publisher.service';

@Module({
  providers: [{ provide: EVENT_PUBLISHER_PORT, useClass: RedisEventPublisherService }],
  exports: [EVENT_PUBLISHER_PORT],
})
export class EventsModule {}
