import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBilingualProductFields1780072261187 implements MigrationInterface {
  name = 'AddBilingualProductFields1780072261187';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Schema changes ────────────────────────────────────────────

    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "mainTitleAr" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "promotionalTitleAr" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unitTypeAr" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "sizeAr" character varying(32)`,
    );

    // ── Data backfill ─────────────────────────────────────────────

    await queryRunner.query(
      `UPDATE products SET "mainTitleAr" = "mainTitle" WHERE "mainTitleAr" IS NULL AND "mainTitle" IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE products SET "promotionalTitleAr" = "promotionalTitle" WHERE "promotionalTitleAr" IS NULL AND "promotionalTitle" IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE products SET "unitTypeAr" = "unitType" WHERE "unitTypeAr" IS NULL AND "unitType" IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE product_variants SET "sizeAr" = size WHERE "sizeAr" IS NULL AND size IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "sizeAr"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "unitTypeAr"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "promotionalTitleAr"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "mainTitleAr"`,
    );
  }
}
