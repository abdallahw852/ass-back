import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShippingCostToTradeOrders1780012036961 implements MigrationInterface {
  name = 'AddShippingCostToTradeOrders1780012036961';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trade_orders" ADD "shipping_cost" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trade_orders" DROP COLUMN "shipping_cost"`,
    );
  }
}
