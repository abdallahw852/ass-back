import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { ListAdminWithdrawalsQuery } from '../application/queries/list-admin-withdrawals.query';
import { ApproveWithdrawalCommand } from '../application/commands/approve-withdrawal.command';
import { RejectWithdrawalCommand } from '../application/commands/reject-withdrawal.command';
import { ListAdminWithdrawalsQueryDto } from './dto/list-admin-withdrawals-query.dto';
import { RejectWithdrawalDto } from './dto/reject-withdrawal.dto';
import type { ListAdminWithdrawalsResult } from '../application/queries/list-admin-withdrawals.handler';
import { WithdrawalRequestOrmEntity } from '../infrastructure/persistence/withdrawal-request.orm-entity';

type SessionRequest = FastifyRequest & {
  session: { user: { id: number; role: string } };
};

@Controller('admin/withdrawals')
@UseGuards(SessionAuthGuard, AdminGuard)
export class AdminWithdrawalsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async listWithdrawals(
    @Query() dto: ListAdminWithdrawalsQueryDto,
  ): Promise<ListAdminWithdrawalsResult> {
    return this.queryBus.execute(
      new ListAdminWithdrawalsQuery(dto.status, dto.page, dto.limit),
    );
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveWithdrawal(
    @Param('id') id: string,
    @Req() req: SessionRequest,
  ): Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    payoutMethodId: string;
    createdAt: Date;
  }> {
    const actor = req.session.user;
    const withdrawal: WithdrawalRequestOrmEntity =
      await this.commandBus.execute(
        new ApproveWithdrawalCommand(id, actor.id, actor.role),
      );
    return this.formatWithdrawal(withdrawal);
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectWithdrawal(
    @Param('id') id: string,
    @Body() dto: RejectWithdrawalDto,
    @Req() req: SessionRequest,
  ): Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    payoutMethodId: string;
    rejectionReason: string | null;
    createdAt: Date;
  }> {
    const actor = req.session.user;
    const withdrawal: WithdrawalRequestOrmEntity =
      await this.commandBus.execute(
        new RejectWithdrawalCommand(id, dto.reason, actor.id, actor.role),
      );
    return {
      ...this.formatWithdrawal(withdrawal),
      rejectionReason: withdrawal.rejection_reason,
    };
  }

  private formatWithdrawal(w: WithdrawalRequestOrmEntity): {
    id: string;
    amount: number;
    currency: string;
    status: string;
    payoutMethodId: string;
    createdAt: Date;
  } {
    return {
      id: w._id,
      amount: Number(w.amount),
      currency: w.currency,
      status: w.status,
      payoutMethodId: w.payout_method_id,
      createdAt: w.created_at,
    };
  }
}
