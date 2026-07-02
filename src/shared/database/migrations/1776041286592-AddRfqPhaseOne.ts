import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRfqPhaseOne1776041286592 implements MigrationInterface {
  name = 'AddRfqPhaseOne1776041286592';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "rfq_attachments" ("id" SERIAL NOT NULL, "rfqId" integer NOT NULL, "url" character varying(512) NOT NULL, "originalName" character varying(255) NOT NULL, "mimeType" character varying(128) NOT NULL, "size" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_89868cd765c395a8ccddcf319b7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "rfq_customizations" ("id" SERIAL NOT NULL, "rfqId" integer NOT NULL, "name" character varying(255) NOT NULL, "value" character varying(255) NOT NULL, CONSTRAINT "PK_e1df4c50f16a3e2e378427cb818" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "quotation_customizations" ("id" SERIAL NOT NULL, "quotationId" integer NOT NULL, "name" character varying(255) NOT NULL, "value" character varying(255) NOT NULL, CONSTRAINT "PK_629b282f18300cd2d6951023e43" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."quotations_status_enum" AS ENUM('submitted', 'accepted', 'rejected', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "quotations" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "rfqId" integer NOT NULL, "supplierId" integer NOT NULL, "status" "public"."quotations_status_enum" NOT NULL DEFAULT 'submitted', "productName" character varying(255) NOT NULL, "quantity" numeric(12,2) NOT NULL, "weightKg" numeric(12,2), "lengthCm" numeric(12,2), "widthCm" numeric(12,2), "heightCm" numeric(12,2), "unitPrice" numeric(12,2) NOT NULL, "currency" character varying(8) NOT NULL DEFAULT 'SAR', "totalPrice" numeric(12,2) NOT NULL, "deliveryTimeDays" character varying(64) NOT NULL, "paymentTerms" character varying(255) NOT NULL, "validUntil" TIMESTAMP WITH TIME ZONE NOT NULL, "shippingDetails" character varying(255), "additionalNotes" character varying(500), "supplierViewedAt" TIMESTAMP WITH TIME ZONE, "buyerViewedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6c00eb8ba181f28c21ffba7ecb1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4d0dab422a84f76e16fd30b5ab" ON "quotations" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_25a12d2cc354c7dae1109d4eaa" ON "quotations" ("rfqId", "supplierId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rfqs_type_enum" AS ENUM('product_directed', 'general_custom')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rfqs_status_enum" AS ENUM('open', 'awarded', 'closed', 'expired', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "rfqs" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "referenceNumber" character varying(32), "type" "public"."rfqs_type_enum" NOT NULL, "status" "public"."rfqs_status_enum" NOT NULL DEFAULT 'open', "buyerId" integer NOT NULL, "productId" integer, "targetSupplierId" integer, "awardedQuotationId" integer, "categoryId" integer, "productName" character varying(255) NOT NULL, "quantity" numeric(12,2) NOT NULL, "quantityUnit" character varying(64), "message" text, "technicalSpecs" text, "sampleReadiness" character varying(64), "requestedDeliveryDate" date, "buyerViewedAt" TIMESTAMP WITH TIME ZONE, "supplierViewedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c8b7481584218bdee534e5fc436" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7dfe2b39596df575bf5085eab6" ON "rfqs" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a50afe50eb8d9be454f90ecbcc" ON "rfqs" ("referenceNumber") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order_drafts" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "referenceNumber" character varying(32), "buyerId" integer NOT NULL, "supplierId" integer NOT NULL, "rfqId" character varying(255) NOT NULL, "quotationId" character varying(255) NOT NULL, "productName" character varying(255) NOT NULL, "items" jsonb NOT NULL DEFAULT '[]', "status" character varying(16) NOT NULL DEFAULT 'draft', "currency" character varying(8) NOT NULL DEFAULT 'SAR', "subtotal" numeric(12,2) NOT NULL, "snapshot" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ac50f75150170e6d4015a625cc6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_da77e4cd5eeaa9eb1ef7638aa5" ON "order_drafts" ("_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "rfq_attachments" ADD CONSTRAINT "FK_8911012e0e0bde0525ba60563c6" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rfq_customizations" ADD CONSTRAINT "FK_efe88608b03e81f476ba5521000" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotation_customizations" ADD CONSTRAINT "FK_87a0d2eaebc7c8ed021266991c8" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotations" ADD CONSTRAINT "FK_f6dc098a8afb3b53677656411c9" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotations" ADD CONSTRAINT "FK_94a1cf611016e79c516d36da64a" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rfqs" ADD CONSTRAINT "FK_4c9d1f6d716c1a8c0dbc257e74b" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rfqs" ADD CONSTRAINT "FK_0d0151c47bd33dd930a3ded40a7" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rfqs" ADD CONSTRAINT "FK_90b03a9b4cfbabb5ba34298648d" FOREIGN KEY ("targetSupplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rfqs" ADD CONSTRAINT "FK_b9e6f14794154ae776f05069559" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rfqs" DROP CONSTRAINT "FK_b9e6f14794154ae776f05069559"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rfqs" DROP CONSTRAINT "FK_90b03a9b4cfbabb5ba34298648d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rfqs" DROP CONSTRAINT "FK_0d0151c47bd33dd930a3ded40a7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rfqs" DROP CONSTRAINT "FK_4c9d1f6d716c1a8c0dbc257e74b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotations" DROP CONSTRAINT "FK_94a1cf611016e79c516d36da64a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotations" DROP CONSTRAINT "FK_f6dc098a8afb3b53677656411c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotation_customizations" DROP CONSTRAINT "FK_87a0d2eaebc7c8ed021266991c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rfq_customizations" DROP CONSTRAINT "FK_efe88608b03e81f476ba5521000"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rfq_attachments" DROP CONSTRAINT "FK_8911012e0e0bde0525ba60563c6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_da77e4cd5eeaa9eb1ef7638aa5"`,
    );
    await queryRunner.query(`DROP TABLE "order_drafts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a50afe50eb8d9be454f90ecbcc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7dfe2b39596df575bf5085eab6"`,
    );
    await queryRunner.query(`DROP TABLE "rfqs"`);
    await queryRunner.query(`DROP TYPE "public"."rfqs_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."rfqs_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_25a12d2cc354c7dae1109d4eaa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4d0dab422a84f76e16fd30b5ab"`,
    );
    await queryRunner.query(`DROP TABLE "quotations"`);
    await queryRunner.query(`DROP TYPE "public"."quotations_status_enum"`);
    await queryRunner.query(`DROP TABLE "quotation_customizations"`);
    await queryRunner.query(`DROP TABLE "rfq_customizations"`);
    await queryRunner.query(`DROP TABLE "rfq_attachments"`);
  }
}
