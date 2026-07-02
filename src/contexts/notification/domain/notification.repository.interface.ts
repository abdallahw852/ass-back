import type { NotificationOrmEntity } from '../infrastructure/persistence/notification.orm-entity';
import type { NotificationType } from './notification.types';

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  payload: Record<string, unknown>;
}

export interface INotificationRepository {
  create(input: CreateNotificationInput): Promise<NotificationOrmEntity>;
  markRead(publicId: string, userId: number): Promise<void>;
  markAllRead(userId: number): Promise<void>;
  markReadByConversation(
    userId: number,
    conversationPublicId: string,
  ): Promise<void>;
  findByUser(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<{
    items: NotificationOrmEntity[];
    total: number;
    unreadCount: number;
  }>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
