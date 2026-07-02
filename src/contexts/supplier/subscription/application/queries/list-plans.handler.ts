import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListPlansQuery } from './list-plans.query';
import { PLAN_REPOSITORY } from '../../domain/plan.repository.interface';
import type { IPlanRepository } from '../../domain/plan.repository.interface';
import { PlanOrmEntity } from '../../infrastructure/persistence/plan.orm-entity';

@QueryHandler(ListPlansQuery)
export class ListPlansHandler implements IQueryHandler<
  ListPlansQuery,
  PlanOrmEntity[]
> {
  constructor(
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
  ) {}

  async execute(): Promise<PlanOrmEntity[]> {
    return this.planRepository.findAll();
  }
}
