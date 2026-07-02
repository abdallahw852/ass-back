import {
  Body,
  Controller,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { ResolveDisputeCommand } from '../../order/application/commands/resolve-dispute.command';

export class ListDisputesQueryDto {
  @IsOptional()
  @IsIn(['open', 'resolved_buyer', 'resolved_supplier'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class ResolveDisputeDto {
  @IsString() @IsNotEmpty() outcome: 'buyer' | 'supplier';
  @IsString() @IsNotEmpty() note: string;
  @IsNumber() @IsOptional() @Type(() => Number) refundAmount?: number;
}

interface AuthenticatedRequest {
  session: { user: { id: number } };
}

@Controller('disputes')
@UseGuards(SessionAuthGuard, AdminGuard)
export class DisputeController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':disputeId/resolve')
  async resolve(
    @Request() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() dto: ResolveDisputeDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new ResolveDisputeCommand(
        disputeId,
        req.session.user.id,
        dto.outcome,
        dto.note,
        dto.refundAmount,
      ),
    );
  }
}
