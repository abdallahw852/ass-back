import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository, getDataSourceToken } from '@nestjs/typeorm';
import type { DataSource, Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import type {
  CreateConversationInput,
  IConversationRepository,
} from '../domain/conversation.repository.interface';
import type { ConversationSubjectType } from '../domain/conversation.types';
import { ConversationOrmEntity } from './persistence/conversation.orm-entity';
import { ConversationParticipantOrmEntity } from './persistence/conversation-participant.orm-entity';

@Injectable()
export class ConversationRepository implements IConversationRepository {
  constructor(
    @InjectRepository(ConversationOrmEntity, 'write')
    private readonly conversations: Repository<ConversationOrmEntity>,
    @InjectRepository(ConversationParticipantOrmEntity, 'write')
    private readonly participants: Repository<ConversationParticipantOrmEntity>,
    @Inject(getDataSourceToken('write'))
    private readonly dataSource: DataSource,
  ) {}

  findBySubject(
    subjectType: ConversationSubjectType,
    subjectId: string,
    scopeKey: string | null,
  ): Promise<ConversationOrmEntity | null> {
    return this.conversations.findOne({
      where: {
        subjectType,
        subjectId,
        scopeKey: scopeKey === null ? IsNull() : scopeKey,
      },
      relations: ['participants'],
    });
  }

  findByPublicId(publicId: string): Promise<ConversationOrmEntity | null> {
    return this.conversations.findOne({ where: { _id: publicId } });
  }

  findByPublicIdWithParticipants(
    publicId: string,
  ): Promise<ConversationOrmEntity | null> {
    return this.conversations.findOne({
      where: { _id: publicId },
      relations: ['participants'],
    });
  }

  findParticipant(
    conversationInternalId: number,
    userId: number,
  ): Promise<ConversationParticipantOrmEntity | null> {
    return this.participants.findOne({
      where: { conversationId: conversationInternalId, userId },
    });
  }

  async create(input: CreateConversationInput): Promise<ConversationOrmEntity> {
    return this.dataSource.transaction(async (manager) => {
      const conversation = manager.create(ConversationOrmEntity, {
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        scopeKey: input.scopeKey,
      });
      const saved = await manager.save(conversation);

      const participantEntities = input.participants.map((p) =>
        manager.create(ConversationParticipantOrmEntity, {
          conversationId: saved.id,
          userId: p.userId,
          role: p.role,
        }),
      );
      await manager.save(participantEntities);

      const reloaded = await manager.findOne(ConversationOrmEntity, {
        where: { id: saved.id },
        relations: ['participants'],
      });
      return reloaded as ConversationOrmEntity;
    });
  }

  async touchLastMessageAt(
    conversationInternalId: number,
    at: Date,
  ): Promise<void> {
    await this.conversations.update(conversationInternalId, {
      lastMessageAt: at,
    });
  }

  async updateParticipantLastRead(
    conversationInternalId: number,
    userId: number,
    lastReadMessageInternalId: number,
  ): Promise<void> {
    await this.participants.update(
      { conversationId: conversationInternalId, userId },
      { lastReadMessageId: lastReadMessageInternalId },
    );
  }
}
