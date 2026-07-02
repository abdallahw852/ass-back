import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveInquiry1779978225709 implements MigrationInterface {
  name = 'RemoveInquiry1779978225709';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Data cleanup: remove inquiry-type notifications and conversations before narrowing enums and dropping tables
    await queryRunner.query(
      `DELETE FROM notifications WHERE type IN ('inquiry_received', 'inquiry_replied', 'inquiry_closed')`,
    );
    await queryRunner.query(
      `DELETE FROM conversations WHERE "subjectType" = 'inquiry'`,
    );

    // Drop inquiry tables (FK constraints dropped first)
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "inquiry_attachments" DROP CONSTRAINT IF EXISTS "FK_6860ea9f1875fb33f75875148fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "inquiry_items" DROP CONSTRAINT IF EXISTS "FK_400410d8559d8e041d38e316d23"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "inquiry_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inquiry_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inquiries"`);

    await queryRunner.query(`DROP INDEX "public"."UQ_plans_one_default"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('order_paid', 'order_shipped', 'order_delivered', 'order_released', 'order_completed', 'order_disputed', 'order_refunded', 'order_cancelled', 'message_received')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_conversation_subject_scope"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."conversations_subjecttype_enum" RENAME TO "conversations_subjecttype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."conversations_subjecttype_enum" AS ENUM('rfq')`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ALTER COLUMN "subjectType" TYPE "public"."conversations_subjecttype_enum" USING "subjectType"::"text"::"public"."conversations_subjecttype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."conversations_subjecttype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_conversation_subject_scope" ON "conversations" ("subjectType", "subjectId", "scopeKey") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_conversation_subject_scope"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."conversations_subjecttype_enum_old" AS ENUM('rfq', 'inquiry')`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ALTER COLUMN "subjectType" TYPE "public"."conversations_subjecttype_enum_old" USING "subjectType"::"text"::"public"."conversations_subjecttype_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."conversations_subjecttype_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."conversations_subjecttype_enum_old" RENAME TO "conversations_subjecttype_enum"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_conversation_subject_scope" ON "conversations" ("scopeKey", "subjectId", "subjectType") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('inquiry_received', 'inquiry_replied', 'inquiry_closed', 'order_paid', 'order_shipped', 'order_delivered', 'order_released', 'order_completed', 'order_disputed', 'order_refunded', 'order_cancelled', 'message_received')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_plans_one_default" ON "plans" ("isDefault") WHERE ("isDefault" = true)`,
    );
  }
}
