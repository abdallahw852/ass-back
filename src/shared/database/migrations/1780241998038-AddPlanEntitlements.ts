import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanEntitlements1780241998038 implements MigrationInterface {
  name = 'AddPlanEntitlements1780241998038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plans" ADD "entitlements" jsonb NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "entitlements"`);
  }
}
