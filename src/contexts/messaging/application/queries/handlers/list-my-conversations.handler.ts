import { Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ConversationOrmEntity } from '../../../infrastructure/persistence/conversation.orm-entity';
import { MessageOrmEntity } from '../../../infrastructure/persistence/message.orm-entity';
import { ListMyConversationsQuery } from '../list-my-conversations.query';

export interface ListMyConversationsItem {
  _id: string;
  subjectType: string;
  subjectId: string;
  scopeKey: string | null;
  lastMessageAt: Date | null;
  lastMessage: {
    _id: string;
    body: string;
    senderId: number;
    createdAt: Date;
  } | null;
  unreadCount: number;
  participants: Array<{ userId: number; role: string }>;
}

export interface ListMyConversationsResult {
  items: ListMyConversationsItem[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
@QueryHandler(ListMyConversationsQuery)
export class ListMyConversationsHandler implements IQueryHandler<ListMyConversationsQuery> {
  constructor(
    @InjectRepository(ConversationOrmEntity, 'write')
    private readonly conversations: Repository<ConversationOrmEntity>,
    @InjectRepository(MessageOrmEntity, 'write')
    private readonly messages: Repository<MessageOrmEntity>,
  ) {}

  async execute(
    query: ListMyConversationsQuery,
  ): Promise<ListMyConversationsResult> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const qb = this.conversations
      .createQueryBuilder('c')
      .innerJoin('c.participants', 'mine', 'mine.userId = :userId', {
        userId: query.userId,
      })
      .leftJoinAndSelect('c.participants', 'p')
      .orderBy('c.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('c.id', 'DESC');

    if (query.subjectType) {
      qb.andWhere('c.subjectType = :subjectType', {
        subjectType: query.subjectType,
      });
    }

    const [conversations, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    if (conversations.length === 0) {
      return { items: [], total, page, limit };
    }

    const conversationIds = conversations.map((c) => c.id);

    // last message per conversation (single round-trip)
    const lastMessageRows = await this.messages
      .createQueryBuilder('m')
      .select([
        'm.id',
        'm._id',
        'm.conversationId',
        'm.body',
        'm.senderId',
        'm.createdAt',
      ])
      .where('m.conversationId IN (:...ids)', { ids: conversationIds })
      .andWhere(
        `m.id = (SELECT MAX(m2.id) FROM messages m2 WHERE m2."conversationId" = m."conversationId")`,
      )
      .getMany();
    const lastByConv = new Map(
      lastMessageRows.map((m) => [m.conversationId, m]),
    );

    // unread count per conversation for this user
    const unreadRows = await this.messages
      .createQueryBuilder('m')
      .select('m.conversationId', 'conversationId')
      .addSelect('COUNT(*)::int', 'count')
      .innerJoin(
        'conversation_participants',
        'cp',
        'cp."conversationId" = m."conversationId" AND cp."userId" = :userId',
        { userId: query.userId },
      )
      .where('m.conversationId IN (:...ids)', { ids: conversationIds })
      .andWhere('m.senderId <> :userId', { userId: query.userId })
      .andWhere(
        '(cp."lastReadMessageId" IS NULL OR m.id > cp."lastReadMessageId")',
      )
      .groupBy('m.conversationId')
      .getRawMany<{ conversationId: number; count: number }>();
    const unreadByConv = new Map(
      unreadRows.map((r) => [Number(r.conversationId), Number(r.count)]),
    );

    const items: ListMyConversationsItem[] = conversations.map((c) => {
      const lm = lastByConv.get(c.id) ?? null;
      return {
        _id: c._id,
        subjectType: c.subjectType,
        subjectId: c.subjectId,
        scopeKey: c.scopeKey,
        lastMessageAt: c.lastMessageAt,
        lastMessage: lm
          ? {
              _id: lm._id,
              body: lm.body,
              senderId: lm.senderId,
              createdAt: lm.createdAt,
            }
          : null,
        unreadCount: unreadByConv.get(c.id) ?? 0,
        participants: (c.participants ?? []).map((p) => ({
          userId: p.userId,
          role: p.role,
        })),
      };
    });

    return { items, total, page, limit };
  }
}
