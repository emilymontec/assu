export const EVENT_PUBLISHER_PORT = Symbol('EVENT_PUBLISHER_PORT');

export interface DomainEvent<T = unknown> {
  name: string; // ej: "movement.created"
  version: string; // ej: "v1"
  occurredAt: Date;
  payload: T;
}

/** Implementado por el módulo Event Publisher (Redis Streams → RabbitMQ). */
export interface EventPublisherPort {
  publish<T>(event: DomainEvent<T>): Promise<void>;
}
