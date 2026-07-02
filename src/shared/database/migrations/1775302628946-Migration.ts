import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1775302628946 implements MigrationInterface {
  name = 'Migration1775302628946';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "saga_states" ("id" SERIAL NOT NULL, "saga_id" uuid NOT NULL, "status" character varying(50) NOT NULL, "current_step" integer NOT NULL DEFAULT '0', "data" jsonb NOT NULL, "completed_steps" integer array NOT NULL DEFAULT '{}', "error" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4875d89c7cca98d460874c351d2" UNIQUE ("saga_id"), CONSTRAINT "PK_bb8657ba4180583da539f09196b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c707d2bbf2290a58023d4f9b16" ON "saga_states" ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4875d89c7cca98d460874c351d" ON "saga_states" ("saga_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "event_store" ("id" SERIAL NOT NULL, "aggregate_id" uuid NOT NULL, "aggregate_type" character varying(100) NOT NULL, "event_type" character varying(100) NOT NULL, "payload" jsonb NOT NULL, "version" integer NOT NULL, "occurred_on" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f112deaffb65c3866e4d3f0fd13" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fbae4750a1192997c8834d8a80" ON "event_store" ("occurred_on") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_00d8492b9d6bcc4c8bb1b53aab" ON "event_store" ("event_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2f4a5f4724d91483fbded34fd2" ON "event_store" ("aggregate_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_12181b5b991a911c368c652a49" ON "event_store" ("aggregate_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c66abea897d8daaec539161af2" ON "event_store" ("aggregate_id", "version") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payment_records" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "supplierId" integer NOT NULL, "subscriptionId" integer, "paymentIntentId" character varying(255), "amount" numeric(10,2) NOT NULL, "currency" character varying(8) NOT NULL DEFAULT 'SAR', "status" character varying(32) NOT NULL DEFAULT 'pending', "paymobOrderId" character varying(255), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1770b3d8261895c6bafd8faef91" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ffbe8790c86d325d9d08b79ec0" ON "payment_records" ("_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "checkout_sessions" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "buyer_id" integer NOT NULL, "items" jsonb NOT NULL DEFAULT '[]', "subtotal" numeric(10,2) NOT NULL DEFAULT '0', "status" character varying(20) NOT NULL DEFAULT 'pending', "supplier_groups" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_838e1b7851d4570f8587232560d" UNIQUE ("_id"), CONSTRAINT "PK_5730b2bbc190203a94941d82bd1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "parentId" integer, "name" character varying(255) NOT NULL, "nameAr" character varying(255), "slug" character varying(255) NOT NULL, "imageUrl" character varying(512), "iconUrl" character varying(512), "description" text, "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "level" smallint NOT NULL DEFAULT '0', "productCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_41b10fde49e2e6b0c771fa2ad5" ON "categories" ("_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_420d9f679d41281f282f5bc7d0" ON "categories" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cart_items" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "cart_id" integer NOT NULL, "product_id" integer NOT NULL, "product_public_id" uuid NOT NULL, "variant_id" integer, "quantity" integer NOT NULL, "unit_price" numeric(10,2) NOT NULL, "supplier_id" integer NOT NULL, "product_name" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_50e31fb033fd71007699cdf5577" UNIQUE ("_id"), CONSTRAINT "PK_6fccf5ec03c172d27a28a82928b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "carts" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "buyer_id" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_33642c39b5d8469dbe1b8fc903e" UNIQUE ("_id"), CONSTRAINT "UQ_eef2fb4d1af19f8cd8a7a069fcf" UNIQUE ("buyer_id"), CONSTRAINT "PK_b5f695a59f5ebb50af3c8160816" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."suppliers_verificationstatus_enum" AS ENUM('pending', 'profile_completed', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "suppliers" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "userId" integer NOT NULL, "companyName" character varying(255) NOT NULL, "phoneNumber" character varying(32) NOT NULL, "country" character varying(64) NOT NULL, "activityType" character varying(128) NOT NULL, "businessSize" character varying(64) NOT NULL, "registrationNumber" character varying(128) NOT NULL, "registrationFileUrl" character varying(512), "notes" text, "companyNameAr" character varying(255), "companyNameEn" character varying(255), "taxNumber" character varying(64), "ownerName" character varying(255), "nationalId" character varying(32), "city" character varying(128), "detailedAddress" text, "logoUrl" character varying(512), "galleryUrls" jsonb NOT NULL DEFAULT '[]', "bankName" character varying(255), "iban" character varying(64), "accountHolderName" character varying(255), "businessDescription" character varying(500), "verificationStatus" "public"."suppliers_verificationstatus_enum" NOT NULL DEFAULT 'pending', "isVerified" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "REL_8b6a94866e7d6ac179bbb67a1f" UNIQUE ("userId"), CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_211e2f89ebbb80583d066fc81d" ON "suppliers" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fad7e455e0b2e1bd62db6b84ec" ON "suppliers" ("registrationNumber") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user', 'supplier', 'buyer')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "email" character varying NOT NULL, "name" character varying, "phone" character varying, "avatar" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "isVerified" boolean NOT NULL DEFAULT false, "supplierId" integer, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "lastLoginAt" TIMESTAMP WITH TIME ZONE, "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_46c438e5a956fb9c3e86e73e321" UNIQUE ("_id"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_otp_codes" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "codeHash" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "consumedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_83b7cfd3097c535e8752e8c208a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a75d039eb5989cafddccd38630" ON "auth_otp_codes" ("email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "wishlists" ("id" SERIAL NOT NULL, "buyer_id" integer NOT NULL, "product_id" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ee4a10a3914c70b0b10e853053f" UNIQUE ("buyer_id", "product_id"), CONSTRAINT "PK_d0a37f2848c5d268d315325f359" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscriptions" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "supplierId" integer NOT NULL, "planId" integer NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'active', "platformSubscriptionId" character varying(255), "currentPeriodStart" TIMESTAMP WITH TIME ZONE NOT NULL, "currentPeriodEnd" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b4b5709dac47090cc9a3d34e55" ON "subscriptions" ("_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "plans" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "name" character varying(64) NOT NULL, "displayNameAr" character varying(128) NOT NULL, "displayNameEn" character varying(128) NOT NULL, "price" numeric(10,2) NOT NULL DEFAULT '0', "currency" character varying(8) NOT NULL DEFAULT 'SAR', "billingCycle" character varying(16) NOT NULL DEFAULT 'monthly', "commissionRate" numeric(5,2) NOT NULL DEFAULT '0', "features" jsonb NOT NULL DEFAULT '[]', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_40d6ecafb976f71e4443ebd251" ON "plans" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_253d25dae4c94ee913bc5ec485" ON "plans" ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "supplier_documents" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "supplierId" integer NOT NULL, "documentType" character varying(64) NOT NULL, "documentName" character varying(255) NOT NULL, "fileUrl" character varying(512) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_b1df9d525587d1d8341e07dc0b2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7df29bf40b26b022b28fae49c7" ON "supplier_documents" ("_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "reviews" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "product_id" integer NOT NULL, "buyer_id" integer NOT NULL, "rating" smallint NOT NULL, "title" character varying(255), "body" text, "images" jsonb NOT NULL DEFAULT '[]', "is_verified_purchase" boolean NOT NULL DEFAULT false, "helpful_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_f48e736a1868cbee475aedd7d07" UNIQUE ("_id"), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_variants" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "productId" integer NOT NULL, "sku" character varying(128), "color" character varying(7), "size" character varying(32), "price" numeric(10,2) NOT NULL DEFAULT '0', "quantity" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_281e3f2c55652d6a22c0aa59fd7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_295421edf125d770791c39f074" ON "product_variants" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_46f236f21640f9da218a063a86" ON "product_variants" ("sku") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c0b921ad4713592268f97b9bab" ON "product_variants" ("productId", "color", "size") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_bundle_items" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "parentProductId" integer NOT NULL, "childProductId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_9bebbaa11b6a346930a9e163858" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_039bcf7079775b314618de5c27" ON "product_bundle_items" ("_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_93c463ab78065840a9d19f0dba" ON "product_bundle_items" ("parentProductId", "childProductId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_type_enum" AS ENUM('ready', 'service', 'food', 'digital', 'digital_card', 'bundle')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_status_enum" AS ENUM('draft', 'active', 'inactive', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_condition_enum" AS ENUM('new', 'used', 'refurbished')`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "supplierId" integer NOT NULL, "type" "public"."products_type_enum" NOT NULL DEFAULT 'ready', "status" "public"."products_status_enum" NOT NULL DEFAULT 'draft', "name" character varying(255) NOT NULL, "description" text, "mainTitle" character varying(255), "promotionalTitle" character varying(255), "images" jsonb NOT NULL DEFAULT '[]', "categoryId" character varying(255), "subcategoryId" character varying(255), "costPrice" numeric(10,2) NOT NULL DEFAULT '0', "discountedPrice" numeric(10,2), "discountPercentage" smallint, "discountEndDate" TIMESTAMP WITH TIME ZONE, "stockQuantity" integer NOT NULL DEFAULT '0', "maxPerCustomer" integer NOT NULL DEFAULT '0', "trackInventory" boolean NOT NULL DEFAULT false, "requiresShipping" boolean NOT NULL DEFAULT false, "optionGroups" jsonb NOT NULL DEFAULT '[]', "bookingAvailableTime" character varying(64), "bookingAvailableDate" TIMESTAMP WITH TIME ZONE, "bookingCapacity" integer, "digitalFileUrl" character varying(512), "digitalFileType" character varying(128), "digitalFileSize" character varying(64), "bundlePrice" numeric(10,2), "moq" integer NOT NULL DEFAULT '1', "unitCount" integer, "unitType" character varying(50), "condition" "public"."products_condition_enum" NOT NULL DEFAULT 'new', "currency" character varying(3) NOT NULL DEFAULT 'SAR', "attributes" jsonb NOT NULL DEFAULT '[]', "viewCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bb9432d5569253ad39cd006176" ON "products" ("_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "pricing_tiers" ("id" SERIAL NOT NULL, "_id" uuid NOT NULL, "productId" integer NOT NULL, "minQuantity" integer NOT NULL, "maxQuantity" integer, "unitPrice" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'SAR', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f5f75ade45fc37142b2cdbaa2f5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f822ee1c6a6994628b55ee9b6b" ON "pricing_tiers" ("_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5f6eb4428fb353e56fe1384f5a" ON "pricing_tiers" ("productId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_6385a745d9e12a89b859bb25623" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "FK_8b6a94866e7d6ac179bbb67a1f8" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "FK_f515690c571a03400a9876600b5" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_bundle_items" ADD CONSTRAINT "FK_db57155c060e2c50954297e77bb" FOREIGN KEY ("parentProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_c143cbc0299e1f9220c4b5debd8" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_tiers" ADD CONSTRAINT "FK_5f6eb4428fb353e56fe1384f5ad" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pricing_tiers" DROP CONSTRAINT "FK_5f6eb4428fb353e56fe1384f5ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_c143cbc0299e1f9220c4b5debd8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_bundle_items" DROP CONSTRAINT "FK_db57155c060e2c50954297e77bb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "FK_f515690c571a03400a9876600b5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT "FK_8b6a94866e7d6ac179bbb67a1f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_6385a745d9e12a89b859bb25623"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5f6eb4428fb353e56fe1384f5a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f822ee1c6a6994628b55ee9b6b"`,
    );
    await queryRunner.query(`DROP TABLE "pricing_tiers"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bb9432d5569253ad39cd006176"`,
    );
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TYPE "public"."products_condition_enum"`);
    await queryRunner.query(`DROP TYPE "public"."products_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."products_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_93c463ab78065840a9d19f0dba"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_039bcf7079775b314618de5c27"`,
    );
    await queryRunner.query(`DROP TABLE "product_bundle_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c0b921ad4713592268f97b9bab"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_46f236f21640f9da218a063a86"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_295421edf125d770791c39f074"`,
    );
    await queryRunner.query(`DROP TABLE "product_variants"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7df29bf40b26b022b28fae49c7"`,
    );
    await queryRunner.query(`DROP TABLE "supplier_documents"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_253d25dae4c94ee913bc5ec485"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_40d6ecafb976f71e4443ebd251"`,
    );
    await queryRunner.query(`DROP TABLE "plans"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b4b5709dac47090cc9a3d34e55"`,
    );
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TABLE "wishlists"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a75d039eb5989cafddccd38630"`,
    );
    await queryRunner.query(`DROP TABLE "auth_otp_codes"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fad7e455e0b2e1bd62db6b84ec"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_211e2f89ebbb80583d066fc81d"`,
    );
    await queryRunner.query(`DROP TABLE "suppliers"`);
    await queryRunner.query(
      `DROP TYPE "public"."suppliers_verificationstatus_enum"`,
    );
    await queryRunner.query(`DROP TABLE "carts"`);
    await queryRunner.query(`DROP TABLE "cart_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_420d9f679d41281f282f5bc7d0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_41b10fde49e2e6b0c771fa2ad5"`,
    );
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "checkout_sessions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ffbe8790c86d325d9d08b79ec0"`,
    );
    await queryRunner.query(`DROP TABLE "payment_records"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c66abea897d8daaec539161af2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_12181b5b991a911c368c652a49"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2f4a5f4724d91483fbded34fd2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_00d8492b9d6bcc4c8bb1b53aab"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fbae4750a1192997c8834d8a80"`,
    );
    await queryRunner.query(`DROP TABLE "event_store"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4875d89c7cca98d460874c351d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c707d2bbf2290a58023d4f9b16"`,
    );
    await queryRunner.query(`DROP TABLE "saga_states"`);
  }
}
