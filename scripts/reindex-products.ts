/**
 * One-off backfill: reads all active products from Postgres and
 * bulk-indexes them into the products_v2 Elasticsearch index.
 *
 * Usage:
 *   pnpm ts-node --project tsconfig.migration.json scripts/reindex-products.ts
 *
 * After the script completes, verify with:
 *   curl http://localhost:9200/products_v2/_count
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import * as dotenv from 'dotenv';

dotenv.config();

const INDEX_NAME = 'products_v3';
const BATCH_SIZE = 500;

interface ProductRow {
  _id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  costPrice: string;
  discountedPrice: string | null;
  moq: number;
  viewCount: number;
  categoryId: string | null;
  currency: string;
  condition: string;
  status: string;
  createdAt: Date;
  supplierId: number;
  supplierCountry: string;
  supplierType: string | null;
  supplierIsVerified: boolean;
  categoryPath: string | null;
}

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.WRITE_DB_HOST ?? process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.WRITE_DB_PORT ?? 5432),
    username: process.env.WRITE_DB_USER ?? 'postgres',
    password: process.env.WRITE_DB_PASS ?? 'postgres',
    database: process.env.WRITE_DB_NAME ?? 'asas_write',
  });

  await ds.initialize();
  console.log('DB connected');

  const es = new Client({
    node: process.env.ELASTICSEARCH_NODE ?? 'http://localhost:9200',
    auth: {
      username: process.env.ELASTICSEARCH_USERNAME ?? 'elastic',
      password: process.env.ELASTICSEARCH_PASSWORD ?? 'changeme',
    },
  });

  // Recursive CTE to compute category path (array of _id UUIDs from leaf to root)
  const rows: ProductRow[] = await ds.query(`
    WITH RECURSIVE cat_path AS (
      SELECT c._id, c."parentId", ARRAY[c._id::text] AS path
      FROM categories c
      WHERE c."parentId" IS NULL
      UNION ALL
      SELECT c._id, c."parentId", cat_path.path || c._id::text
      FROM categories c
      JOIN cat_path ON cat_path._id = c."parentId"::uuid
    )
    SELECT
      p._id,
      p.name,
      p."nameAr",
      p.description,
      p."descriptionAr",
      p."costPrice",
      p."discountedPrice",
      p.moq,
      COALESCE(p."viewCount", 0) AS "viewCount",
      p."categoryId",
      p.currency,
      p.condition,
      p.status,
      p."createdAt",
      s.id AS "supplierId",
      s.country AS "supplierCountry",
      s."supplierType",
      s."isVerified" AS "supplierIsVerified",
      cp.path::text AS "categoryPath"
    FROM products p
    JOIN suppliers s ON s.id = p."supplierId"
    LEFT JOIN cat_path cp ON cp._id::text = p."categoryId"
    WHERE p."deletedAt" IS NULL
      AND p.status = 'active'
    ORDER BY p.id
  `);

  console.log(`Found ${rows.length} active products to index`);

  let indexed = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const operations = batch.flatMap((row) => {
      const categoryPath = row.categoryPath
        ? (row.categoryPath as unknown as string)
            .replace(/[{}"]/g, '')
            .split(',')
            .filter(Boolean)
        : row.categoryId
          ? [row.categoryId]
          : [];

      return [
        { index: { _index: INDEX_NAME, _id: row._id } },
        {
          nameEn: row.name,
          nameAr: row.nameAr,
          nameSuggest: [row.name, row.nameAr].filter(Boolean).join(' '),
          descriptionEn: row.description,
          descriptionAr: row.descriptionAr,
          costPrice: parseFloat(row.costPrice),
          discountedPrice: row.discountedPrice
            ? parseFloat(row.discountedPrice)
            : null,
          moq: row.moq,
          viewCount: row.viewCount ?? 0,
          supplierId: row.supplierId,
          supplierCountry: row.supplierCountry,
          supplierType: row.supplierType,
          supplierIsVerified: row.supplierIsVerified,
          categoryId: row.categoryId,
          categoryPath,
          currency: row.currency,
          condition: row.condition,
          status: row.status,
          createdAt: row.createdAt,
        },
      ];
    });

    const result = await es.bulk({ operations });
    const errors = result.items.filter((item) => item.index?.error);
    if (errors.length > 0) {
      console.error(`Batch ${i / BATCH_SIZE + 1}: ${errors.length} errors`);
    }
    indexed += batch.length - errors.length;
    console.log(`Indexed ${indexed}/${rows.length}`);
  }

  await ds.destroy();
  console.log('Done. Verify with: curl http://localhost:9200/products_v2/_count');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
