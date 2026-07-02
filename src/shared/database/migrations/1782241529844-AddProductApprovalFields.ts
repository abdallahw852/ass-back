import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductApprovalFields1782241529844 implements MigrationInterface {
    name = 'AddProductApprovalFields1782241529844'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ADD "rejectionReason" character varying(1000)`);
        await queryRunner.query(`ALTER TABLE "products" ADD "reviewedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "products" ADD "reviewedById" integer`);
        await queryRunner.query(`ALTER TYPE "public"."products_status_enum" RENAME TO "products_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."products_status_enum" AS ENUM('draft', 'pending', 'active', 'inactive', 'rejected', 'archived')`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "status" TYPE "public"."products_status_enum" USING "status"::"text"::"public"."products_status_enum"`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'draft'`);
        await queryRunner.query(`DROP TYPE "public"."products_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('order_paid', 'order_shipped', 'order_delivered', 'order_released', 'order_completed', 'order_disputed', 'order_refunded', 'order_cancelled', 'message_received', 'supplier_approved', 'supplier_rejected', 'product_approved', 'product_rejected')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('order_paid', 'order_shipped', 'order_delivered', 'order_released', 'order_completed', 'order_disputed', 'order_refunded', 'order_cancelled', 'message_received')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."products_status_enum_old" AS ENUM('draft', 'active', 'inactive', 'archived')`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "status" TYPE "public"."products_status_enum_old" USING "status"::"text"::"public"."products_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'draft'`);
        await queryRunner.query(`DROP TYPE "public"."products_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."products_status_enum_old" RENAME TO "products_status_enum"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "reviewedById"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "reviewedAt"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "rejectionReason"`);
    }

}
