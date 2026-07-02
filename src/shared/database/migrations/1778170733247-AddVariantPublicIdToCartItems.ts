import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVariantPublicIdToCartItems1778170733247 implements MigrationInterface {
  name = 'AddVariantPublicIdToCartItems1778170733247';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD "variant_public_id" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP COLUMN "variant_public_id"`,
    );
  }
}
