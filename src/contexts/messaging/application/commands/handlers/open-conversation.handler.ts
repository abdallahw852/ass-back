import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CONVERSATION_REPOSITORY } from '../../../domain/conversation.repository.interface';
import type { IConversationRepository } from '../../../domain/conversation.repository.interface';
import type { ConversationOrmEntity } from '../../../infrastructure/persistence/conversation.orm-entity';
import { OpenConversationCommand } from '../open-conversation.command';

@CommandHandler(OpenConversationCommand)
export class OpenConversationHandler implements ICommandHandler<OpenConversationCommand> {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: IConversationRepository,
  ) {}

  async execute(
    command: OpenConversationCommand,
  ): Promise<{ conversation: ConversationOrmEntity }> {
    const existing = await this.conversationRepository.findBySubject(
      command.subjectType,
      command.subjectId,
      command.scopeKey,
    );
    if (existing) {
      return { conversation: existing };
    }

    try {
      const created = await this.conversationRepository.create({
        subjectType: command.subjectType,
        subjectId: command.subjectId,
        scopeKey: command.scopeKey,
        participants: command.participants,
      });
      return { conversation: created };
    } catch (err) {
      // Race: another request created the same (subjectType, subjectId, scopeKey)
      // between our findBySubject and create. The DB unique index protects
      // against duplicates — re-fetch and return the winner.
      const fallback = await this.conversationRepository.findBySubject(
        command.subjectType,
        command.subjectId,
        command.scopeKey,
      );
      if (fallback) {
        return { conversation: fallback };
      }
      throw err;
    }
  }
}
