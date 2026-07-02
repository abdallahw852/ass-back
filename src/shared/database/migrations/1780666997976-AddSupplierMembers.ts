import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierMembers1780666997976 implements MigrationInterface {
  name = 'AddSupplierMembers1780666997976';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "supplier_members" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "supplier_id" integer NOT NULL, "invited_email" character varying NOT NULL, "invited_name" character varying NOT NULL, "job_role" character varying NOT NULL, "permissions" jsonb NOT NULL, "invite_token" uuid NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'pending', "user_id" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_52619f1885e0a3673b41cc4eb15" UNIQUE ("_id"), CONSTRAINT "PK_95cabae4e1f0c2c7178a642536a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2a7a227369c87179af606396e3" ON "supplier_members" ("invite_token") `,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user', 'supplier', 'buyer', 'supplier_employee')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum_old" AS ENUM('admin', 'user', 'supplier', 'buyer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2a7a227369c87179af606396e3"`,
    );
    await queryRunner.query(`DROP TABLE "supplier_members"`);
  }
}
