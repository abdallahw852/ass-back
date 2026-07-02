import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { LessThan } from 'typeorm';
import type {
  CreateMessageInput,
  IMessageRepository,
  ListMessagesOptions,
  ListMessagesResult,
} from '../domain/message.repository.interface';
import { MessageOrmEntity } from './persistence/message.orm-entity';

@Injectable()
export class MessageRepository implements IMessageRepository {
  constructor(
    @InjectRepository(MessageOrmEntity, 'write')
    private readonly repository: Repository<MessageOrmEntity>,
  ) {}

  async create(input: CreateMessageInput): Promise<MessageOrmEntity> {
    const entity = this.repository.create({
      conversationId: input.conversationInternalId,
      senderId: input.senderId,
      body: input.body,
    });
    return this.repository.save(entity);
  }

  async listByConversationPaginated(
    options: ListMessagesOptions,
  ): Promise<ListMessagesResult> {
    const limit = options.limit;
    const items = await this.repository.find({
      where: {
        conversationId: options.conversationInternalId,
        ...(options.beforeId !== undefined
          ? { id: LessThan(options.beforeId) }
          : {}),
      },
      order: { id: 'DESC' },
      take: limit + 1,
    });
    const hasMore = items.length > limit;
    return { items: hasMore ? items.slice(0, limit) : items, hasMore };
  }

  findByPublicId(publicId: string): Promise<MessageOrmEntity | null> {
    return this.repository.findOne({ where: { _id: publicId } });
  }

  async countUnreadForParticipant(
    conversationInternalId: number,
    lastReadMessageInternalId: number | null,
    excludeSenderId: number,
  ): Promise<number> {
    const qb = this.repository
      .createQueryBuilder('m')
      .where('m.conversationId = :cid', { cid: conversationInternalId })
      .andWhere('m.senderId <> :uid', { uid: excludeSenderId });

    if (lastReadMessageInternalId !== null) {
      qb.andWhere('m.id > :lastRead', {
        lastRead: lastReadMessageInternalId,
      });
    }

    return qb.getCount();
  }
}
