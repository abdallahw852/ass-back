import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManualClients1781150809933 implements MigrationInterface {
  name = 'AddManualClients1781150809933';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."manual_clients_country_enum" AS ENUM('SA', 'EG', 'AE', 'KW', 'QA', 'BH', 'OM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."manual_clients_classification_enum" AS ENUM('AUTHORIZED_AGENT', 'VIP', 'PERMANENT', 'NEW')`,
    );
    await queryRunner.query(
      `CREATE TABLE "manual_clients" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "supplierId" integer NOT NULL, "companyName" character varying(255) NOT NULL, "fullName" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "phone" character varying(32) NOT NULL, "country" "public"."manual_clients_country_enum" NOT NULL, "classification" "public"."manual_clients_classification_enum" NOT NULL DEFAULT 'NEW', "creditLimitSar" numeric(12,2), "paymentTerms" character varying(64), "notes" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bb7949bb34e55f1bce7459c7139" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_0b740c2bd1bd26a6e1bcd95d9f" ON "manual_clients" ("_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "manual_clients" ADD CONSTRAINT "FK_933b760ab01dd1f97f63f0ccf6d" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "manual_clients" DROP CONSTRAINT "FK_933b760ab01dd1f97f63f0ccf6d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0b740c2bd1bd26a6e1bcd95d9f"`,
    );
    await queryRunner.query(`DROP TABLE "manual_clients"`);
    await queryRunner.query(
      `DROP TYPE "public"."manual_clients_classification_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."manual_clients_country_enum"`);
  }
}
