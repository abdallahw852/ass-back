import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SessionAuthGuard } from '../../../../shared/infrastructure/guards/session-auth.guard';
import { AdminGuard } from '../../../../shared/guards/admin.guard';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { SetPlanStatusDto } from './dto/set-plan-status.dto';
import { CreatePlanCommand } from '../application/commands/create-plan.command';
import { UpdatePlanCommand } from '../application/commands/update-plan.command';
import { SetPlanStatusCommand } from '../application/commands/set-plan-status.command';
import { DeletePlanCommand } from '../application/commands/delete-plan.command';
import { ListPlansAdminQuery } from '../application/queries/list-plans-admin.query';
import { SubscriptionFormatter } from './subscription.formatter';
import { PLAN_REPOSITORY } from '../domain/plan.repository.interface';
import type { IPlanRepository } from '../domain/plan.repository.interface';
import { Inject } from '@nestjs/common';

@Controller('admin/plans')
@UseGuards(SessionAuthGuard, AdminGuard)
export class AdminPlansController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
  ) {}

  @Get()
  async listPlans(): Promise<{ plans: Record<string, unknown>[] }> {
    const plans = (await this.queryBus.execute(
      new ListPlansAdminQuery(),
    )) as unknown as Record<string, unknown>[];
    return { plans: plans.map((p) => SubscriptionFormatter.plan(p)) };
  }

  @Get(':id')
  async getPlan(
    @Param('id') id: string,
  ): Promise<{ plan: Record<string, unknown> }> {
    const plan = await this.planRepository.findByPublicId(id);
    if (!plan) throw new NotFoundException(`Plan '${id}' not found.`);
    return {
      plan: SubscriptionFormatter.plan(
        plan as unknown as Record<string, unknown>,
      ),
    };
  }

  @Post()
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

    // If entitlements were provided, patch them after creation
    if (dto.entitlements && plan['_id']) {
      const created = await this.planRepository.findByPublicId(
        plan['_id'] as string,
      );
      if (created) {
        const updated = await this.planRepository.update(created.id, {
          entitlements: dto.entitlements,
        });
        return {
          plan: SubscriptionFormatter.plan(
            updated as unknown as Record<string, unknown>,
          ),
        };
      }
    }

    return { plan: SubscriptionFormatter.plan(plan) };
  }

  @Patch(':id')
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ): Promise<{ plan: Record<string, unknown> }> {
    const plan = (await this.commandBus.execute(
      new UpdatePlanCommand(
        id,
        dto.name,
        dto.displayNameAr,
        dto.displayNameEn,
        dto.price,
        dto.currency,
        dto.billingCycle,
        dto.commissionRate,
        dto.features,
        dto.entitlements,
        dto.isDefault,
        dto.isActive,
      ),
    )) as unknown as Record<string, unknown>;
    return { plan: SubscriptionFormatter.plan(plan) };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async setPlanStatus(
    @Param('id') id: string,
    @Body() dto: SetPlanStatusDto,
  ): Promise<{ plan: Record<string, unknown> }> {
    const plan = (await this.commandBus.execute(
      new SetPlanStatusCommand(id, dto.isActive),
    )) as unknown as Record<string, unknown>;
    return { plan: SubscriptionFormatter.plan(plan) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deletePlan(@Param('id') id: string): Promise<{ success: true }> {
    return this.commandBus.execute(new DeletePlanCommand(id));
  }
}
