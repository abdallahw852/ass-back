import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserCountry1777719532954 implements MigrationInterface {
  name = 'AddUserCountry1777719532954';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "country" character varying(8)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_82d2ea5f3f8a99449e541918b5" ON "users" ("country") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_82d2ea5f3f8a99449e541918b5"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "country"`);
  }
}
