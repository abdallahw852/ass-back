import { Inject, Logger } from '@nestjs/common';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { filter, type Subscription } from 'rxjs';
import { CONVERSATION_REPOSITORY } from '../domain/conversation.repository.interface';
import type { IConversationRepository } from '../domain/conversation.repository.interface';
import { SendMessageCommand } from '../application/commands/send-message.command';
import { MessageSentEvent } from '../application/events/message-sent.event';
import type { MessageOrmEntity } from '../infrastructure/persistence/message.orm-entity';
import { ConversationPresenceService } from '../infrastructure/io/conversation-presence.service';

interface AuthedSocket extends Socket {
  data: { user?: { id: number; _id: string; email: string; role: string } };
}

@WebSocketGateway({ namespace: '/messaging', cors: { credentials: true } })
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private eventSubscription: Subscription | null = null;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: IConversationRepository,
    private readonly presenceService: ConversationPresenceService,
  ) {}

  afterInit(): void {
    // Forward MessageSentEvent → socket rooms.
    this.eventSubscription = this.eventBus
      .pipe(filter((e): e is MessageSentEvent => e instanceof MessageSentEvent))
      .subscribe((event) => this.broadcastMessage(event));
  }

  onModuleDestroy(): void {
    this.eventSubscription?.unsubscribe();
  }

  handleConnection(client: AuthedSocket): void {
    const user = client.data.user;
    if (!user?.id) {
      // The session-aware IoAdapter rejects unauthenticated upgrades, so this
      // is a safety net only.
      client.disconnect(true);
      return;
    }
    void client.join(this.userRoom(user.id));
    this.logger.debug(`socket connected user=${user.id} sid=${client.id}`);
  }

  handleDisconnect(client: AuthedSocket): void {
    this.logger.debug(`socket disconnected sid=${client.id}`);
    const userId = client.data.user?.id;
    if (userId) {
      for (const room of client.rooms) {
        if (room.startsWith('conversation:')) {
          const conversationPublicId = room.slice('conversation:'.length);
          this.presenceService.leave(conversationPublicId, userId);
        }
      }
    }
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { conversationId: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const userId = client.data.user?.id;
    if (!userId || !payload?.conversationId) {
      return { ok: false, error: 'invalid' };
    }
    const conversation =
      await this.conversationRepository.findByPublicIdWithParticipants(
        payload.conversationId,
      );
    if (!conversation) {
      return { ok: false, error: 'not_found' };
    }
    const isParticipant = conversation.participants?.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) {
      return { ok: false, error: 'forbidden' };
    }
    void client.join(this.conversationRoom(conversation._id));
    this.presenceService.join(conversation._id, userId);
    return { ok: true };
  }

  @SubscribeMessage('conversation:leave')
  leaveConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { conversationId: string },
  ): { ok: true } {
    if (payload?.conversationId) {
      void client.leave(this.conversationRoom(payload.conversationId));
      const userId = client.data.user?.id;
      if (userId) {
        this.presenceService.leave(payload.conversationId, userId);
      }
    }
    return { ok: true };
  }

  @SubscribeMessage('message:send')
  async sendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { conversationId: string; body: string },
  ): Promise<
    | { ok: true; message: { _id: string; createdAt: Date } }
    | { ok: false; error: string }
  > {
    const userId = client.data.user?.id;
    if (!userId || !payload?.conversationId || !payload?.body) {
      return { ok: false, error: 'invalid' };
    }
    try {
      const result = await this.commandBus.execute<
        SendMessageCommand,
        { message: MessageOrmEntity }
      >(new SendMessageCommand(payload.conversationId, userId, payload.body));
      return {
        ok: true,
        message: {
          _id: result.message._id,
          createdAt: result.message.createdAt,
        },
      };
    } catch (err) {
      const e = err as { message?: string; status?: number };
      return { ok: false, error: e?.message ?? 'error' };
    }
  }

  private broadcastMessage(event: MessageSentEvent): void {
    if (!this.server) return;
    const payload = {
      conversationId: event.conversationPublicId,
      message: {
        _id: event.messagePublicId,
        senderId: event.senderUserId,
        body: event.body,
        createdAt: event.createdAt,
      },
    };
    this.server
      .to(this.conversationRoom(event.conversationPublicId))
      .emit('message:new', payload);

    for (const recipient of event.recipientUserIds) {
      this.server.to(this.userRoom(recipient)).emit('conversation:updated', {
        conversationId: event.conversationPublicId,
        lastMessageAt: event.createdAt,
      });
    }
  }

  private userRoom(userId: number): string {
    return `user:${userId}`;
  }

  private conversationRoom(conversationPublicId: string): string {
    return `conversation:${conversationPublicId}`;
  }
}
