import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve, join } from 'path';

// Load the correct .env file based on NODE_ENV
const env = process.env.NODE_ENV ?? 'development';
const envFile =
  env === 'production'
    ? '.env.production'
    : env === 'staging'
      ? '.env.staging'
      : '.env';

config({ path: resolve(process.cwd(), envFile) });

/**
 * TypeORM CLI DataSource — used exclusively for running/generating migrations.
 * Targets the WRITE (primary) database.
 *
 * Do NOT use this DataSource inside the NestJS application.
 * The app uses TypeOrmModule.forRootAsync() wired via ConfigService instead.
 *
 * Commands (from project root):
 *   Generate:  NAME=InitialSchema pnpm migration:generate
 *   Run:       pnpm migration:run
 *   Revert:    pnpm migration:revert
 *   Show:      pnpm migration:show
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.WRITE_DB_HOST ?? 'localhost',
  port: parseInt(process.env.WRITE_DB_PORT ?? '5432', 10),
  username: process.env.WRITE_DB_USER ?? 'postgres',
  password: process.env.WRITE_DB_PASS ?? 'postgres',
  database: process.env.WRITE_DB_NAME ?? 'asas_write',

  // All write-side ORM entities — resolved relative to project root
  entities: [join(process.cwd(), 'src/**/*.orm-entity.{ts,js}')],

  // Migration files live in src/shared/database/migrations/
  migrations: [join(process.cwd(), 'src/shared/database/migrations/*.{ts,js}')],

  synchronize: false,
  logging: env === 'development',
  ssl:
    process.env.WRITE_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
