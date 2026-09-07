export const EVENT_PUBLISHER_PORT = Symbol('EVENT_PUBLISHER_PORT');

export interface DomainEvent<T = unknown> {
  name: string;
  version: string;
  occurredAt: Date;
  payload: T;
}

export interface EventPublisherPort {
  publish<T>(event: DomainEvent<T>): Promise<void>;
}
