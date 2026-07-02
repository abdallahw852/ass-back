import { Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { filter, type Subscription } from 'rxjs';
import { NotificationCreatedEvent } from '../application/events/notification-created.event';

interface AuthedSocket extends Socket {
  data: { user?: { id: number; _id: string; email: string; role: string } };
}

@WebSocketGateway({ namespace: '/notifications', cors: { credentials: true } })
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private eventSubscription: Subscription | null = null;

  constructor(private readonly eventBus: EventBus) {}

  afterInit(): void {
    this.eventSubscription = this.eventBus
      .pipe(
        filter(
          (e): e is NotificationCreatedEvent =>
            e instanceof NotificationCreatedEvent,
        ),
      )
      .subscribe((event) => this.broadcastNotification(event));
  }

  onModuleDestroy(): void {
    this.eventSubscription?.unsubscribe();
  }

  handleConnection(client: AuthedSocket): void {
    const user = client.data.user;
    if (!user?.id) {
      client.disconnect(true);
      return;
    }
    void client.join(this.userRoom(user.id));
    this.logger.debug(
      `notification socket connected user=${user.id} sid=${client.id}`,
    );
  }

  handleDisconnect(client: AuthedSocket): void {
    this.logger.debug(`notification socket disconnected sid=${client.id}`);
  }

  private broadcastNotification(event: NotificationCreatedEvent): void {
    if (!this.server) return;
    const n = event.notification;
    this.server.to(this.userRoom(n.userId)).emit('notification:new', {
      id: n._id,
      type: n.type,
      payload: n.payload,
      readAt: n.readAt,
      createdAt: n.createdAt,
    });
  }

  private userRoom(userId: number): string {
    return `user:${userId}`;
  }
}
