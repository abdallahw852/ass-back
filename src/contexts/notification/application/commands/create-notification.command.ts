import type { NotificationType } from '../../domain/notification.types';

export class CreateNotificationCommand {
  constructor(
    public readonly userId: number,
    public readonly type: NotificationType,
    public readonly payload: Record<string, unknown>,
  ) {}
}
