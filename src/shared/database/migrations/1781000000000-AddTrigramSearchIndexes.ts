import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrigramSearchIndexes1781000000000 implements MigrationInterface {
  name = 'AddTrigramSearchIndexes1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable the pg_trgm extension (safe to run on existing DBs)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // Products — searched by catalog browse and supplier product management
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_trgm_products_name" ON "products" USING gin (name gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_trgm_products_description" ON "products" USING gin (description gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_trgm_products_main_title" ON "products" USING gin ("mainTitle" gin_trgm_ops)`,
    );

    // Suppliers — searched by the public supplier directory
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_trgm_suppliers_company" ON "suppliers" USING gin ("companyName" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_trgm_suppliers_company_ar" ON "suppliers" USING gin ("companyNameAr" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_trgm_suppliers_company_en" ON "suppliers" USING gin ("companyNameEn" gin_trgm_ops)`,
    );

    // Users — searched by the client list and admin user management
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_trgm_users_name" ON "users" USING gin (name gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_trgm_users_email" ON "users" USING gin (email gin_trgm_ops)`,
    );

    // Inventory items — searched by SKU and product name
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_trgm_inventory_sku" ON "inventory_items" USING gin (sku gin_trgm_ops)`,
    );

    // RFQs — searched by product name and message
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_trgm_rfqs_product_name" ON "rfqs" USING gin ("productName" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_trgm_rfqs_message" ON "rfqs" USING gin (message gin_trgm_ops)`,
    );

    // Trade orders — searched by reference number
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_trgm_trade_orders_ref" ON "trade_orders" USING gin (reference_number gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_trgm_trade_orders_ref"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_trgm_rfqs_message"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_trgm_rfqs_product_name"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_trgm_inventory_sku"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_trgm_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_trgm_users_name"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_trgm_suppliers_company_en"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_trgm_suppliers_company_ar"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_trgm_suppliers_company"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_trgm_products_main_title"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_trgm_products_description"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_trgm_products_name"`);
    // Note: we intentionally do NOT drop the pg_trgm extension in down()
    // because other applications on the same DB cluster might rely on it.
  }
}
