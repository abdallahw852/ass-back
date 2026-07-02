# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Development (watch mode)
pnpm start:dev

# Build
pnpm build

# Start dev infrastructure (PostgreSQL write/read, Redis, Elasticsearch)
pnpm docker:dev

# Lint (auto-fix)
pnpm lint

# Run all unit tests (always use --runInBand)
pnpm test -- --runInBand

# Run a single test file
pnpm test -- --runInBand --testPathPattern="path/to/file.spec.ts"

# Run e2e tests
pnpm test:e2e
```

## Architecture

**Stack:** NestJS 11 + Fastify 5 + TypeORM + PostgreSQL, CQRS via `@nestjs/cqrs`, session auth via `@fastify/session` + Redis.

**Two database connections:**

- `'write'` — PostgreSQL on port 5432. Used by command handlers. `autoLoadEntities: true` picks up entities registered via `TypeOrmModule.forFeature([...], 'write')`.
- `'read'` — PostgreSQL on port 5433. Used by query handlers via read-model repositories. Auto-loads all `**/*.read-model{.ts,.js}` files.

**Bounded contexts** live in `src/contexts/` (26 total). Each follows this layer structure:

```
domain/          # Entities, value-objects, repository interfaces, exceptions, enums
application/     # Commands, queries, and their handlers
infrastructure/  # Repository implementations; ORM entities in persistence/ subdir
presentation/    # Controllers and DTOs
```

**Shared module** (`src/shared/shared.module.ts`) exports cross-cutting services: `EmailService`, `OtpService`, `RedisService`, `StorageService`, `StripeService`. Import `SharedModule` in any context module that needs these.

## Key Patterns

### CQRS database separation

Commands write to the write DB; queries read from the read DB:

- **Write repositories** use `@InjectRepository(Entity, 'write')` directly.
- **Read-model repositories** extend `ReadModelRepositoryBase` from `src/shared/infrastructure/persistence/read-model-repository.base.ts`, which uses `ConnectionService.getReadConnection()`. Read-model ORM entities are named `*.read-model.ts` (auto-loaded into the read connection).
- `ConnectionService` (in shared infrastructure) provides `getReadConnection()` and `getWriteConnection()` and can fall back from read → write if the read DB is unavailable.

### Repository DI

Repositories use Symbol tokens (e.g., `PRODUCT_REPOSITORY`). The module wires them with `useExisting`:

```ts
{ provide: PRODUCT_REPOSITORY, useExisting: ProductRepository }
```

Inject via `@Inject(TOKEN)` with `import type` for the interface:

```ts
import type { IProductRepository } from '../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../domain/product.repository.interface';

constructor(
  @Inject(PRODUCT_REPOSITORY)
  private readonly productRepo: IProductRepository,
) {}
```

`import type` is required — `isolatedModules: true` + `emitDecoratorMetadata` would emit broken metadata for plain interface imports.

### ORM entities

- Write-side ORM entities live in `infrastructure/persistence/*.orm-entity.ts`. Always use `@InjectRepository(Entity, 'write')`.
- Read-side ORM entities are named `infrastructure/*.read-model.ts` and should be used only via `ReadModelRepositoryBase`.
- UUID public IDs are auto-generated via `@BeforeInsert()`:
  ```ts
  @BeforeInsert()
  setDefaults(): void { this._id = this._id || randomUUID(); }
  ```
- Entities expose both an internal auto-increment `id` (PK, used for FK joins) and a public `_id` UUID (used in API routes/params).

### Session auth

Protected routes use `@UseGuards(SessionAuthGuard)`. Read the session user as:

```ts
const user = (
  req as FastifyRequest & {
    session: {
      user: { id: number; _id: string; email: string; role: string; verifiedAt: Date | null };
    };
  }
).session.user;
```

A global `VerifiedUserGuard` (registered via `APP_GUARD` in `AppModule`) blocks authenticated-but-unverified sessions on all routes except those marked `@AllowUnverified()` (from `src/shared/decorators/allow-unverified.decorator.ts`). The five allow-listed auth routes are: `POST /auth/register`, `POST /auth/verify-otp`, `POST /auth/request-otp`, `GET /auth/me`, `DELETE /auth/logout`.

### Exceptions

Each context has `domain/<context>.exceptions.ts` defining typed exceptions that extend NestJS HTTP exceptions. Throw these from handlers rather than generic `NotFoundException` / `BadRequestException`.

### File uploads

`StorageService` provides two storage backends:

- **OCI Object Storage** — `upload({ buffer, key, mimeType })` uploads to Oracle Cloud and returns the object URL. Use `getSignedUrl({ url, expiresIn? })` to generate a time-limited PAR URL (default 1 hour; use `StorageService.EMAIL_EXPIRES_IN` for 7-day email links).
- **Local fallback** — `storeLocalFile({ buffer, originalName, destinationDir })` returns a path string like `/uploads/products/uuid.jpg`. Files are stored under the `uploads/` directory at the project root.

Required env vars for OCI: `OCI_TENANCY_OCID`, `OCI_USER_OCID`, `OCI_FINGERPRINT`, `OCI_PRIVATE_KEY` (PEM with `\n` escaped as `\\n`), `OCI_REGION`, `OCI_NAMESPACE`, `OCI_BUCKET`.

### Database migrations

NEVER write migration files manually. Always use the TypeORM CLI to generate them:

1. Make entity changes.
2. Run `pnpm run migration:generate <MigrationName>` to auto-generate the migration diff.
3. Run `pnpm run migration:run` to apply pending migrations.
4. To undo, use `pnpm run migration:revert`.

### Context modules

Every context module must:

1. Import `CqrsModule` and `SharedModule` (if using shared services).
2. Register write-side ORM entities via `TypeOrmModule.forFeature([...], 'write')`.
3. List all command/query handlers and repositories as `providers`.
4. Export repository providers using `{ provide: TOKEN, useExisting: Impl }` for cross-context injection.

## Active Technologies
- TypeScript 5.x, Node.js 20+ (NestJS 11) + NestJS 11, Fastify 5, `@nestjs/cqrs`, TypeORM, `@fastify/session`, `@nestjs/throttler`, `@nestjs/jwt`, `bcrypt`, `class-validator`, `@nestjs/schedule` — all already in `package.json`. (001-password-otp-verification)
- PostgreSQL (write connection named `'write'` on port 5432). No read-model changes in this feature — per project guidance the read-model pattern is not used here. (001-password-otp-verification)

## Recent Changes
- 001-password-otp-verification: Added TypeScript 5.x, Node.js 20+ (NestJS 11) + NestJS 11, Fastify 5, `@nestjs/cqrs`, TypeORM, `@fastify/session`, `@nestjs/throttler`, `@nestjs/jwt`, `bcrypt`, `class-validator`, `@nestjs/schedule` — all already in `package.json`.
