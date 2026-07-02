import { Test, type TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import {
  CONVERSATION_REPOSITORY,
  type IConversationRepository,
} from '../../../domain/conversation.repository.interface';
import {
  MESSAGE_REPOSITORY,
  type IMessageRepository,
} from '../../../domain/message.repository.interface';
import {
  ConversationSubjectType,
  ParticipantRole,
} from '../../../domain/conversation.types';
import {
  ConversationNotFoundException,
  ConversationReadOnlyException,
  EmptyMessageBodyException,
  NotAParticipantException,
} from '../../../domain/messaging.exceptions';
import {
  RFQ_REPOSITORY,
  type IRfqRepository,
} from '../../../../rfq/domain/rfq.repository.interface';
import { RfqStatus } from '../../../../rfq/domain/rfq.types';
import { MessageSentEvent } from '../../events/message-sent.event';
import { SendMessageCommand } from '../send-message.command';
import { SendMessageHandler } from './send-message.handler';

describe('SendMessageHandler', () => {
  let handler: SendMessageHandler;

  const conversationRepository: jest.Mocked<IConversationRepository> = {
    findBySubject: jest.fn(),
    findByPublicId: jest.fn(),
    findByPublicIdWithParticipants: jest.fn(),
    findParticipant: jest.fn(),
    create: jest.fn(),
    touchLastMessageAt: jest.fn(),
    updateParticipantLastRead: jest.fn(),
  };

  const messageRepository: jest.Mocked<IMessageRepository> = {
    create: jest.fn(),
    listByConversationPaginated: jest.fn(),
    findByPublicId: jest.fn(),
    countUnreadForParticipant: jest.fn(),
  };

  const rfqRepository: jest.Mocked<IRfqRepository> = {
    findByPublicId: jest.fn(),
    findByPublicIdWithRelations: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const publishMock = jest.fn<void, [MessageSentEvent]>();
  const eventBus = { publish: publishMock } as unknown as EventBus;

  beforeEach(async () => {
    jest.clearAllMocks();
    publishMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendMessageHandler,
        { provide: CONVERSATION_REPOSITORY, useValue: conversationRepository },
        { provide: MESSAGE_REPOSITORY, useValue: messageRepository },
        { provide: RFQ_REPOSITORY, useValue: rfqRepository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get(SendMessageHandler);
  });

  const buildConversation = (
    overrides: Partial<{
      subjectId: string;
      subjectType: ConversationSubjectType;
    }> = {},
  ) => ({
    id: 1,
    _id: 'conv-public-id',
    subjectType: ConversationSubjectType.RFQ,
    subjectId: 'rfq-public-id',
    scopeKey: 'supplier-public-id',
    participants: [
      { userId: 100, role: ParticipantRole.BUYER },
      { userId: 200, role: ParticipantRole.SUPPLIER },
    ],
    ...overrides,
  });

  it('rejects empty bodies before any DB call', async () => {
    await expect(
      handler.execute(new SendMessageCommand('conv-public-id', 100, '   ')),
    ).rejects.toBeInstanceOf(EmptyMessageBodyException);
    expect(
      conversationRepository.findByPublicIdWithParticipants.mock.calls,
    ).toHaveLength(0);
  });

  it('returns 404 when the conversation does not exist', async () => {
    conversationRepository.findByPublicIdWithParticipants.mockResolvedValue(
      null,
    );
    await expect(
      handler.execute(new SendMessageCommand('conv-public-id', 100, 'hi')),
    ).rejects.toBeInstanceOf(ConversationNotFoundException);
  });

  it('rejects non-participants', async () => {
    conversationRepository.findByPublicIdWithParticipants.mockResolvedValue(
      buildConversation() as never,
    );
    await expect(
      handler.execute(new SendMessageCommand('conv-public-id', 999, 'hi')),
    ).rejects.toBeInstanceOf(NotAParticipantException);
  });

  it('rejects messages once the RFQ is no longer OPEN', async () => {
    conversationRepository.findByPublicIdWithParticipants.mockResolvedValue(
      buildConversation() as never,
    );
    rfqRepository.findByPublicId.mockResolvedValue({
      id: 10,
      _id: 'rfq-public-id',
      status: RfqStatus.AWARDED,
    } as never);

    await expect(
      handler.execute(new SendMessageCommand('conv-public-id', 100, 'hi')),
    ).rejects.toBeInstanceOf(ConversationReadOnlyException);
    expect(messageRepository.create.mock.calls).toHaveLength(0);
  });

  it('persists the message and publishes MessageSentEvent for OPEN RFQs', async () => {
    conversationRepository.findByPublicIdWithParticipants.mockResolvedValue(
      buildConversation() as never,
    );
    rfqRepository.findByPublicId.mockResolvedValue({
      id: 10,
      _id: 'rfq-public-id',
      status: RfqStatus.OPEN,
    } as never);
    const createdAt = new Date('2026-05-06T10:00:00Z');
    messageRepository.create.mockResolvedValue({
      id: 5,
      _id: 'msg-public-id',
      conversationId: 1,
      senderId: 100,
      body: 'hi',
      createdAt,
    } as never);

    const result = await handler.execute(
      new SendMessageCommand('conv-public-id', 100, '  hi  '),
    );

    expect(messageRepository.create.mock.calls[0]?.[0]).toEqual({
      conversationInternalId: 1,
      senderId: 100,
      body: 'hi',
    });
    expect(conversationRepository.touchLastMessageAt.mock.calls[0]).toEqual([
      1,
      createdAt,
    ]);
    expect(publishMock.mock.calls).toHaveLength(1);
    const published = publishMock.mock.calls[0]?.[0];
    expect(published).toBeInstanceOf(MessageSentEvent);
    expect(published?.recipientUserIds).toEqual([200]);
    expect(published?.messagePublicId).toBe('msg-public-id');
    expect(result.message._id).toBe('msg-public-id');
  });
});
