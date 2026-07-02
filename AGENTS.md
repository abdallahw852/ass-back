# AGENTS.md

Guidance for agentic coding agents operating in this repository.

## Build / Lint / Test Commands

```bash
pnpm install                  # Install dependencies
pnpm build                    # Compile TypeScript (nest build)
pnpm lint                     # ESLint with --fix + Prettier enforcement
pnpm start:dev                # Dev server with watch mode

# Tests — ALWAYS use --runInBand
pnpm test -- --runInBand                                        # All unit tests
pnpm test -- --runInBand --testPathPattern="path/to/file.spec.ts"  # Single test
pnpm test:e2e                  # End-to-end tests (test/*.e2e-spec.ts)

# Database migrations — NEVER write manually
pnpm run migration:generate -- src/shared/database/migrations/<Name>  # Generate from entity diffs
pnpm run migration:run         # Apply pending migrations
pnpm run migration:revert      # Undo last migration
```

Always run `pnpm lint` and `pnpm build` after making changes to verify correctness.

## Tech Stack

NestJS 11 + Fastify 5 (NOT Express) + TypeORM + PostgreSQL + CQRS (`@nestjs/cqrs`) + session auth (`@fastify/session` + Redis).

Two DB connections: `'write'` (port 5432) for commands, `'read'` (port 5433) for queries.

## Project Structure

Bounded contexts live in `src/contexts/` with this layering:

```
domain/              # Entities (rich models), value objects, repository interfaces (Symbol tokens), exceptions, enums
application/         # commands/ (command.ts + handlers/ dir), queries/ (query.ts + handlers/ dir), ports/
infrastructure/      # Repository impls, persistence/*.orm-entity.ts, mappers/, *.read-model.ts
presentation/        # Controllers, DTOs
```

Handlers are grouped in a `handlers/` subdirectory inside their respective `commands/` or `queries/` directory.

## Code Style

### Formatting (enforced by Prettier via ESLint)

- Single quotes, trailing commas on all items
- No comments unless explicitly requested

### Imports

- **`import type` is mandatory** for interfaces used in DI. `isolatedModules: true` + `emitDecoratorMetadata: true` means plain interface imports produce broken emit metadata.
- Separate the Symbol token and the interface: one `import` for the value, one `import type` for the type:

```ts
import type { IProductRepository } from '../../domain/product.repository.interface';
import { PRODUCT_REPOSITORY } from '../../domain/product.repository.interface';
```

- Unused function parameters must be prefixed with `_` (ESLint rule).

### TypeScript

- Strict null checks, no implicit any, noFallthroughCasesInSwitch enabled.
- Target: ES2023, module: nodenext.
- `no-explicit-any` is OFF — `any` is allowed.
- Remove comments is enabled (`removeComments: true` in tsconfig) — do not write comments.

### Naming Conventions

- **Files:** kebab-case (`create-product.handler.ts`, `product.orm-entity.ts`)
- **Classes:** PascalCase (`CreateProductHandler`, `ProductOrmEntity`)
- **Commands:** `<Verb><Noun>Command` → `CreateProductCommand`
- **Queries:** `<Verb><Noun>Query` → `ListProductsQuery`
- **Handlers:** `<Verb><Noun>Handler` → `CreateProductHandler`
- **ORM entities:** `<Name>OrmEntity` in `*.orm-entity.ts` files
- **Read models:** `<Name>ReadModel` in `*.read-model.ts` files
- **Repository interfaces:** `I<Name>Repository` with a matching `Symbol` export
- **Exceptions:** `<Name><NotFoundException|ConflictException|...>` in `domain/<context>.exceptions.ts`
- **DTOs:** `<Action><Resource>Dto` with `class-validator` decorators

### Error Handling

- Use context-specific exceptions from `domain/<context>.exceptions.ts`, NOT generic NestJS exceptions.
- Each bounded context defines its own exception classes extending NestJS HTTP exceptions.

### Decorators & DI

- All injected dependencies are `private readonly`.
- Repositories injected via `@Inject(SYMBOL_TOKEN)`.
- Write repos: `@InjectRepository(Entity, 'write')`.
- Read repos: extend `ReadModelRepositoryBase<T>` from shared.

### Domain Entities

- Private constructor + `static create()` for new instances + `static reconstitute()` for reconstitution from DB.
- All fields private with `get` accessors (immutable from outside).
- Defensive copies on array getters: `return [...this._items]`.
- ORM entities use auto-increment `id` (PK, for FK joins) + UUID `_id` (public, for API routes).
- UUID generated in `@BeforeInsert()`: `this._id = this._id || randomUUID()`.

### Controllers

- Fastify-based — use `FastifyRequest` from `fastify`, NOT Express.
- Session user typed as inline intersection: `FastifyRequest & { session: { user: { id, _id, email, role } } }`.
- Protected routes use `@UseGuards(SessionAuthGuard)`.
- Dispatch via injected `CommandBus` / `QueryBus`.

### Module Wiring

Every context module must:

1. Import `CqrsModule` and `SharedModule` (if using shared services).
2. Register write-side ORM entities via `TypeOrmModule.forFeature([...], 'write')`.
3. List all command/query handlers and repositories as `providers`.
4. Export repository providers: `{ provide: TOKEN, useExisting: Impl }`.

### Database Migrations

NEVER write migration files manually. Always:

1. Make entity changes.
2. `pnpm run migration:generate -- src/shared/database/migrations/<MigrationName>`
3. `pnpm run migration:run` to apply.
4. `pnpm run migration:revert` to undo.

### Testing Patterns

- Test files: `*.spec.ts` (unit) alongside source, `*.e2e-spec.ts` in `test/`.
- Standard NestJS `Test.createTestingModule()` with manual mocks.
- External deps mocked at module level with `jest.mock()`.
- Mock functions: `jest.fn().mockResolvedValue()`.
- Uses `beforeEach` for module setup and mock clearing.
