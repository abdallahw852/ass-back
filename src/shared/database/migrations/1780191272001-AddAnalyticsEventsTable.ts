import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnalyticsEventsTable1780191272001 implements MigrationInterface {
  name = 'AddAnalyticsEventsTable1780191272001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" character varying(64) NOT NULL, "name" character varying(128) NOT NULL, "description" text, CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("id" SERIAL NOT NULL, "role" character varying(64) NOT NULL, "module" character varying(64) NOT NULL, "action" character varying(64) NOT NULL, "allowed" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_66f92d5287875ab59385d008d0" ON "role_permissions" ("role", "module", "action") `,
    );
    await queryRunner.query(
      `CREATE TABLE "analytics_events" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "eventType" character varying(64) NOT NULL, "path" character varying(512) NOT NULL, "userId" integer, "sessionId" character varying(128) NOT NULL, "ip" character varying(64), "country" character varying(8), "referrer" character varying(512), "userAgent" text, "metadata" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5d643d67a09b55653e98616f421" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c6ffc2d66f2559a405b44595ec" ON "analytics_events" ("_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c6ffc2d66f2559a405b44595ec"`,
    );
    await queryRunner.query(`DROP TABLE "analytics_events"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_66f92d5287875ab59385d008d0"`,
    );
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
