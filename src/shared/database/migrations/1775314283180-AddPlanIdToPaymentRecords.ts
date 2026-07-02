import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanIdToPaymentRecords1775314283180 implements MigrationInterface {
  name = 'AddPlanIdToPaymentRecords1775314283180';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_records" ADD "planId" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_records" DROP COLUMN "planId"`,
    );
  }
}
