import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTradeAssurance1778942015316 implements MigrationInterface {
  name = 'AddTradeAssurance1778942015316';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_supplier_country"`);
    await queryRunner.query(`DROP INDEX "public"."idx_supplier_type"`);
    await queryRunner.query(`DROP INDEX "public"."idx_supplier_is_verified"`);
    await queryRunner.query(`DROP INDEX "public"."idx_product_cost_price"`);
    await queryRunner.query(`DROP INDEX "public"."idx_product_moq"`);
    await queryRunner.query(`DROP INDEX "public"."idx_product_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_product_status"`);
    await queryRunner.query(
      `CREATE TABLE "supplier_wallets" ("supplier_id" integer NOT NULL, "balance" numeric(12,2) NOT NULL DEFAULT '0', "currency" character varying(8) NOT NULL DEFAULT 'SAR', "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e2a4d960013906adb8c4e3a3782" PRIMARY KEY ("supplier_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_33c426442de5c56a4a0fb417af" ON "supplier_wallets" ("currency") `,
    );
    await queryRunner.query(
      `CREATE TABLE "ledger_entries" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "order_id" integer NOT NULL, "escrow_id" integer, "account_kind" character varying(32) NOT NULL, "account_owner_id" integer, "direction" character varying(8) NOT NULL, "amount" numeric(12,2) NOT NULL, "currency" character varying(8) NOT NULL DEFAULT 'SAR', "kind" character varying(32) NOT NULL, "correlation_id" uuid NOT NULL, "posted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6efcb84411d3f08b08450ae75d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ab3502ade76a4f78e071a1a670" ON "ledger_entries" ("_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d929e48320de9fe7f6ed47478f" ON "ledger_entries" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c35af6152900591ab9c57ffa3a" ON "ledger_entries" ("escrow_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_73b09798f494b50abd79509154" ON "ledger_entries" ("correlation_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "escrows" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "order_id" integer NOT NULL, "supplier_id" integer NOT NULL, "buyer_id" integer NOT NULL, "amount" numeric(12,2) NOT NULL, "currency" character varying(8) NOT NULL DEFAULT 'SAR', "status" character varying(16) NOT NULL DEFAULT 'funded', "provider_ref" character varying(255), "funded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "released_at" TIMESTAMP WITH TIME ZONE, "refunded_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_9cd10ae5b52350c3a20d124f5d3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_5d7896025f014274b96d796eb4" ON "escrows" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_72b537daeedb841ae879176863" ON "escrows" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "disputes" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "order_id" integer NOT NULL, "opened_by_id" integer NOT NULL, "reason" text NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'open', "resolved_by_id" integer, "resolution_note" text, "resolved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3c97580d01c1a4b0b345c42a107" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c92403285c54c5434f2be68e3b" ON "disputes" ("_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0870855d9ec9cb26fecd2955a6" ON "disputes" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_events" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "entity_type" character varying(64) NOT NULL, "entity_id" character varying(255) NOT NULL, "event_name" character varying(128) NOT NULL, "actor_id" integer, "actor_role" character varying(32), "payload" jsonb NOT NULL DEFAULT '{}', "correlation_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_910f64d901a5c3e9878f0d4a407" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b479d54a76137d2fae3cd430b9" ON "audit_events" ("_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e97eb59ad6b44182dbd1570151" ON "audit_events" ("entity_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_24530679b55965efb260852679" ON "audit_events" ("entity_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_488013b2a3ba5ea0fc0f7c1945" ON "audit_events" ("correlation_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "idempotency_keys" ("key" character varying(255) NOT NULL, "user_id" integer NOT NULL, "route" character varying(512) NOT NULL, "request_hash" character varying(64) NOT NULL, "response" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_idempotency_keys" PRIMARY KEY ("key"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_idempotency_keys_user_id" ON "idempotency_keys" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" ADD "carrier" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" ADD "tracking_number" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" ADD "shipped_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" ADD "delivered_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" ADD "released_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" ADD "auto_release_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" ADD "protection_window_days" integer NOT NULL DEFAULT '14'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_805925c9d2cb8b74a5ea255e1d" ON "trade_orders" ("auto_release_at") `,
    );

    // Data migration: rename legacy fulfilled status to completed
    await queryRunner.query(
      `UPDATE "trade_orders" SET "status" = 'completed' WHERE "status" = 'fulfilled'`,
    );

    // webhook_events for Paymob dedup
    await queryRunner.query(
      `CREATE TABLE "webhook_events" ("id" SERIAL NOT NULL, "provider" character varying(64) NOT NULL, "event_id" character varying(128) NOT NULL, "signature_verified" boolean NOT NULL DEFAULT false, "payload" jsonb NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_webhook_events" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_webhook_events_event_id" ON "webhook_events" ("event_id") `,
    );

    // invoices
    await queryRunner.query(
      `CREATE TABLE "invoices" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "order_id" integer NOT NULL, "invoice_number" character varying(64) NOT NULL, "pdf_url" character varying(1024), "total" numeric(12,2) NOT NULL, "currency" character varying(8) NOT NULL DEFAULT 'SAR', "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_invoices" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_invoices_id" ON "invoices" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_invoices_order_id" ON "invoices" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_invoices_invoice_number" ON "invoices" ("invoice_number") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "trade_orders" SET "status" = 'fulfilled' WHERE "status" = 'completed'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_invoices_invoice_number"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_invoices_order_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_invoices_id"`);
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_webhook_events_event_id"`,
    );
    await queryRunner.query(`DROP TABLE "webhook_events"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_idempotency_keys_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_805925c9d2cb8b74a5ea255e1d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" DROP COLUMN "protection_window_days"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" DROP COLUMN "auto_release_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" DROP COLUMN "released_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" DROP COLUMN "delivered_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" DROP COLUMN "shipped_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" DROP COLUMN "tracking_number"`,
    );
    await queryRunner.query(`ALTER TABLE "trade_orders" DROP COLUMN "carrier"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_488013b2a3ba5ea0fc0f7c1945"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_24530679b55965efb260852679"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e97eb59ad6b44182dbd1570151"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b479d54a76137d2fae3cd430b9"`,
    );
    await queryRunner.query(`DROP TABLE "audit_events"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0870855d9ec9cb26fecd2955a6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c92403285c54c5434f2be68e3b"`,
    );
    await queryRunner.query(`DROP TABLE "disputes"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_72b537daeedb841ae879176863"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5d7896025f014274b96d796eb4"`,
    );
    await queryRunner.query(`DROP TABLE "escrows"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_73b09798f494b50abd79509154"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c35af6152900591ab9c57ffa3a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d929e48320de9fe7f6ed47478f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ab3502ade76a4f78e071a1a670"`,
    );
    await queryRunner.query(`DROP TABLE "ledger_entries"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_33c426442de5c56a4a0fb417af"`,
    );
    await queryRunner.query(`DROP TABLE "supplier_wallets"`);
    await queryRunner.query(
      `CREATE INDEX "idx_product_status" ON "products" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_created_at" ON "products" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_moq" ON "products" ("moq") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_cost_price" ON "products" ("costPrice") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_supplier_is_verified" ON "suppliers" ("isVerified") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_supplier_type" ON "suppliers" ("supplierType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_supplier_country" ON "suppliers" ("country") `,
    );
  }
}
