import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlatformPlanIdToPlans1775310410585 implements MigrationInterface {
  name = 'AddPlatformPlanIdToPlans1775310410585';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plans" ADD "platformPlanId" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "platformPlanId"`);
  }
}
