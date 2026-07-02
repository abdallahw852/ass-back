import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductPlatformShipping1779470898346 implements MigrationInterface {
  name = 'AddProductPlatformShipping1779470898346';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "vendor_order_id" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "usePlatformShipping" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weightKg" numeric(8,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" ADD COLUMN IF NOT EXISTS "platform_shipping_snapshot" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_supplier_groups" ADD COLUMN IF NOT EXISTS "selected_shipping_option" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipments" ALTER COLUMN "tracking_number" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipments" ALTER COLUMN "tracking_url" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_39c4b6b9e5bba9c2c2764e0f93" ON "shipments" ("vendor_order_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_39c4b6b9e5bba9c2c2764e0f93"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipments" ALTER COLUMN "tracking_url" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipments" ALTER COLUMN "tracking_number" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_supplier_groups" DROP COLUMN "selected_shipping_option"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" DROP COLUMN "platform_shipping_snapshot"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "weightKg"`);
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "usePlatformShipping"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipments" DROP COLUMN "vendor_order_id"`,
    );
  }
}
