import { IEventHandler } from '@nestjs/cqrs';
import { DomainEvent } from '../../domain/domain-event';

/**
 * Base class for read model projections
 * Updates read models asynchronously based on domain events
 * Aligns with CQRS: read models are updated separately from write models
 */
export abstract class ReadModelProjectionBase<
  T extends DomainEvent,
> implements IEventHandler<T> {
  /**
   * Handle domain event and update read model
   */
  abstract handle(event: T): Promise<void>;

  /**
   * Get the event type this projection handles
   */
  abstract getEventType(): string;
}
