#!/usr/bin/env node
import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';

const env = process.env.NODE_ENV ?? 'development';
const envFile =
  env === 'production'
    ? '.env.production'
    : env === 'staging'
      ? '.env.staging'
      : '.env';

config({ path: resolve(process.cwd(), envFile) });

// ── Plans ─────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'silver',
    displayNameAr: 'الفضي',
    displayNameEn: 'Silver',
    price: '0.00',
    currency: 'SAR',
    billingCycle: 'monthly',
    commissionRate: '5.00',
    features: [
      'إدراج حتى 10 منتجات',
      'دعم أساسي',
      'لوحة تحكم المورد',
    ],
    isActive: true,
    isDefault: true,
  },
  {
    name: 'gold',
    displayNameAr: 'الذهبي',
    displayNameEn: 'Gold',
    price: '99.00',
    currency: 'SAR',
    billingCycle: 'monthly',
    commissionRate: '3.00',
    features: [
      'إدراج منتجات غير محدود',
      'دعم ذو أولوية',
      'لوحة تحليلات متقدمة',
      'منتجات مميزة في الكتالوج',
      'شارة المورد الموثوق',
    ],
    isActive: true,
    isDefault: false,
  },
];

// ── Categories ────────────────────────────────────────────────────────────────

const TOP_LEVEL = [
  {
    name: 'Electronics & Technology',
    nameAr: 'الإلكترونيات والتقنية',
    slug: 'electronics-technology',
    sortOrder: 1,
    children: [
      { name: 'Computers & Laptops',    nameAr: 'أجهزة الكمبيوتر والحاسوب المحمول', slug: 'computers-laptops',    sortOrder: 1 },
      { name: 'Phones & Accessories',   nameAr: 'الهواتف والإكسسوارات',              slug: 'phones-accessories',   sortOrder: 2 },
      { name: 'Audio & Video',          nameAr: 'الصوت والفيديو',                    slug: 'audio-video',          sortOrder: 3 },
      { name: 'Networking Equipment',   nameAr: 'معدات الشبكات',                     slug: 'networking-equipment', sortOrder: 4 },
    ],
  },
  {
    name: 'Food & Beverages',
    nameAr: 'الغذاء والمشروبات',
    slug: 'food-beverages',
    sortOrder: 2,
    children: [
      { name: 'Packaged Food',     nameAr: 'الأغذية المعلبة والمعبأة', slug: 'packaged-food',    sortOrder: 1 },
      { name: 'Beverages',         nameAr: 'المشروبات',                slug: 'beverages',        sortOrder: 2 },
      { name: 'Dairy & Eggs',      nameAr: 'الألبان والبيض',           slug: 'dairy-eggs',       sortOrder: 3 },
      { name: 'Bakery & Grains',   nameAr: 'المخبوزات والحبوب',        slug: 'bakery-grains',    sortOrder: 4 },
    ],
  },
  {
    name: 'Clothing & Apparel',
    nameAr: 'الملابس والأزياء',
    slug: 'clothing-apparel',
    sortOrder: 3,
    children: [
      { name: "Men's Wear",        nameAr: 'ملابس رجالية',   slug: 'mens-wear',        sortOrder: 1 },
      { name: "Women's Wear",      nameAr: 'ملابس نسائية',   slug: 'womens-wear',      sortOrder: 2 },
      { name: "Children's Wear",   nameAr: 'ملابس أطفال',    slug: 'childrens-wear',   sortOrder: 3 },
      { name: 'Sportswear',        nameAr: 'الملابس الرياضية', slug: 'sportswear',     sortOrder: 4 },
    ],
  },
  {
    name: 'Office Supplies',
    nameAr: 'مستلزمات المكاتب',
    slug: 'office-supplies',
    sortOrder: 4,
    children: [
      { name: 'Stationery',        nameAr: 'القرطاسية',              slug: 'stationery',       sortOrder: 1 },
      { name: 'Furniture',         nameAr: 'أثاث المكاتب',           slug: 'office-furniture', sortOrder: 2 },
      { name: 'Printing & Ink',    nameAr: 'الطباعة والأحبار',        slug: 'printing-ink',     sortOrder: 3 },
    ],
  },
  {
    name: 'Building & Construction',
    nameAr: 'البناء والتشييد',
    slug: 'building-construction',
    sortOrder: 5,
    children: [
      { name: 'Raw Materials',     nameAr: 'المواد الخام',       slug: 'raw-materials',    sortOrder: 1 },
      { name: 'Tools & Equipment', nameAr: 'الأدوات والمعدات',   slug: 'tools-equipment',  sortOrder: 2 },
      { name: 'Electrical',        nameAr: 'الكهرباء',           slug: 'electrical',       sortOrder: 3 },
      { name: 'Plumbing',          nameAr: 'السباكة',            slug: 'plumbing',         sortOrder: 4 },
    ],
  },
  {
    name: 'Healthcare & Medical',
    nameAr: 'الرعاية الصحية والطبية',
    slug: 'healthcare-medical',
    sortOrder: 6,
    children: [
      { name: 'Medical Supplies',  nameAr: 'المستلزمات الطبية',     slug: 'medical-supplies', sortOrder: 1 },
      { name: 'Personal Care',     nameAr: 'العناية الشخصية',       slug: 'personal-care',    sortOrder: 2 },
      { name: 'Pharmaceuticals',   nameAr: 'الأدوية والمستحضرات',   slug: 'pharmaceuticals',  sortOrder: 3 },
    ],
  },
  {
    name: 'Automotive',
    nameAr: 'السيارات وقطع الغيار',
    slug: 'automotive',
    sortOrder: 7,
    children: [
      { name: 'Spare Parts',       nameAr: 'قطع الغيار',         slug: 'spare-parts',      sortOrder: 1 },
      { name: 'Accessories',       nameAr: 'إكسسوارات السيارات', slug: 'auto-accessories', sortOrder: 2 },
      { name: 'Oils & Lubricants', nameAr: 'الزيوت والمواد التشحيمية', slug: 'oils-lubricants', sortOrder: 3 },
    ],
  },
  {
    name: 'Home & Furniture',
    nameAr: 'المنزل والأثاث',
    slug: 'home-furniture',
    sortOrder: 8,
    children: [
      { name: 'Living Room',       nameAr: 'غرفة المعيشة',      slug: 'living-room',      sortOrder: 1 },
      { name: 'Bedroom',           nameAr: 'غرفة النوم',         slug: 'bedroom',          sortOrder: 2 },
      { name: 'Kitchen',           nameAr: 'المطبخ',             slug: 'kitchen',          sortOrder: 3 },
      { name: 'Home Decor',        nameAr: 'ديكور المنزل',       slug: 'home-decor',       sortOrder: 4 },
    ],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.WRITE_DB_HOST ?? 'localhost',
    port: parseInt(process.env.WRITE_DB_PORT ?? '5432', 10),
    username: process.env.WRITE_DB_USER ?? 'postgres',
    password: process.env.WRITE_DB_PASS ?? 'postgres',
    database: process.env.WRITE_DB_NAME ?? 'asas_write',
    synchronize: false,
  });

  await ds.initialize();
  console.log('Connected to database.\n');

  // ── Seed plans ─────────────────────────────────────────────────────────────
  console.log('Seeding plans...');
  for (const plan of PLANS) {
    const existing = await ds.query(
      'SELECT id, "isDefault" FROM plans WHERE name = $1',
      [plan.name],
    );
    if (existing.length > 0) {
      // Backfill isDefault if it differs (handles rows seeded before this column existed)
      if (existing[0].isDefault !== plan.isDefault) {
        await ds.query(
          'UPDATE plans SET "isDefault" = $1, "updatedAt" = NOW() WHERE name = $2',
          [plan.isDefault, plan.name],
        );
        console.log(`  [fix]  plan "${plan.name}" isDefault updated to ${plan.isDefault}`);
      } else {
        console.log(`  [skip] plan "${plan.name}" already exists`);
      }
      continue;
    }
    await ds.query(
      `INSERT INTO plans
         ("_id", name, "displayNameAr", "displayNameEn", price, currency,
          "billingCycle", "commissionRate", features, "isActive", "isDefault",
          "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
      [
        randomUUID(),
        plan.name,
        plan.displayNameAr,
        plan.displayNameEn,
        plan.price,
        plan.currency,
        plan.billingCycle,
        plan.commissionRate,
        JSON.stringify(plan.features),
        plan.isActive,
        plan.isDefault,
      ],
    );
    console.log(`  [ok]   plan "${plan.name}" created`);
  }

  // ── Seed categories ────────────────────────────────────────────────────────
  console.log('\nSeeding categories...');
  for (const top of TOP_LEVEL) {
    // upsert top-level
    const existing = await ds.query(
      'SELECT id FROM categories WHERE slug = $1 AND "deletedAt" IS NULL',
      [top.slug],
    );
    let parentId;
    if (existing.length > 0) {
      parentId = existing[0].id;
      console.log(`  [skip] category "${top.name}" already exists`);
    } else {
      const [row] = await ds.query(
        `INSERT INTO categories
           ("_id", name, "nameAr", slug, "parentId", level, "sortOrder",
            "isActive", "productCount", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,NULL,0,$5,true,0,NOW(),NOW())
         RETURNING id`,
        [randomUUID(), top.name, top.nameAr, top.slug, top.sortOrder],
      );
      parentId = row.id;
      console.log(`  [ok]   category "${top.name}" created`);
    }

    // upsert children
    for (const child of top.children ?? []) {
      const existingChild = await ds.query(
        'SELECT id FROM categories WHERE slug = $1 AND "deletedAt" IS NULL',
        [child.slug],
      );
      if (existingChild.length > 0) {
        console.log(`    [skip] subcategory "${child.name}" already exists`);
        continue;
      }
      await ds.query(
        `INSERT INTO categories
           ("_id", name, "nameAr", slug, "parentId", level, "sortOrder",
            "isActive", "productCount", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,1,$6,true,0,NOW(),NOW())`,
        [randomUUID(), child.name, child.nameAr, child.slug, parentId, child.sortOrder],
      );
      console.log(`    [ok]   subcategory "${child.name}" created`);
    }
  }

  await ds.destroy();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});
