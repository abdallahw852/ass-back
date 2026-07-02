import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserStatusAndWithdrawalRejectionReason1780170688529 implements MigrationInterface {
  name = 'AddUserStatusAndWithdrawalRejectionReason1780170688529';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "withdrawal_requests" ADD "rejection_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "status" character varying(16) NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD "rejectionReason" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN "rejectionReason"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "withdrawal_requests" DROP COLUMN "rejection_reason"`,
    );
  }
}
