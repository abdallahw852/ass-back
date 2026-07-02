import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserOnboardingCompletedAt1780893746859 implements MigrationInterface {
  name = 'AddUserOnboardingCompletedAt1780893746859';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "onboardingCompletedAt" TIMESTAMP WITH TIME ZONE`,
    );

    // Backfill so existing finished accounts stay blocked from re-registering.
    // Buyers/admins: email verification is the end of their onboarding.
    await queryRunner.query(`
            UPDATE "users"
            SET "onboardingCompletedAt" = "verifiedAt"
            WHERE "verifiedAt" IS NOT NULL AND "role" <> 'supplier'
        `);
    // Suppliers: only those with an active subscription are treated as
    // complete; suppliers without one stay NULL so they can resume/re-register.
    await queryRunner.query(`
            UPDATE "users" u
            SET "onboardingCompletedAt" = COALESCE(s."updatedAt", u."verifiedAt")
            FROM "suppliers" s
            JOIN "subscriptions" sub
              ON sub."supplierId" = s."id" AND sub."status" = 'active'
            WHERE s."userId" = u."id"
              AND u."role" = 'supplier'
              AND u."verifiedAt" IS NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "onboardingCompletedAt"`,
    );
  }
}
