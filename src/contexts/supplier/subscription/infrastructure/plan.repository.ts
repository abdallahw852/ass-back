import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPlanRepository } from '../domain/plan.repository.interface';
import { PlanOrmEntity } from './persistence/plan.orm-entity';

@Injectable()
export class PlanRepository implements IPlanRepository {
  constructor(
    @InjectRepository(PlanOrmEntity, 'write')
    private readonly repository: Repository<PlanOrmEntity>,
  ) {}

  findAll(): Promise<PlanOrmEntity[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
  }

  findById(id: number): Promise<PlanOrmEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByName(name: string): Promise<PlanOrmEntity | null> {
    return this.repository.findOne({ where: { name } });
  }

  findByPublicId(publicId: string): Promise<PlanOrmEntity | null> {
    return this.repository.findOne({ where: { _id: publicId } });
  }

  findDefault(): Promise<PlanOrmEntity | null> {
    return this.repository.findOne({ where: { isDefault: true } });
  }

  save(input: Partial<PlanOrmEntity>): Promise<PlanOrmEntity> {
    const entity = this.repository.create(input);
    return this.repository.save(entity);
  }

  findAllAdmin(): Promise<PlanOrmEntity[]> {
    return this.repository.find({ order: { price: 'ASC' } });
  }

  async update(
    id: number,
    patch: Partial<PlanOrmEntity>,
  ): Promise<PlanOrmEntity> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) throw new Error(`Plan ${id} not found`);
    Object.assign(entity, patch);
    return this.repository.save(entity);
  }

  async deactivate(id: number): Promise<PlanOrmEntity> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) throw new Error(`Plan ${id} not found`);
    entity.isActive = false;
    return this.repository.save(entity);
  }
}
