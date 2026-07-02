import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { ListAdminUsersQuery } from '../application/queries/list-admin-users.query';
import { GetAdminUserQuery } from '../application/queries/get-admin-user.query';
import { UpdateUserStatusCommand } from '../application/commands/update-user-status.command';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import type { ListAdminUsersResult } from '../application/queries/handlers/list-admin-users.handler';
import type { AdminUserDetail } from '../application/queries/handlers/get-admin-user.handler';

type SessionRequest = FastifyRequest & {
  session: { user: { id: number; _id: string; role: string } };
};

@Controller('admin/users')
@UseGuards(SessionAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async listUsers(
    @Query() dto: ListAdminUsersQueryDto,
  ): Promise<ListAdminUsersResult> {
    return this.queryBus.execute(
      new ListAdminUsersQuery(
        dto.role,
        dto.status,
        dto.verified,
        dto.search,
        dto.page,
        dto.limit,
      ),
    );
  }

  @Get(':userId')
  async getUser(@Param('userId') userId: string): Promise<AdminUserDetail> {
    return this.queryBus.execute(new GetAdminUserQuery(userId));
  }

  @Patch(':userId/status')
  async updateStatus(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: SessionRequest,
  ): Promise<AdminUserDetail> {
    const actor = req.session.user;
    const updated = await this.commandBus.execute(
      new UpdateUserStatusCommand(
        userId,
        dto.status,
        dto.reason,
        actor.id,
        actor.role,
      ),
    );

    return {
      id: updated._id,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
      role: updated.role,
      status: updated.status,
      verifiedAt: updated.verifiedAt,
      createdAt: updated.createdAt,
      lastLoginAt: updated.lastLoginAt,
    };
  }
}
