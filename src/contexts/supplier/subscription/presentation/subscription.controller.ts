import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { AdminGuard } from '../../../../shared/guards/admin.guard';
import { AllowUnverified } from '../../../../shared/decorators/allow-unverified.decorator';
import { SessionAuthGuard } from '../../../../shared/infrastructure/guards/session-auth.guard';
import { SubscribeDto } from './dto/subscribe.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpgradeDto } from './dto/upgrade.dto';
import { SubscribeCommand } from '../application/commands/subscribe.command';
import { CreatePlanCommand } from '../application/commands/create-plan.command';
import { UpgradeSubscriptionCommand } from '../application/commands/upgrade-subscription.command';
import { CancelSubscriptionCommand } from '../application/commands/cancel-subscription.command';
import { ListPlansQuery } from '../application/queries/list-plans.query';
import { GetSubscriptionQuery } from '../application/queries/get-subscription.query';
import { SubscriptionFormatter } from './subscription.formatter';

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

@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @AllowUnverified()
  @Get('plans')
  async listPlans(): Promise<{ plans: Record<string, unknown>[] }> {
    const plans = (await this.queryBus.execute(
      new ListPlansQuery(),
    )) as unknown as Record<string, unknown>[];
    return { plans: plans.map((p) => SubscriptionFormatter.plan(p)) };
  }

  @Post('subscribe')
  async subscribe(
    @Body() dto: SubscribeDto,
    @Req() req: FastifyRequest,
  ): Promise<{
    subscription: Record<string, unknown> | null;
    requiresPayment: boolean;
    clientSecret?: string;
  }> {
    const sessionUser = (req as SessionRequest).session?.user;
    if (!sessionUser)
      throw new UnauthorizedException('Authentication required.');

    const result = (await this.commandBus.execute(
      new SubscribeCommand(sessionUser.id, dto.planId),
    )) as unknown as {
      subscription: Record<string, unknown>;
      requiresPayment: boolean;
      clientSecret?: string;
    };

    return {
      subscription: SubscriptionFormatter.subscription(result.subscription),
      requiresPayment: result.requiresPayment,
      ...(result.clientSecret ? { clientSecret: result.clientSecret } : {}),
    };
  }

  @Get('current')
  async current(
    @Req() req: FastifyRequest,
  ): Promise<{ subscription: Record<string, unknown> | null }> {
    const sessionUser = (req as SessionRequest).session?.user;
    if (!sessionUser)
      throw new UnauthorizedException('Authentication required.');

    const subscription = (await this.queryBus.execute(
      new GetSubscriptionQuery(sessionUser.id),
    )) as unknown as Record<string, unknown> | null;

    return { subscription: SubscriptionFormatter.subscription(subscription) };
  }

  @Post('upgrade')
  async upgrade(
    @Body() dto: UpgradeDto,
    @Req() req: FastifyRequest,
  ): Promise<{
    subscription: null;
    requiresPayment: boolean;
    clientSecret?: string;
  }> {
    const sessionUser = (req as SessionRequest).session?.user;
    if (!sessionUser)
      throw new UnauthorizedException('Authentication required.');
    return this.commandBus.execute(
      new UpgradeSubscriptionCommand(sessionUser.id, dto.planId),
    );
  }

  @Post('cancel')
  async cancel(
    @Req() req: FastifyRequest,
  ): Promise<{ subscription: Record<string, unknown> }> {
    const sessionUser = (req as SessionRequest).session?.user;
    if (!sessionUser)
      throw new UnauthorizedException('Authentication required.');
    const subscription = (await this.commandBus.execute(
      new CancelSubscriptionCommand(sessionUser.id),
    )) as unknown as Record<string, unknown>;
    return {
      subscription: SubscriptionFormatter.subscription(subscription) as Record<
        string,
        unknown
      >,
    };
  }

  @Post('plans')
  @UseGuards(SessionAuthGuard, AdminGuard)
  async createPlan(
    @Body() dto: CreatePlanDto,
  ): Promise<{ plan: Record<string, unknown> }> {
    const plan = (await this.commandBus.execute(
      new CreatePlanCommand(
        dto.name,
        dto.displayNameAr,
        dto.displayNameEn,
        dto.price,
        dto.currency ?? 'SAR',
        dto.billingCycle ?? 'monthly',
        dto.commissionRate,
        dto.features,
        dto.isActive ?? true,
        dto.isDefault,
      ),
    )) as unknown as Record<string, unknown>;
    return { plan: SubscriptionFormatter.plan(plan) };
  }
}
