import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchFilterFields1778500000000 implements MigrationInterface {
  name = 'AddSearchFilterFields1778500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Bilingual product text
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "nameAr" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "descriptionAr" text`,
    );

    // Supplier type for filtering
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "supplierType" character varying(32)`,
    );

    // Search performance indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_product_cost_price" ON "products" ("costPrice")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_product_moq" ON "products" ("moq")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_product_created_at" ON "products" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_product_status" ON "products" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_supplier_country" ON "suppliers" ("country")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_supplier_type" ON "suppliers" ("supplierType")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_supplier_is_verified" ON "suppliers" ("isVerified")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_supplier_is_verified"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_supplier_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_supplier_country"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_moq"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_cost_price"`);
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "supplierType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "descriptionAr"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "nameAr"`,
    );
  }
}
