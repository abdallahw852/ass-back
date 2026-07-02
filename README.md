# ASAS OS — Backend

NestJS API for **ASAS OS**: a B2B marketplace-style platform (catalog, cart, orders, payments, suppliers, RFQ, messaging, and related flows). The codebase uses **bounded contexts** under `src/contexts/`, **CQRS** for application logic, and **Fastify** (not Express) as the HTTP server.

## Stack

| Area | Technology |
|------|------------|
| Runtime | Node.js, TypeScript |
| Framework | NestJS 11, Fastify 5 |
| Data | TypeORM, PostgreSQL |
| Caching & sessions | Redis (`@fastify/session` with Redis store) |
| Search | Elasticsearch |
| Auth | Session cookies + JWT-related config, Passport |
| Other | WebSockets (Socket.IO), Firebase (push), Twilio, OCI Object Storage, Paymob, PDF generation (pdfkit) |

**Database layout:** two TypeORM connections — `write` (primary, port **5432** by default) for commands, `read` (replica, port **5433** by default) for queries. In local Docker, read and write may point at the same instance; production typically uses a replica on 5433.

## Prerequisites

- **Node.js** (LTS recommended)
- **pnpm** (package manager for this repo)
- **Docker** and Docker Compose (recommended for PostgreSQL, Redis, and Elasticsearch locally)

## Quick start

1. **Clone and install**

   ```bash
   pnpm install
   ```

2. **Environment**

   Copy the example file and fill in secrets and third-party keys:

   ```bash
   cp .env.example .env
   ```

   Set `SESSION_SECRET` to a **string at least 32 characters** (required at startup). See `.env.example` for database ports, Redis, Elasticsearch, SMTP, Paymob, OCI, Twilio, Firebase, JWT, and CORS.

3. **Infrastructure (local)**

   From the repo root, start Postgres (write), Redis, Elasticsearch, and optionally the app container:

   ```bash
   docker compose up -d
   ```

   The default `docker-compose.yml` maps the API to port **3000** when the `app` service is used. Adjust `.env` so `REDIS_HOST`, `ELASTICSEARCH_NODE`, and DB hosts match how you run services (e.g. `localhost` when the API runs on the host, or service names when everything is in Compose).

4. **Migrations**

   Apply schema changes after entities change (do not hand-edit migration files; generate from entity diffs):

   ```bash
   pnpm run migration:run
   ```

5. **Run the API**

   ```bash
   pnpm run start:dev
   ```

   Default base URL: `http://localhost:3000` with global prefix from `API_PREFIX` (e.g. `api/v1` — see `.env.example`).

## Useful scripts

| Command | Purpose |
|--------|---------|
| `pnpm run start` | Start once (no watch) |
| `pnpm run start:dev` | Dev with file watch |
| `pnpm run start:debug` | Dev with debugger |
| `pnpm run start:prod` | Run compiled `dist/main` |
| `pnpm run build` | Compile the project |
| `pnpm run lint` | ESLint (with fix) |
| `pnpm test` | Unit tests (`*.spec.ts` under `src/`) — prefer `pnpm test -- --runInBand` in CI or constrained environments |
| `pnpm run test:e2e` | E2E tests (`test/*.e2e-spec.ts`) |
| `pnpm run test:cov` | Coverage |
| `pnpm run migration:generate -- src/shared/database/migrations/<Name>` | Generate migration from entity changes |
| `pnpm run migration:run` / `migration:revert` / `migration:show` | Apply, roll back, or list migrations |
| `pnpm run seed` | Run seed script (`scripts/seed.mjs`) |
| `pnpm run create-admin` | Create admin user (`scripts/create-admin.mjs`) |

## Project layout

- **`src/contexts/*`** — Feature modules (auth, catalog, product, cart, order, payment, supplier, search, etc.). Each context typically follows: `domain/`, `application/` (commands & queries with handlers), `infrastructure/`, `presentation/`.
- **`src/shared/`** — Cross-cutting code (database, guards, common utilities).
- **`test/`** — E2E tests.
- **`scripts/`** — Maintenance scripts (migrations helper, seed, create-admin).

Conventions (imports, DI, naming, migrations) for contributors are documented in `AGENTS.md`.

## Inquiry-based Cart System (Feature — v1)

The cart has been repurposed from a direct-checkout cart into an **RFQ-style inquiry cart** (no payment at checkout).

### New / modified bounded contexts

| Context | What changed |
|---------|-------------|
| `cart` | `unit_price` removed; `target_price`, `notes`, `product_image` added to `cart_items`. New tables `cart_supplier_groups` and `cart_attachments`. New endpoints: `PATCH /cart/suppliers/:id`, `POST /cart/suppliers/:id/attachments`, `DELETE /cart/suppliers/:id/attachments/:attachmentId`, `POST /cart/merge`, `POST /cart/suppliers/:id/inquiry`, `POST /cart/inquiries`. All protected by `BuyerGuard` + `send-inquiry` throttle (10 req/60 s). |
| `inquiry` (new) | Tables: `inquiries`, `inquiry_items`, `inquiry_attachments`. Endpoints: `GET /inquiries/me`, `GET /inquiries/incoming`, `GET /inquiries/:id`, `PATCH /inquiries/:id/reply`, `PATCH /inquiries/:id/close`. |
| `notification` (rebuilt) | Table: `notifications`. REST API + Socket.IO gateway on `/notifications` namespace. `InquiryNotificationListener` fires on `InquirySentEvent`/`InquiryRepliedEvent` to persist DB row, emit socket event, and send email. |

### Migrations applied

- `1778927958572-InquiryCartFeature` — repurposes cart tables
- `AddInquiryTables` — creates inquiry, inquiry_items, inquiry_attachments
- `AddNotificationsTable` — creates notifications

Run `pnpm run migration:run` to apply any pending migrations after pulling.

## License

`private` / **UNLICENSED** — for internal or authorized use only per your organization’s terms.
