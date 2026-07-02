import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';
import type {
  CreateNotificationInput,
  INotificationRepository,
} from '../domain/notification.repository.interface';
import { NotificationOrmEntity } from './persistence/notification.orm-entity';
import { NotificationType } from '../domain/notification.types';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(
    @InjectRepository(NotificationOrmEntity, 'write')
    private readonly repo: Repository<NotificationOrmEntity>,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationOrmEntity> {
    const entity = this.repo.create({
      userId: input.userId,
      type: input.type,
      payload: input.payload,
    });
    return this.repo.save(entity);
  }

  async markRead(publicId: string, userId: number): Promise<void> {
    await this.repo.update({ _id: publicId, userId }, { readAt: new Date() });
  }

  async markAllRead(userId: number): Promise<void> {
    await this.repo.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
  }

  async markReadByConversation(
    userId: number,
    conversationPublicId: string,
  ): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ readAt: () => 'NOW()' })
      .where('user_id = :userId', { userId })
      .andWhere('type = :type', { type: NotificationType.MESSAGE_RECEIVED })
      .andWhere('read_at IS NULL')
      .andWhere("payload->>'conversationId' = :convId", {
        convId: conversationPublicId,
      })
      .execute();
  }

  async findByUser(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<{
    items: NotificationOrmEntity[];
    total: number;
    unreadCount: number;
  }> {
    const [items, total] = await this.repo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    const unreadCount = await this.repo.count({
      where: { userId, readAt: IsNull() },
    });

    return { items, total, unreadCount };
  }
}
