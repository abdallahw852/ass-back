import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropQuotationUniqueConstraint1780069351284 implements MigrationInterface {
  name = 'DropQuotationUniqueConstraint1780069351284';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_25a12d2cc354c7dae1109d4eaa"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_25a12d2cc354c7dae1109d4eaa" ON "quotations" ("rfqId", "supplierId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_25a12d2cc354c7dae1109d4eaa"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_25a12d2cc354c7dae1109d4eaa" ON "quotations" ("rfqId", "supplierId") `,
    );
  }
}
