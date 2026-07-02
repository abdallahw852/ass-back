import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductShippingPrice1779143593160 implements MigrationInterface {
  name = 'AddProductShippingPrice1779143593160';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "shippingPrice" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "shippingPrice"`,
    );
  }
}
