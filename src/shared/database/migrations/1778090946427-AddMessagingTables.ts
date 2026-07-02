import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessagingTables1778090946427 implements MigrationInterface {
  name = 'AddMessagingTables1778090946427';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."conversation_participants_role_enum" AS ENUM('buyer', 'supplier')`,
    );
    await queryRunner.query(
      `CREATE TABLE "conversation_participants" ("id" SERIAL NOT NULL, "conversationId" integer NOT NULL, "userId" integer NOT NULL, "role" "public"."conversation_participants_role_enum" NOT NULL, "lastReadMessageId" integer, "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_61b51428ad9453f5921369fbe94" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_conversation_participant" ON "conversation_participants" ("conversationId", "userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."conversations_subjecttype_enum" AS ENUM('rfq')`,
    );
    await queryRunner.query(
      `CREATE TABLE "conversations" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "subjectType" "public"."conversations_subjecttype_enum" NOT NULL, "subjectId" uuid NOT NULL, "scopeKey" uuid, "lastMessageAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_6b4712f88f80ca0ca8be19217a" ON "conversations" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_conversation_subject_scope" ON "conversations" ("subjectType", "subjectId", "scopeKey") `,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "conversationId" integer NOT NULL, "senderId" integer NOT NULL, "body" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_79fc28532440f34f2d1e725940" ON "messages" ("_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_message_conversation_created" ON "messages" ("conversationId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD CONSTRAINT "FK_4453e20858b14ab765a09ad728c" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD CONSTRAINT "FK_18c4ba3b127461649e5f5039dbf" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_e5663ce0c730b2de83445e2fd19" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_e5663ce0c730b2de83445e2fd19"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_18c4ba3b127461649e5f5039dbf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_4453e20858b14ab765a09ad728c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_message_conversation_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_79fc28532440f34f2d1e725940"`,
    );
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_conversation_subject_scope"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6b4712f88f80ca0ca8be19217a"`,
    );
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(
      `DROP TYPE "public"."conversations_subjecttype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_conversation_participant"`,
    );
    await queryRunner.query(`DROP TABLE "conversation_participants"`);
    await queryRunner.query(
      `DROP TYPE "public"."conversation_participants_role_enum"`,
    );
  }
}
