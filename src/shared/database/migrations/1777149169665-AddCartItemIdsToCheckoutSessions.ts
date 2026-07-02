import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCartItemIdsToCheckoutSessions1777149169665 implements MigrationInterface {
  name = 'AddCartItemIdsToCheckoutSessions1777149169665';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "checkout_sessions" ADD "cart_item_ids" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "checkout_sessions" DROP COLUMN "cart_item_ids"`,
    );
  }
}
