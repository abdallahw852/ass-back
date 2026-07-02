import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from '../../../shared/infrastructure/guards/session-auth.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { AllowUnverified } from '../../../shared/decorators/allow-unverified.decorator';
import { TrackEventCommand } from '../application/commands/track-event.command';
import { GetPlatformOverviewQuery } from '../application/queries/get-supplier-report.query';
import { GetAdminAnalyticsQuery } from '../application/queries/get-admin-analytics.query';
import { AnalyticsFilterDto, TrackEventDto } from './dto/analytics-filter.dto';

type SessionRequest = FastifyRequest & {
  session?: {
    user?: {
      id: number;
      _id: string;
      email: string;
      role: string;
      verifiedAt: Date | null;
    };
  };
};

@Controller()
export class AnalyticsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @AllowUnverified()
  @Post('analytics/events')
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async trackEvent(
    @Body() dto: TrackEventDto,
    @Req() req: SessionRequest,
  ): Promise<void> {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip ??
      null;
    const country = (req.headers['cf-ipcountry'] as string) ?? null;
    const userAgent = req.headers['user-agent'] ?? null;
    const sessionUser = req.session?.user;

    await this.commandBus.execute(
      new TrackEventCommand(
        dto.type,
        dto.path,
        dto.sessionId ?? 'anonymous',
        sessionUser?.id ?? null,
        ip,
        country,
        dto.referrer ?? null,
        userAgent ?? null,
      ),
    );
  }

  @Get('admin/dashboard')
  @UseGuards(SessionAuthGuard, AdminGuard)
  async getPlatformOverview(): Promise<unknown> {
    return this.queryBus.execute(new GetPlatformOverviewQuery());
  }

  @Get('admin/analytics')
  @UseGuards(SessionAuthGuard, AdminGuard)
  async getAnalytics(@Query() dto: AnalyticsFilterDto): Promise<unknown> {
    return this.queryBus.execute(new GetAdminAnalyticsQuery(dto.from, dto.to));
  }
}
