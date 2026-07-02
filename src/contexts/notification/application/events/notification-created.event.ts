import type { NotificationOrmEntity } from '../../infrastructure/persistence/notification.orm-entity';

export class NotificationCreatedEvent {
  constructor(public readonly notification: NotificationOrmEntity) {}
}
