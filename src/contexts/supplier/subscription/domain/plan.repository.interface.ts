import { PlanOrmEntity } from '../infrastructure/persistence/plan.orm-entity';

export interface IPlanRepository {
  findAll(): Promise<PlanOrmEntity[]>;
  findAllAdmin(): Promise<PlanOrmEntity[]>;
  findById(id: number): Promise<PlanOrmEntity | null>;
  findByName(name: string): Promise<PlanOrmEntity | null>;
  findByPublicId(publicId: string): Promise<PlanOrmEntity | null>;
  findDefault(): Promise<PlanOrmEntity | null>;
  save(input: Partial<PlanOrmEntity>): Promise<PlanOrmEntity>;
  update(id: number, patch: Partial<PlanOrmEntity>): Promise<PlanOrmEntity>;
  deactivate(id: number): Promise<PlanOrmEntity>;
}

export const PLAN_REPOSITORY = Symbol('PLAN_REPOSITORY');
