import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { BuyerGuard } from '../../../shared/infrastructure/guards/buyer.guard';
import { BuyerDashboardFilterDto } from './dto/buyer-dashboard-filter.dto';
import { GetBuyerHomeQuery } from '../application/queries/get-buyer-home.query';
import { GetBuyerOrderManagementQuery } from '../application/queries/get-buyer-order-management.query';
import { GetBuyerRfqManagementQuery } from '../application/queries/get-buyer-rfq-management.query';
import { GetBuyerAccountSettingsQuery } from '../application/queries/get-buyer-account-settings.query';
import type { BuyerHomeResult } from '../application/queries/get-buyer-home.handler';
import type { BuyerOrderManagementResult } from '../application/queries/get-buyer-order-management.handler';
import type { BuyerRfqManagementResult } from '../application/queries/get-buyer-rfq-management.handler';
import type { BuyerAccountSettingsResult } from '../application/queries/get-buyer-account-settings.handler';

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

@Controller('buyer-dashboard')
@UseGuards(SessionAuthGuard, BuyerGuard)
export class BuyerDashboardController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('home')
  async getHome(
    @Req() req: SessionRequest,
    @Query() dto: BuyerDashboardFilterDto,
  ): Promise<BuyerHomeResult> {
    const userId = req.session.user.id;
    return this.queryBus.execute(
      new GetBuyerHomeQuery(userId, dto.period ?? 'month'),
    );
  }

  @Get('orders')
  async getOrders(
    @Req() req: SessionRequest,
    @Query() dto: BuyerDashboardFilterDto,
  ): Promise<BuyerOrderManagementResult> {
    const userId = req.session.user.id;
    return this.queryBus.execute(
      new GetBuyerOrderManagementQuery(
        userId,
        dto.page ?? 1,
        dto.limit ?? 10,
        dto.status,
        dto.search,
      ),
    );
  }

  @Get('rfqs')
  async getRfqs(
    @Req() req: SessionRequest,
    @Query() dto: BuyerDashboardFilterDto,
  ): Promise<BuyerRfqManagementResult> {
    const userId = req.session.user.id;
    return this.queryBus.execute(
      new GetBuyerRfqManagementQuery(
        userId,
        dto.page ?? 1,
        dto.limit ?? 10,
        dto.status,
      ),
    );
  }

  @Get('settings')
  async getSettings(
    @Req() req: SessionRequest,
  ): Promise<BuyerAccountSettingsResult> {
    const userId = req.session.user.id;
    return this.queryBus.execute(new GetBuyerAccountSettingsQuery(userId));
  }
}
