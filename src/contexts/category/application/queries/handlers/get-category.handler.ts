import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCategoryQuery } from '../get-category.query';
import type { ICategoryRepository } from '../../../domain/category.repository.interface';
import { CATEGORY_REPOSITORY } from '../../../domain/category.repository.interface';
import { CategoryNotFoundException } from '../../../domain/category.exceptions';
import { CategoryMapper } from '../../../infrastructure/mappers/category.mapper';

@QueryHandler(GetCategoryQuery)
export class GetCategoryHandler implements IQueryHandler<GetCategoryQuery> {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(query: GetCategoryQuery) {
    // Accept either a UUID (_id) or a slug
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        query.slugOrId,
      );

    const category = isUuid
      ? await this.categoryRepo.findByPublicId(query.slugOrId)
      : await this.categoryRepo.findBySlug(query.slugOrId);

    if (!category) {
      throw new CategoryNotFoundException(query.slugOrId);
    }

    return { category: CategoryMapper.toResponse(category) };
  }
}
