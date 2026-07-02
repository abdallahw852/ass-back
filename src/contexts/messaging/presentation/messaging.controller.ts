import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { MarkConversationReadCommand } from '../application/commands/mark-conversation-read.command';
import { SendMessageCommand } from '../application/commands/send-message.command';
import { GetConversationQuery } from '../application/queries/get-conversation.query';
import { ListMessagesQuery } from '../application/queries/list-messages.query';
import { ListMyConversationsQuery } from '../application/queries/list-my-conversations.query';
import type { GetConversationResult } from '../application/queries/handlers/get-conversation.handler';
import type { ListMessagesResult } from '../application/queries/handlers/list-messages.handler';
import type { ListMyConversationsResult } from '../application/queries/handlers/list-my-conversations.handler';
import type { MessageOrmEntity } from '../infrastructure/persistence/message.orm-entity';
import { ListConversationsQueryDto } from './dto/list-conversations-query.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { SendMessageDto } from './dto/send-message.dto';

type SessionRequest = FastifyRequest & {
  session: {
    user: {
      id: number;
      _id: string;
      email: string;
      role: string;
      verifiedAt: Date | null;
    };
  };
};

@Controller('messaging')
@UseGuards(SessionAuthGuard)
export class MessagingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('conversations')
  async listMine(
    @Query() query: ListConversationsQueryDto,
    @Req() req: FastifyRequest,
  ): Promise<ListMyConversationsResult> {
    const userId = (req as SessionRequest).session.user.id;
    return this.queryBus.execute(
      new ListMyConversationsQuery(
        userId,
        query.subjectType,
        query.page,
        query.limit,
      ),
    );
  }

  @Get('conversations/:conversationId')
  async getOne(
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
    @Req() req: FastifyRequest,
  ): Promise<GetConversationResult> {
    const userId = (req as SessionRequest).session.user.id;
    return this.queryBus.execute(
      new GetConversationQuery(conversationId, userId),
    );
  }

  @Get('conversations/:conversationId/messages')
  async listMessages(
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
    @Query() query: ListMessagesQueryDto,
    @Req() req: FastifyRequest,
  ): Promise<ListMessagesResult> {
    const userId = (req as SessionRequest).session.user.id;
    return this.queryBus.execute(
      new ListMessagesQuery(conversationId, userId, query.limit, query.before),
    );
  }

  @Post('conversations/:conversationId/messages')
  async send(
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
    @Body() dto: SendMessageDto,
    @Req() req: FastifyRequest,
  ): Promise<{
    message: { _id: string; body: string; senderId: number; createdAt: Date };
  }> {
    const userId = (req as SessionRequest).session.user.id;
    const result = await this.commandBus.execute<
      SendMessageCommand,
      { message: MessageOrmEntity }
    >(new SendMessageCommand(conversationId, userId, dto.body));
    return {
      message: {
        _id: result.message._id,
        body: result.message.body,
        senderId: result.message.senderId,
        createdAt: result.message.createdAt,
      },
    };
  }

  @Post('conversations/:conversationId/read')
  async markRead(
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
    @Body() dto: MarkReadDto,
    @Req() req: FastifyRequest,
  ): Promise<{ ok: true }> {
    const userId = (req as SessionRequest).session.user.id;
    return this.commandBus.execute(
      new MarkConversationReadCommand(
        conversationId,
        userId,
        dto.upToMessageId,
      ),
    );
  }
}
