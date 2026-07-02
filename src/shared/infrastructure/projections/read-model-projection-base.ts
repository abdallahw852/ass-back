import { IEventHandler } from '@nestjs/cqrs';
import { DomainEvent } from '../../domain/domain-event';

export abstract class ReadModelProjectionBase<
  T extends DomainEvent,
> implements IEventHandler<T> {
  abstract handle(event: T): Promise<void>;
}
