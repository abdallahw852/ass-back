import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShippingFeature1779134160690 implements MigrationInterface {
  name = 'AddShippingFeature1779134160690';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_webhook_events_event_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_invoices_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_invoices_order_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_invoices_invoice_number"`,
    );
    await queryRunner.query(
      `CREATE TABLE "shipments" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "order_id" integer NOT NULL, "carrier" character varying(64) NOT NULL, "tracking_number" character varying(128) NOT NULL, "tracking_url" character varying(512) NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'label_created', "events" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6deda4532ac542a93eab214b564" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a9bffeeff4861e9334f59dd55c" ON "shipments" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e86fac2a18a75dcb82bfbb23f4" ON "shipments" ("order_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" ADD "shipping_method" character varying(16) NOT NULL DEFAULT 'supplier'`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" ADD "tracking_url" character varying(512)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_supplier_groups" ADD "shipping_method" character varying(16) NOT NULL DEFAULT 'supplier'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('inquiry_received', 'inquiry_replied', 'inquiry_closed', 'order_paid', 'order_shipped', 'order_delivered', 'order_released', 'order_completed', 'order_disputed', 'order_refunded', 'order_cancelled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
    // Ensure webhook_events and invoices exist — AddTradeAssurance may have been
    // recorded in the migrations table without its SQL having executed on this DB.
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "webhook_events" ("id" SERIAL NOT NULL, "provider" character varying(64) NOT NULL, "event_id" character varying(128) NOT NULL, "signature_verified" boolean NOT NULL DEFAULT false, "payload" jsonb NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_webhook_events" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "invoices" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "order_id" integer NOT NULL, "invoice_number" character varying(64) NOT NULL, "pdf_url" character varying(1024), "total" numeric(12,2) NOT NULL, "currency" character varying(8) NOT NULL DEFAULT 'SAR', "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_invoices" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_eca7d9af1d5bb2184a201ed250" ON "webhook_events" ("event_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_edb6c78a791429f8d510abd262" ON "invoices" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ea83c3b911906a3578de2340fd" ON "invoices" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_d8f8d3788694e1b3f96c42c36f" ON "invoices" ("invoice_number") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8f8d3788694e1b3f96c42c36f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ea83c3b911906a3578de2340fd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_edb6c78a791429f8d510abd262"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eca7d9af1d5bb2184a201ed250"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('inquiry_received', 'inquiry_replied', 'inquiry_closed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_supplier_groups" DROP COLUMN "shipping_method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" DROP COLUMN "tracking_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" DROP COLUMN "shipping_method"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e86fac2a18a75dcb82bfbb23f4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a9bffeeff4861e9334f59dd55c"`,
    );
    await queryRunner.query(`DROP TABLE "shipments"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_invoices_invoice_number" ON "invoices" ("invoice_number") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_invoices_order_id" ON "invoices" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_invoices_id" ON "invoices" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_webhook_events_event_id" ON "webhook_events" ("event_id") `,
    );
  }
}
