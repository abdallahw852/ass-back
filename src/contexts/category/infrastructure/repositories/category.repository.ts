import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../domain/category.entity';
import type { ICategoryRepository } from '../../domain/category.repository.interface';
import { CategoryOrmEntity } from '../persistence/category.orm-entity';
import { CategoryMapper } from '../mappers/category.mapper';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(
    @InjectRepository(CategoryOrmEntity, 'write')
    private readonly repo: Repository<CategoryOrmEntity>,
  ) {}

  async findByPublicId(id: string): Promise<Category | null> {
    const orm = await this.repo.findOne({ where: { _id: id } });
    return orm ? CategoryMapper.toDomain(orm) : null;
  }

  async findBySlug(
    slug: string,
    parentId?: number | null,
  ): Promise<Category | null> {
    const orm = await this.repo.findOne({
      where: { slug, parentId: parentId ?? undefined },
    });
    return orm ? CategoryMapper.toDomain(orm) : null;
  }

  async findByInternalId(id: number): Promise<Category | null> {
    const orm = await this.repo.findOne({ where: { id } });
    return orm ? CategoryMapper.toDomain(orm) : null;
  }

  async findAll(onlyActive = true): Promise<Category[]> {
    const where = onlyActive ? { isActive: true } : {};
    const orms = await this.repo.find({
      where,
      order: { level: 'ASC', sortOrder: 'ASC', name: 'ASC' },
    });
    return orms.map((o) => CategoryMapper.toDomain(o));
  }

  async findChildren(
    parentId: number | null,
    onlyActive = true,
  ): Promise<Category[]> {
    const where: Record<string, unknown> = {
      parentId: parentId ?? undefined,
    };
    if (onlyActive) where.isActive = true;
    const orms = await this.repo.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return orms.map((o) => CategoryMapper.toDomain(o));
  }

  async save(category: Category): Promise<Category> {
    const orm = CategoryMapper.toOrm(category);
    const saved = await this.repo.save(orm);
    return CategoryMapper.toDomain(saved);
  }

  async update(category: Category): Promise<Category> {
    const orm = CategoryMapper.toOrm(category);
    const saved = await this.repo.save(orm);
    return CategoryMapper.toDomain(saved);
  }

  async softDelete(internalId: number): Promise<void> {
    await this.repo.softDelete(internalId);
  }
}
