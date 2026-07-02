import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordOtpVerification1776466676966 implements MigrationInterface {
  name = 'AddPasswordOtpVerification1776466676966';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new columns first so backfill can reference them
    await queryRunner.query(
      `ALTER TABLE "users" ADD "passwordHash" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "requiresPasswordSetup" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "verifiedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "lastPasswordChangedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_otp_codes" ADD "purpose" character varying(32) NOT NULL DEFAULT 'signup_verification'`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_otp_codes" ADD "userId" integer`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_otp_email_purpose" ON "auth_otp_codes" ("email", "purpose")`,
    );

    // 2. Backfill: carry forward verification history from the old is_verified boolean
    await queryRunner.query(`
      UPDATE users
         SET "verifiedAt" = "updatedAt"
       WHERE "isVerified" = true AND "verifiedAt" IS NULL
    `);

    // 3. Backfill: mark pre-migration accounts as requiring password setup
    await queryRunner.query(`
      UPDATE users
         SET "requiresPasswordSetup" = true
       WHERE "passwordHash" IS NULL
    `);

    // 4. Backfill: legacy OTP rows predate the purpose column
    await queryRunner.query(`
      UPDATE auth_otp_codes SET purpose = 'signup_verification' WHERE purpose IS NULL
    `);

    // 5. Drop the old boolean column now that the data has been migrated
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isVerified"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."ix_otp_email_purpose"`);
    await queryRunner.query(
      `ALTER TABLE "auth_otp_codes" DROP COLUMN "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_otp_codes" DROP COLUMN "purpose"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "lastPasswordChangedAt"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verifiedAt"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "requiresPasswordSetup"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordHash"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isVerified" boolean NOT NULL DEFAULT false`,
    );
  }
}
