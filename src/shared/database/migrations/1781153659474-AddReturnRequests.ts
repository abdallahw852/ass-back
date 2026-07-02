import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReturnRequests1781153659474 implements MigrationInterface {
  name = 'AddReturnRequests1781153659474';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "return_requests" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "order_id" integer NOT NULL, "supplier_id" integer NOT NULL, "buyer_id" integer NOT NULL, "reason" text NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'pending', "rejection_reason" text, "total_amount" numeric(12,2) NOT NULL, "items_count" integer NOT NULL, "currency" character varying(8) NOT NULL DEFAULT 'SAR', "refund_amount" numeric(12,2), "reviewed_by_id" integer, "reviewed_at" TIMESTAMP WITH TIME ZONE, "refunded_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_38714de8942bd9bc3a450a06889" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d3c22916b4d2ba5550daf3a351" ON "return_requests" ("_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c7f39dfc32be2b7be25c139ba0" ON "return_requests" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_593278220272911c28c765afb0" ON "return_requests" ("supplier_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "return_requests" ADD CONSTRAINT "FK_return_requests_order_id" FOREIGN KEY ("order_id") REFERENCES "trade_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "return_requests" ADD CONSTRAINT "FK_return_requests_supplier_id" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "return_requests" DROP CONSTRAINT "FK_return_requests_supplier_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "return_requests" DROP CONSTRAINT "FK_return_requests_order_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_593278220272911c28c765afb0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c7f39dfc32be2b7be25c139ba0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d3c22916b4d2ba5550daf3a351"`,
    );
    await queryRunner.query(`DROP TABLE "return_requests"`);
  }
}
