import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixInventoryUniqueConstraint1776001647528 implements MigrationInterface {
  name = 'FixInventoryUniqueConstraint1776001647528';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP CONSTRAINT "UQ_f648de032072317ceb9ca82f4a3"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inventory_product_variant" ON "inventory_items" ("productId", "variantId") WHERE "variantId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inventory_product_no_variant" ON "inventory_items" ("productId") WHERE "variantId" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_inventory_product_no_variant"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_inventory_product_variant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD CONSTRAINT "UQ_f648de032072317ceb9ca82f4a3" UNIQUE ("productId", "variantId")`,
    );
  }
}
