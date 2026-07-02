import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListPlansAdminQuery } from './list-plans-admin.query';
import { PLAN_REPOSITORY } from '../../domain/plan.repository.interface';
import type { IPlanRepository } from '../../domain/plan.repository.interface';
import { PlanOrmEntity } from '../../infrastructure/persistence/plan.orm-entity';

@QueryHandler(ListPlansAdminQuery)
export class ListPlansAdminHandler implements IQueryHandler<
  ListPlansAdminQuery,
  PlanOrmEntity[]
> {
  constructor(
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
  ) {}

  execute(): Promise<PlanOrmEntity[]> {
    return this.planRepository.findAllAdmin();
  }
}
