import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCategoryTreeQuery } from '../get-category-tree.query';
import type { ICategoryRepository } from '../../../domain/category.repository.interface';
import { CATEGORY_REPOSITORY } from '../../../domain/category.repository.interface';
import { CategoryMapper } from '../../../infrastructure/mappers/category.mapper';

interface CategoryNode extends Record<string, unknown> {
  children: CategoryNode[];
}

@QueryHandler(GetCategoryTreeQuery)
export class GetCategoryTreeHandler implements IQueryHandler<GetCategoryTreeQuery> {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(_query: GetCategoryTreeQuery) {
    const all = await this.categoryRepo.findAll(true);

    // Build an in-memory tree: group children under their parent
    const byId = new Map<
      number | null,
      { internalId: number; node: CategoryNode }[]
    >();
    for (const cat of all) {
      if (cat.internalId === null) continue;
      const node: CategoryNode = {
        ...CategoryMapper.toResponse(cat),
        children: [],
      };
      const parentKey = cat.parentId;
      if (!byId.has(parentKey)) byId.set(parentKey, []);
      byId.get(parentKey)!.push({ internalId: cat.internalId, node });
    }

    // Recursively attach children
    const attach = (
      items: { internalId: number; node: CategoryNode }[],
    ): CategoryNode[] => {
      return items.map((item) => {
        const children = byId.get(item.internalId) ?? [];
        item.node.children = attach(children);
        return item.node;
      });
    };

    const roots = byId.get(null) ?? [];
    return { categories: attach(roots) };
  }
}
