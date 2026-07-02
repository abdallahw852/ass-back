import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCategoryChildrenQuery } from '../get-category-children.query';
import type { ICategoryRepository } from '../../../domain/category.repository.interface';
import { CATEGORY_REPOSITORY } from '../../../domain/category.repository.interface';
import { CategoryNotFoundException } from '../../../domain/category.exceptions';
import { CategoryMapper } from '../../../infrastructure/mappers/category.mapper';

@QueryHandler(GetCategoryChildrenQuery)
export class GetCategoryChildrenHandler implements IQueryHandler<GetCategoryChildrenQuery> {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(query: GetCategoryChildrenQuery) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        query.slugOrId,
      );

    const parent = isUuid
      ? await this.categoryRepo.findByPublicId(query.slugOrId)
      : await this.categoryRepo.findBySlug(query.slugOrId);

    if (!parent || !parent.internalId) {
      throw new CategoryNotFoundException(query.slugOrId);
    }

    const children = await this.categoryRepo.findChildren(parent.internalId);
    return {
      category: CategoryMapper.toResponse(parent),
      children: children.map((c) => CategoryMapper.toResponse(c)),
    };
  }
}
