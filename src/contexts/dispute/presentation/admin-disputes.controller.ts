import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListDisputesQuery } from '../application/queries/list-disputes.query';
import { GetDisputeQuery } from '../application/queries/get-dispute.query';
import type {
  ListDisputesResult,
  DisputeListItem,
} from '../application/queries/list-disputes.handler';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { ListDisputesQueryDto } from './dispute.controller';
import { ResolveDisputeCommand } from '../../order/application/commands/resolve-dispute.command';

class ResolveDisputeDto {
  @IsEnum(['buyer', 'supplier'])
  outcome: 'buyer' | 'supplier';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  refundAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

interface AuthenticatedRequest {
  session: { user: { id: number } };
}

@Controller('admin/disputes')
@UseGuards(SessionAuthGuard, AdminGuard)
export class AdminDisputesController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  async listDisputes(
    @Query() dto: ListDisputesQueryDto,
  ): Promise<ListDisputesResult> {
    return this.queryBus.execute(
      new ListDisputesQuery(dto.status, dto.page, dto.limit),
    );
  }

  @Get(':disputeId')
  async getDispute(
    @Param('disputeId') disputeId: string,
  ): Promise<DisputeListItem> {
    return this.queryBus.execute(new GetDisputeQuery(disputeId));
  }

  @Post(':disputeId/resolve')
  async resolveDispute(
    @Param('disputeId') disputeId: string,
    @Body() dto: ResolveDisputeDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.commandBus.execute(
      new ResolveDisputeCommand(
        disputeId,
        req.session.user.id,
        dto.outcome,
        dto.note ?? '',
        dto.refundAmount,
      ),
    );
  }
}
