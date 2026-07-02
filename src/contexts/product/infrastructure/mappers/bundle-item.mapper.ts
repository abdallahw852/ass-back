import { BundleItem } from '../../domain/product-group.entity';
import { ProductBundleItemOrmEntity } from '../persistence/product-bundle-item.orm-entity';

/**
 * Maps between the {@link BundleItem} domain entity and the
 * {@link ProductBundleItemOrmEntity} persistence representation.
 */
export class BundleItemMapper {
  /** Reconstitute a domain entity from an ORM row. */
  static toDomain(orm: ProductBundleItemOrmEntity): BundleItem {
    return BundleItem.reconstitute({
      _id: orm._id,
      internalId: orm.id,
      parentProductId: orm.parentProductId,
      childProductId: orm.childProductId,
      createdAt: orm.createdAt,
    });
  }

  /**
   * Map a domain entity to an ORM entity for persistence.
   *
   * When the bundle item already has an `internalId`, the `id` column
   * is set so TypeORM performs an UPDATE rather than an INSERT.
   */
  static toOrm(domain: BundleItem): ProductBundleItemOrmEntity {
    const orm = new ProductBundleItemOrmEntity();
    if (domain.internalId !== null) orm.id = domain.internalId;
    orm._id = domain.id;
    if (domain.parentProductId !== null)
      orm.parentProductId = domain.parentProductId;
    orm.childProductId = domain.childProductId;
    orm.createdAt = domain.createdAt;
    return orm;
  }
}
