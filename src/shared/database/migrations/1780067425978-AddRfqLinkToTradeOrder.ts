import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRfqLinkToTradeOrder1780067425978 implements MigrationInterface {
  name = 'AddRfqLinkToTradeOrder1780067425978';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trade_orders" ADD "rfq_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders" ADD "client_secret" character varying(512)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trade_orders" DROP COLUMN "client_secret"`,
    );
    await queryRunner.query(`ALTER TABLE "trade_orders" DROP COLUMN "rfq_id"`);
  }
}
