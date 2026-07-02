import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';
import { RfqModule } from '../rfq/rfq.module';
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';
import { CONVERSATION_REPOSITORY } from './domain/conversation.repository.interface';
import { MESSAGE_REPOSITORY } from './domain/message.repository.interface';
import { ConversationRepository } from './infrastructure/conversation.repository';
import { MessageRepository } from './infrastructure/message.repository';
import { ConversationPresenceService } from './infrastructure/io/conversation-presence.service';
import { ConversationOrmEntity } from './infrastructure/persistence/conversation.orm-entity';
import { ConversationParticipantOrmEntity } from './infrastructure/persistence/conversation-participant.orm-entity';
import { MessageOrmEntity } from './infrastructure/persistence/message.orm-entity';
import { MessagingController } from './presentation/messaging.controller';
import { MessagingGateway } from './presentation/messaging.gateway';

@Module({
  imports: [
    CqrsModule,
    SharedModule,
    RfqModule,
    TypeOrmModule.forFeature(
      [
        ConversationOrmEntity,
        ConversationParticipantOrmEntity,
        MessageOrmEntity,
      ],
      'write',
    ),
  ],
  controllers: [MessagingController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    MessagingGateway,
    ConversationRepository,
    MessageRepository,
    ConversationPresenceService,
    { provide: CONVERSATION_REPOSITORY, useExisting: ConversationRepository },
    { provide: MESSAGE_REPOSITORY, useExisting: MessageRepository },
  ],
  exports: [
    CONVERSATION_REPOSITORY,
    MESSAGE_REPOSITORY,
    ConversationPresenceService,
  ],
})
export class MessagingModule {}
