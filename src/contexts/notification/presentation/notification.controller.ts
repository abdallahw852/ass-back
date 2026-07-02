import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Patch } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { MarkNotificationReadCommand } from '../application/commands/mark-notification-read.command';
import { MarkAllNotificationsReadCommand } from '../application/commands/mark-all-notifications-read.command';
import { ListNotificationsQuery } from '../application/queries/list-notifications.query';
import type { NotificationOrmEntity } from '../infrastructure/persistence/notification.orm-entity';

type SessionRequest = FastifyRequest & {
  session: { user: { id: number } };
};

@Controller('notifications')
@UseGuards(SessionAuthGuard)
export class NotificationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async list(
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @Req() req?: FastifyRequest,
  ): Promise<{
    items: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      isRead: boolean;
      createdAt: Date;
      link?: string;
    }>;
    total: number;
    unreadCount: number;
  }> {
    const userId = (req as SessionRequest).session.user.id;
    const limit = limitStr ? Math.min(Number(limitStr), 50) : 20;
    const offset = offsetStr ? Number(offsetStr) : 0;

    const result = (await this.queryBus.execute(
      new ListNotificationsQuery(userId, limit, offset),
    )) as unknown as {
      items: NotificationOrmEntity[];
      total: number;
      unreadCount: number;
    };

    return {
      items: result.items.map((n) => ({
        id: n._id,
        type: n.type,
        title: (n.payload['title'] as string) ?? '',
        message: (n.payload['message'] as string) ?? '',
        isRead: n.readAt !== null,
        createdAt: n.createdAt,
        ...(n.payload['link'] ? { link: n.payload['link'] as string } : {}),
      })),
      total: result.total,
      unreadCount: result.unreadCount,
    };
  }

  @Patch(':id/read')
  async markRead(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ): Promise<{ ok: boolean }> {
    const userId = (req as SessionRequest).session.user.id;
    return this.commandBus.execute(new MarkNotificationReadCommand(id, userId));
  }

  @Post('read-all')
  async markAllRead(@Req() req: FastifyRequest): Promise<{ ok: boolean }> {
    const userId = (req as SessionRequest).session.user.id;
    return this.commandBus.execute(new MarkAllNotificationsReadCommand(userId));
  }
}
