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

const email = process.argv[2];

if (!email) {
  console.error('Usage: pnpm create-admin <email>');
  process.exit(1);
}

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.WRITE_DB_HOST ?? 'localhost',
    port: parseInt(process.env.WRITE_DB_PORT ?? '5432', 10),
    username: process.env.WRITE_DB_USER ?? 'postgres',
    password: process.env.WRITE_DB_PASS ?? 'postgres',
    database: process.env.WRITE_DB_NAME ?? 'asas_write',
    ssl: process.env.WRITE_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    synchronize: false,
  });

  await ds.initialize();

  const existing = await ds.query(
    'SELECT id, email, role FROM users WHERE email = $1',
    [email],
  );

  if (existing.length > 0) {
    const user = existing[0];
    if (user.role === 'admin') {
      console.log(`User "${email}" is already an admin (id=${user.id}).`);
    } else {
      await ds.query("UPDATE users SET role = 'admin' WHERE id = $1", [
        user.id,
      ]);
      console.log(
        `User "${email}" updated to admin (id=${user.id}, was "${user.role}").`,
      );
    }
  } else {
    const _id = randomUUID();
    const result = await ds.query(
      `INSERT INTO users ("_id", email, role, "verifiedAt", "lastLoginAt", "createdAt", "updatedAt")
       VALUES ($1, $2, 'admin', NOW(), NOW(), NOW(), NOW())
       RETURNING id`,
      [_id, email],
    );
    console.log(`Admin created: email="${email}", id=${_id}`);
  }

  await ds.destroy();
}

main().catch((err) => {
  console.error('Failed:', err.message ?? err);
  process.exit(1);
});
