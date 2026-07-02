#!/usr/bin/env node
/**
 * Migration generation helper.
 * Accepts a migration name as the first CLI argument.
 *
 * Usage:
 *   pnpm migration:generate InitialSchema
 *   pnpm migration:generate          # defaults to "Migration"
 *
 * Uses typeorm-ts-node-commonjs + tsconfig.migration.json (CommonJS) to avoid
 * the ESM/CJS conflict caused by the project's "module": "nodenext" tsconfig.
 */
import { execSync } from 'child_process';

const name = process.argv[2] ?? 'Migration';
const outputPath = `src/shared/database/migrations/${name}`;

const cmd = [
  'TS_NODE_PROJECT=tsconfig.migration.json',
  'typeorm-ts-node-commonjs',
  '-d src/shared/database/cli.datasource.ts',
  `migration:generate ${outputPath}`,
].join(' ');

console.log(`→ ${cmd}\n`);
execSync(cmd, { stdio: 'inherit' });
