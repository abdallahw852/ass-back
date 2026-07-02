import { Category } from '../../domain/category.entity';
import { CategoryOrmEntity } from '../persistence/category.orm-entity';

export class CategoryMapper {
  static toDomain(orm: CategoryOrmEntity): Category {
    return Category.reconstitute({
      _id: orm._id,
      internalId: orm.id,
      name: orm.name,
      nameAr: orm.nameAr,
      slug: orm.slug,
      parentId: orm.parentId,
      imageUrl: orm.imageUrl,
      iconUrl: orm.iconUrl,
      description: orm.description,
      sortOrder: orm.sortOrder,
      isActive: orm.isActive,
      level: orm.level,
      productCount: orm.productCount,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: Category): CategoryOrmEntity {
    const orm = new CategoryOrmEntity();
    if (domain.internalId !== null) orm.id = domain.internalId;
    orm._id = domain.id;
    orm.name = domain.name;
    orm.nameAr = domain.nameAr;
    orm.slug = domain.slug;
    orm.parentId = domain.parentId;
    orm.imageUrl = domain.imageUrl;
    orm.iconUrl = domain.iconUrl;
    orm.description = domain.description;
    orm.sortOrder = domain.sortOrder;
    orm.isActive = domain.isActive;
    orm.level = domain.level;
    orm.productCount = domain.productCount;
    return orm;
  }

  static toResponse(domain: Category): Record<string, unknown> {
    const base: Record<string, unknown> = {
      _id: domain.id,
      name: domain.name,
      slug: domain.slug,
      sortOrder: domain.sortOrder,
      isActive: domain.isActive,
      level: domain.level,
      productCount: domain.productCount,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };

    const nullable: Record<string, unknown> = {
      nameAr: domain.nameAr,
      imageUrl: domain.imageUrl,
      iconUrl: domain.iconUrl,
      description: domain.description,
    };
    for (const [k, v] of Object.entries(nullable)) {
      if (v !== null) base[k] = v;
    }

    return base;
  }
}
