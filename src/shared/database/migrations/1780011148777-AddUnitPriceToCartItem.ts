import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitPriceToCartItem1780011148777 implements MigrationInterface {
  name = 'AddUnitPriceToCartItem1780011148777';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD "unit_price" numeric(12,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP COLUMN "unit_price"`,
    );
  }
}
