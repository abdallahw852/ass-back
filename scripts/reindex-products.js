"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const elasticsearch_1 = require("@elastic/elasticsearch");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const INDEX_NAME = 'products_v2';
const BATCH_SIZE = 500;
async function main() {
    const ds = new typeorm_1.DataSource({
        type: 'postgres',
        host: process.env.WRITE_DB_HOST ?? process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.WRITE_DB_PORT ?? 5432),
        username: process.env.WRITE_DB_USER ?? 'postgres',
        password: process.env.WRITE_DB_PASS ?? 'postgres',
        database: process.env.WRITE_DB_NAME ?? 'asas_write',
    });
    await ds.initialize();
    console.log('DB connected');
    const es = new elasticsearch_1.Client({
        node: process.env.ELASTICSEARCH_NODE ?? 'http://localhost:9200',
        auth: {
            username: process.env.ELASTICSEARCH_USERNAME ?? 'elastic',
            password: process.env.ELASTICSEARCH_PASSWORD ?? 'changeme',
        },
    });
    const rows = await ds.query(`
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
                ? row.categoryPath
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
//# sourceMappingURL=reindex-products.js.map