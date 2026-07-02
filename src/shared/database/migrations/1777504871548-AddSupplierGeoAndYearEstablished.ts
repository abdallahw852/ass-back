import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierGeoAndYearEstablished1777504871548 implements MigrationInterface {
  name = 'AddSupplierGeoAndYearEstablished1777504871548';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."login_activities_status_enum" AS ENUM('success', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "login_activities" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "userId" integer NOT NULL, "ipAddress" character varying(45) NOT NULL, "location" character varying(255), "userAgent" text NOT NULL, "device" character varying(128) NOT NULL, "status" "public"."login_activities_status_enum" NOT NULL, "failureReason" character varying(255), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5e930c4a22ae21222fcae279d2a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3e92816ccfc2daed2d9d73cf0f" ON "login_activities" ("_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c377206365d1e5b49abc060a68" ON "login_activities" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_login_activities_user_created" ON "login_activities" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD "yearEstablished" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD "latitude" numeric(9,6)`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD "longitude" numeric(9,6)`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD "supplierCode" character varying(32)`,
    );
    await queryRunner.query(
      `UPDATE "suppliers" SET "supplierCode" = 'Sup-' || EXTRACT(YEAR FROM "createdAt")::text || '-' || LPAD("id"::text, 5, '0') WHERE "supplierCode" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ed36b87b45ecba92cd52378eb7" ON "suppliers" ("supplierCode") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ed36b87b45ecba92cd52378eb7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN "supplierCode"`,
    );
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN "longitude"`);
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN "latitude"`);
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN "yearEstablished"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."ix_login_activities_user_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c377206365d1e5b49abc060a68"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3e92816ccfc2daed2d9d73cf0f"`,
    );
    await queryRunner.query(`DROP TABLE "login_activities"`);
    await queryRunner.query(
      `DROP TYPE "public"."login_activities_status_enum"`,
    );
  }
}
