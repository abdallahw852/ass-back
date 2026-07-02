import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubscriptionUpgradeCancel1775302700000 implements MigrationInterface {
  name = 'SubscriptionUpgradeCancel1775302700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "isDefault" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_plans_one_default" ON "plans" ("isDefault") WHERE "isDefault" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_plans_one_default"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" DROP COLUMN IF EXISTS "isDefault"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "cancelAtPeriodEnd"`,
    );
  }
}
