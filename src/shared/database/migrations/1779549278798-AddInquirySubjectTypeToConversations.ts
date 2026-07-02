import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInquirySubjectTypeToConversations1779549278798 implements MigrationInterface {
  name = 'AddInquirySubjectTypeToConversations1779549278798';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('inquiry_received', 'inquiry_replied', 'inquiry_closed', 'order_paid', 'order_shipped', 'order_delivered', 'order_released', 'order_completed', 'order_disputed', 'order_refunded', 'order_cancelled', 'message_received')`,
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
      `CREATE TYPE "public"."conversations_subjecttype_enum" AS ENUM('rfq', 'inquiry')`,
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
      `CREATE TYPE "public"."conversations_subjecttype_enum_old" AS ENUM('rfq')`,
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
      `CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('inquiry_received', 'inquiry_replied', 'inquiry_closed', 'order_paid', 'order_shipped', 'order_delivered', 'order_released', 'order_completed', 'order_disputed', 'order_refunded', 'order_cancelled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`,
    );
  }
}
