import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeQuotationPaymentTermsNullable1780065679431 implements MigrationInterface {
  name = 'MakeQuotationPaymentTermsNullable1780065679431';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quotations" ALTER COLUMN "paymentTerms" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quotations" ALTER COLUMN "paymentTerms" SET NOT NULL`,
    );
  }
}
