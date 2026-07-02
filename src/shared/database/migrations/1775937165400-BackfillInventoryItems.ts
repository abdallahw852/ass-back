import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-time backfill: create inventory_items rows for every product that was
 * created before the inventory context existed.
 *
 * Strategy:
 *  - Products WITH variants → one inventory_items row per variant,
 *    seeding onHand from product_variants.quantity.
 *  - Products WITHOUT variants → one inventory_items row per product,
 *    seeding onHand from products.stockQuantity.
 *
 * The INSERT is idempotent (WHERE NOT EXISTS) so re-running is safe.
 */
export class BackfillInventoryItems1775937165400 implements MigrationInterface {
  name = 'BackfillInventoryItems1775937165400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Products that have variants → one row per variant
    await queryRunner.query(`
      INSERT INTO inventory_items
        ("_id", "supplierId", "productId", "variantId", "sku", "onHand", "reservedQty", "minStockThreshold")
      SELECT
        gen_random_uuid(),
        p."supplierId",
        p.id,
        v.id,
        v.sku,
        COALESCE(v.quantity, 0),
        0,
        0
      FROM products p
      JOIN product_variants v ON v."productId" = p.id
      WHERE NOT EXISTS (
        SELECT 1 FROM inventory_items i
        WHERE i."productId" = p.id AND i."variantId" = v.id
      )
    `);

    // Products without variants → one row per product
    await queryRunner.query(`
      INSERT INTO inventory_items
        ("_id", "supplierId", "productId", "variantId", "sku", "onHand", "reservedQty", "minStockThreshold")
      SELECT
        gen_random_uuid(),
        p."supplierId",
        p.id,
        NULL,
        p.sku,
        COALESCE(p."stockQuantity", 0),
        0,
        0
      FROM products p
      WHERE NOT EXISTS (
        SELECT 1 FROM product_variants v WHERE v."productId" = p.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM inventory_items i
        WHERE i."productId" = p.id AND i."variantId" IS NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove only backfilled rows: inventory items with no movement history
    // that belong to products which existed before this migration ran.
    // Products created after the migration have their inventory items managed
    // by the application event listener and must not be touched here.
    await queryRunner.query(`
      DELETE FROM inventory_items i
      USING products p
      WHERE i."productId" = p.id
        AND i."lastMovementAt" IS NULL
        AND p."createdAt" < to_timestamp(1775937165)
    `);
  }
}
