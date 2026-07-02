import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../../shared/infrastructure/guards/session-auth.guard';
import { GetSupplierHomeStatsQuery } from '../application/queries/get-supplier-home-stats.query';
import { SupplierStatsFilterDto } from './dto/supplier-stats-filter.dto';
import type { SupplierHomeStatsResult } from '../application/queries/get-supplier-home-stats.handler';

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

@Controller('supplier-dashboard')
@UseGuards(SessionAuthGuard)
export class SupplierDashboardController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('home')
  async getHomeStats(
    @Req() req: SessionRequest,
    @Query() dto: SupplierStatsFilterDto,
  ): Promise<SupplierHomeStatsResult> {
    const userId = req.session.user.id;
    return this.queryBus.execute(
      new GetSupplierHomeStatsQuery(userId, dto.period ?? 'month'),
    );
  }
}
