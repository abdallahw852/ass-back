import { MigrationInterface, QueryRunner } from 'typeorm';

export class InventoryAndProductSku1775926278998 implements MigrationInterface {
  name = 'InventoryAndProductSku1775926278998';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "inventory_items" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "supplierId" integer NOT NULL, "productId" integer NOT NULL, "variantId" integer, "sku" character varying(128), "onHand" integer NOT NULL DEFAULT '0', "reservedQty" integer NOT NULL DEFAULT '0', "minStockThreshold" integer NOT NULL DEFAULT '0', "lastMovementAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_f648de032072317ceb9ca82f4a3" UNIQUE ("productId", "variantId"), CONSTRAINT "PK_cf2f451407242e132547ac19169" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b94d2db923c3fcf185c778d3ff" ON "inventory_items" ("_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_movements_reason_enum" AS ENUM('new_purchase', 'customer_return', 'damaged', 'correction', 'stock_audit', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_movements" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "inventoryItemId" integer NOT NULL, "delta" integer NOT NULL, "balanceAfter" integer NOT NULL, "reason" "public"."stock_movements_reason_enum" NOT NULL, "note" text, "actorUserId" integer NOT NULL, "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_57a26b190618550d8e65fb860e7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_90998dfc7c516c867fe6084745" ON "stock_movements" ("_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_769feb209282a3f34e42d89f1d" ON "stock_movements" ("inventoryItemId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "sku" character varying(128)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c44ac33a05b144dd0d9ddcf932" ON "products" ("sku") `,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD CONSTRAINT "FK_4a1e232a660d7d51a13f20099b2" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD CONSTRAINT "FK_3b2d13feb14d9846fe503e45e5d" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_769feb209282a3f34e42d89f1dd" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_769feb209282a3f34e42d89f1dd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP CONSTRAINT "FK_3b2d13feb14d9846fe503e45e5d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP CONSTRAINT "FK_4a1e232a660d7d51a13f20099b2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c44ac33a05b144dd0d9ddcf932"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "sku"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_769feb209282a3f34e42d89f1d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_90998dfc7c516c867fe6084745"`,
    );
    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(`DROP TYPE "public"."stock_movements_reason_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b94d2db923c3fcf185c778d3ff"`,
    );
    await queryRunner.query(`DROP TABLE "inventory_items"`);
  }
}
