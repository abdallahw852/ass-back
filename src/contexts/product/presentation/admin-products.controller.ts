import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { ApproveOrRejectProductCommand } from '../application/commands/approve-or-reject-product.command';
import { ApproveOrRejectProductDto } from './dto/approve-or-reject-product.dto';
import { ListProductsForAdminQuery } from '../application/queries/list-products-for-admin.query';

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

@Controller('admin/products')
@UseGuards(SessionAuthGuard, AdminGuard)
export class AdminProductsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async listForAdmin(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<unknown> {
    return this.queryBus.execute(
      new ListProductsForAdminQuery({
        status,
        page: page ? +page : 1,
        limit: limit ? +limit : 20,
      }),
    );
  }

  @Patch(':productId/approval')
  async approveOrReject(
    @Param('productId') productId: string,
    @Body() dto: ApproveOrRejectProductDto,
    @Req() req: FastifyRequest,
  ): Promise<unknown> {
    const user = (req as SessionRequest).session?.user;
    return this.commandBus.execute(
      new ApproveOrRejectProductCommand(
        productId,
        dto.decision,
        dto.reason ?? null,
        user.id,
        user.role,
      ),
    );
  }
}
