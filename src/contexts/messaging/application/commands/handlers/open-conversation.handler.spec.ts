import { Test, type TestingModule } from '@nestjs/testing';
import {
  CONVERSATION_REPOSITORY,
  type IConversationRepository,
} from '../../../domain/conversation.repository.interface';
import {
  ConversationSubjectType,
  ParticipantRole,
} from '../../../domain/conversation.types';
import { OpenConversationCommand } from '../open-conversation.command';
import { OpenConversationHandler } from './open-conversation.handler';

describe('OpenConversationHandler', () => {
  let handler: OpenConversationHandler;

  const conversationRepository: jest.Mocked<IConversationRepository> = {
    findBySubject: jest.fn(),
    findByPublicId: jest.fn(),
    findByPublicIdWithParticipants: jest.fn(),
    findParticipant: jest.fn(),
    create: jest.fn(),
    touchLastMessageAt: jest.fn(),
    updateParticipantLastRead: jest.fn(),
  };

  const buildCommand = (): OpenConversationCommand =>
    new OpenConversationCommand(
      ConversationSubjectType.RFQ,
      'rfq-public-id',
      'supplier-public-id',
      [
        { userId: 100, role: ParticipantRole.BUYER },
        { userId: 200, role: ParticipantRole.SUPPLIER },
      ],
    );

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenConversationHandler,
        { provide: CONVERSATION_REPOSITORY, useValue: conversationRepository },
      ],
    }).compile();

    handler = module.get(OpenConversationHandler);
  });

  it('returns the existing conversation without creating when one already matches the subject key', async () => {
    conversationRepository.findBySubject.mockResolvedValue({
      id: 1,
      _id: 'existing-conv-id',
    } as never);

    const result = await handler.execute(buildCommand());

    expect(result.conversation._id).toBe('existing-conv-id');
    expect(conversationRepository.create.mock.calls).toHaveLength(0);
  });

  it('creates a new conversation when none exists for the subject key', async () => {
    conversationRepository.findBySubject.mockResolvedValue(null);
    conversationRepository.create.mockResolvedValue({
      id: 2,
      _id: 'new-conv-id',
    } as never);

    const result = await handler.execute(buildCommand());

    expect(result.conversation._id).toBe('new-conv-id');
    expect(conversationRepository.create.mock.calls[0]?.[0]).toEqual({
      subjectType: ConversationSubjectType.RFQ,
      subjectId: 'rfq-public-id',
      scopeKey: 'supplier-public-id',
      participants: [
        { userId: 100, role: ParticipantRole.BUYER },
        { userId: 200, role: ParticipantRole.SUPPLIER },
      ],
    });
  });

  it('recovers the winner if a concurrent insert wins the unique-key race', async () => {
    conversationRepository.findBySubject
      .mockResolvedValueOnce(null) // pre-create lookup miss
      .mockResolvedValueOnce({ id: 3, _id: 'race-winner-id' } as never);
    conversationRepository.create.mockRejectedValue(
      new Error('duplicate key value violates unique constraint'),
    );

    const result = await handler.execute(buildCommand());

    expect(result.conversation._id).toBe('race-winner-id');
    expect(conversationRepository.findBySubject.mock.calls).toHaveLength(2);
  });

  it('rethrows if the create fails for a non-conflict reason', async () => {
    conversationRepository.findBySubject.mockResolvedValue(null);
    const err = new Error('connection lost');
    conversationRepository.create.mockRejectedValue(err);

    await expect(handler.execute(buildCommand())).rejects.toBe(err);
  });
});
