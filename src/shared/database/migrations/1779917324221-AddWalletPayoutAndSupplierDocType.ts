import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletPayoutAndSupplierDocType1779917324221 implements MigrationInterface {
  name = 'AddWalletPayoutAndSupplierDocType1779917324221';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "withdrawal_requests" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "supplier_id" integer NOT NULL, "amount" numeric(12,2) NOT NULL, "currency" character varying(8) NOT NULL DEFAULT 'SAR', "status" character varying(32) NOT NULL DEFAULT 'pending', "payout_method_id" character varying(36) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e1b3734a3f3cbd46bf0ad7eedb6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_40e9b14d90e41e2271cc569a15" ON "withdrawal_requests" ("_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1db92cde801ddac74d4f659e79" ON "withdrawal_requests" ("supplier_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payout_methods" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "supplier_id" integer NOT NULL, "type" character varying(32) NOT NULL, "bank_name" character varying(128) NOT NULL, "account_name" character varying(128) NOT NULL, "iban" character varying(64) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cedb0a9e379a9a0a16ad050527e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_790ffb6a096856b60153b429a4" ON "payout_methods" ("_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_562d5d2c82207542ff9f1da810" ON "payout_methods" ("supplier_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_562d5d2c82207542ff9f1da810"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_790ffb6a096856b60153b429a4"`,
    );
    await queryRunner.query(`DROP TABLE "payout_methods"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1db92cde801ddac74d4f659e79"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_40e9b14d90e41e2271cc569a15"`,
    );
    await queryRunner.query(`DROP TABLE "withdrawal_requests"`);
  }
}
