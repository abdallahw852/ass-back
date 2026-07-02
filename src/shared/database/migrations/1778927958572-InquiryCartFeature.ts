import { MigrationInterface, QueryRunner } from 'typeorm';

export class InquiryCartFeature1778927958572 implements MigrationInterface {
  name = 'InquiryCartFeature1778927958572';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('inquiry_received', 'inquiry_replied', 'inquiry_closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "user_id" integer NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "payload" jsonb NOT NULL, "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9b4dc235e7adc8bca874331977" ON "notifications" ("_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a8a82462cab47c73d25f49261" ON "notifications" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "inquiry_items" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "inquiry_id" integer NOT NULL, "product_id" integer NOT NULL, "product_public_id" uuid NOT NULL, "variant_id" integer, "variant_public_id" uuid, "product_name" character varying(255) NOT NULL, "product_image" character varying(512), "quantity" integer NOT NULL, "target_price" numeric(12,2), "notes" text, CONSTRAINT "UQ_8d6f8911cf930a16abdb9c501ac" UNIQUE ("_id"), CONSTRAINT "PK_c4f382739aa0cc814d679287c7c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "inquiry_attachments" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "inquiry_id" integer NOT NULL, "url" character varying(512) NOT NULL, "original_name" character varying(255) NOT NULL, "mime_type" character varying(128) NOT NULL, "size" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_1b457431d898dec44c2af9020f3" UNIQUE ("_id"), CONSTRAINT "PK_85bb35f084747c23f4ef797adca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inquiries_status_enum" AS ENUM('sent', 'replied', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inquiries" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "reference_number" character varying(32), "buyer_id" integer NOT NULL, "supplier_id" integer NOT NULL, "status" "public"."inquiries_status_enum" NOT NULL DEFAULT 'sent', "message" text, "shipping_destination" jsonb, "first_reply_at" TIMESTAMP WITH TIME ZONE, "closed_at" TIMESTAMP WITH TIME ZONE, "buyer_viewed_at" TIMESTAMP WITH TIME ZONE, "supplier_viewed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ceacaa439988b25eb9459e694d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c1547d2efad9dfd2752b53aed3" ON "inquiries" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7ca1f7496e3826cbc2220ed042" ON "inquiries" ("reference_number") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cart_attachments" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "supplier_group_id" integer NOT NULL, "url" character varying(512) NOT NULL, "original_name" character varying(255) NOT NULL, "mime_type" character varying(128) NOT NULL, "size" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_39872ca3a5009a9be01a110e444" UNIQUE ("_id"), CONSTRAINT "PK_0bf3e9deb203c92531a4f4ce50e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "cart_supplier_groups" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "cart_id" integer NOT NULL, "supplier_id" integer NOT NULL, "message" text, "shipping_destination" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_995a7d15ca8de4a1cc8b93b7677" UNIQUE ("_id"), CONSTRAINT "UQ_5ee84b91bc29ee47e8530af6598" UNIQUE ("cart_id", "supplier_id"), CONSTRAINT "PK_12e0a1125f58aa723dbdcdfda00" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a1127f11007ede36436b095627" ON "cart_supplier_groups" ("supplier_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP COLUMN IF EXISTS "unit_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "supplierType" character varying(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "nameAr" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "descriptionAr" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "target_price" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "notes" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "product_image" character varying(512)`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inquiry_items" ADD CONSTRAINT "FK_400410d8559d8e041d38e316d23" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inquiry_attachments" ADD CONSTRAINT "FK_6860ea9f1875fb33f75875148fb" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inquiries" ADD CONSTRAINT "FK_f6903e5ba4a1274d486f8325eb2" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inquiries" ADD CONSTRAINT "FK_42c3853160bc4b7b368bbac76c1" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_attachments" ADD CONSTRAINT "FK_93fa151c89b2cf17a07fa0156ac" FOREIGN KEY ("supplier_group_id") REFERENCES "cart_supplier_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_supplier_groups" ADD CONSTRAINT "FK_5ff0ec851ba643a57c1a81069d7" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cart_supplier_groups" DROP CONSTRAINT "FK_5ff0ec851ba643a57c1a81069d7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_attachments" DROP CONSTRAINT "FK_93fa151c89b2cf17a07fa0156ac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inquiries" DROP CONSTRAINT "FK_42c3853160bc4b7b368bbac76c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inquiries" DROP CONSTRAINT "FK_f6903e5ba4a1274d486f8325eb2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inquiry_attachments" DROP CONSTRAINT "FK_6860ea9f1875fb33f75875148fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inquiry_items" DROP CONSTRAINT "FK_400410d8559d8e041d38e316d23"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP COLUMN "product_image"`,
    );
    await queryRunner.query(`ALTER TABLE "cart_items" DROP COLUMN "notes"`);
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP COLUMN "target_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "descriptionAr"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "nameAr"`);
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN "supplierType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD "unit_price" numeric(10,2) NOT NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a1127f11007ede36436b095627"`,
    );
    await queryRunner.query(`DROP TABLE "cart_supplier_groups"`);
    await queryRunner.query(`DROP TABLE "cart_attachments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7ca1f7496e3826cbc2220ed042"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c1547d2efad9dfd2752b53aed3"`,
    );
    await queryRunner.query(`DROP TABLE "inquiries"`);
    await queryRunner.query(`DROP TYPE "public"."inquiries_status_enum"`);
    await queryRunner.query(`DROP TABLE "inquiry_attachments"`);
    await queryRunner.query(`DROP TABLE "inquiry_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a8a82462cab47c73d25f49261"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9b4dc235e7adc8bca874331977"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
  }
}
