import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCheckoutSessionsAddTradeOrders1777154873910 implements MigrationInterface {
  name = 'RemoveCheckoutSessionsAddTradeOrders1777154873910';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "checkout_sessions" CASCADE;`,
    );
    await queryRunner.query(
      `CREATE TABLE "trade_orders" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "reference_number" character varying(32), "buyer_id" integer NOT NULL, "supplier_id" integer NOT NULL, "lines" jsonb NOT NULL DEFAULT '[]', "subtotal" numeric(12,2) NOT NULL, "currency" character varying(8) NOT NULL DEFAULT 'SAR', "status" character varying(32) NOT NULL DEFAULT 'pending_payment', "payment_intent_id" character varying(255), "paymob_order_id" character varying(255), "cart_item_ids" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_acf330da1046c23ace3709fe393" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_955701bdac38dd0a023f8f4680" ON "trade_orders" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_eaaa6651df967bd6ebb07a2315" ON "trade_orders" ("reference_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dfd80c0ca809888358f8f8e551" ON "trade_orders" ("paymob_order_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dfd80c0ca809888358f8f8e551"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eaaa6651df967bd6ebb07a2315"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_955701bdac38dd0a023f8f4680"`,
    );
    await queryRunner.query(`DROP TABLE "trade_orders"`);
  }
}
