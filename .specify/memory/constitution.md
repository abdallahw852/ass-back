<!--
SYNC IMPACT REPORT
==================
Version change: (template / unratified) → 1.0.0
Bump rationale: Initial ratification. Replacing placeholder template with concrete principles.

Modified principles:
  - [PRINCIPLE_1_NAME] → I. Code Quality & Maintainability (new)
  - [PRINCIPLE_2_NAME] → II. Testing Standards (NON-NEGOTIABLE) (new)
  - [PRINCIPLE_3_NAME] → III. API Consistency (User Experience) (new)
  - [PRINCIPLE_4_NAME] → IV. Performance Requirements (new)
  - [PRINCIPLE_5_NAME] → (removed — user requested 4 principles)

Added sections:
  - Additional Standards (security, observability, data integrity)
  - Development Workflow & Quality Gates
  - Governance

Removed sections:
  - Fifth principle slot (intentional — user scope is 4 principles)

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check gate references this file generically; no edits required.
  - ✅ .specify/templates/spec-template.md — functional/success-criteria structure aligns with Principles III & IV; no edits required.
  - ✅ .specify/templates/tasks-template.md — task categorization already covers testing, polish/perf, and cross-cutting concerns; no edits required.
  - ✅ CLAUDE.md — runtime guidance aligns with Principle I (DDD/CQRS patterns) and Principle II (test commands); no edits required.

Follow-up TODOs: none.
-->

# ASAS OS Backend Constitution

## Core Principles

### I. Code Quality & Maintainability

Every change MUST preserve the project's Domain-Driven Design and CQRS boundaries
as codified in [CLAUDE.md](../../CLAUDE.md): `domain/` holds entities,
value-objects, and repository interfaces; `application/` holds commands, queries,
and handlers; `infrastructure/` holds persistence and adapters; `presentation/`
holds controllers and DTOs. Cross-layer leaks (e.g., ORM entities in domain, HTTP
types in handlers) are prohibited.

Non-negotiable rules:

- Repositories MUST be injected via Symbol tokens with `import type` for
  interfaces; concrete implementations are wired via
  `{ provide: TOKEN, useExisting: Impl }`.
- Domain exceptions MUST extend the context's typed exception hierarchy
  (`domain/<context>.exceptions.ts`); generic `NotFoundException` /
  `BadRequestException` at the presentation layer is prohibited for business
  errors.
- Migration files MUST be generated via `pnpm run migration:generate` —
  hand-written migrations are prohibited.
- `pnpm lint` MUST pass with zero errors before merge. New code MUST NOT
  introduce compiler errors beyond the pre-existing baseline documented in
  project memory.
- New abstractions MUST be justified by current need, not speculation. Three
  similar lines is preferred to a premature abstraction.

**Rationale**: Twenty-six bounded contexts can only remain navigable if the
layering, DI, and exception contracts are enforced uniformly. Drift in any one
context becomes cargo-culted into the next.

### II. Testing Standards (NON-NEGOTIABLE)

Tests are a correctness gate, not documentation. Every command handler, query
handler, and domain-logic-bearing service MUST ship with unit tests in a
colocated `*.spec.ts` file. Every HTTP-exposed endpoint that performs a write or
crosses a context boundary MUST have an e2e test.

Non-negotiable rules:

- The full suite (`pnpm test -- --runInBand`) MUST pass before merge to `main`
  or `dev`. `--runInBand` is required — parallel jest runs are prohibited
  because shared DB/Redis fixtures collide.
- Test doubles MUST NOT mock the ORM. Use in-memory fakes of the repository
  **interface** instead, so refactors of the implementation cannot silently
  break contracts.
- Regressions MUST be captured by a failing test BEFORE the fix is written. A
  bug fix commit without an accompanying test is grounds for revert.
- Tests MUST be deterministic: no time-of-day assertions, no network calls, no
  reliance on test execution order.
- New public endpoints MUST have at least one e2e test covering the happy path
  and one covering the primary auth-failure or validation-failure case.

**Rationale**: A handler that looks correct in isolation can still produce
divergent state under concurrency or schema drift. Only a disciplined,
fast-running suite catches this before production.

### III. API Consistency (User Experience)

Every HTTP endpoint MUST present a consistent surface to clients. Inconsistency
across 26 contexts is the primary source of integration bugs and support load.

Non-negotiable rules:

- Public resource identifiers exposed in routes, request bodies, and responses
  MUST be the UUID `_id` field. The internal auto-increment `id` MUST NEVER
  appear in any API payload or URL.
- Routes MUST follow RESTful nouns and HTTP verbs: `POST /<resource>`,
  `GET /<resource>/:id`, `PATCH /<resource>/:id`, `DELETE /<resource>/:id`.
  Verbs in URLs (e.g., `/createProduct`) are prohibited except for explicit
  action endpoints that have no natural REST shape.
- Error responses MUST use the typed domain exceptions from
  `domain/<context>.exceptions.ts` so status codes, error codes, and messages
  are uniform across contexts.
- DTOs MUST be validated via `class-validator` at the controller boundary. Raw
  `any`-typed request bodies in controllers are prohibited.
- Authenticated routes MUST use `@UseGuards(SessionAuthGuard)` and read the
  session user via the canonical cast documented in
  [CLAUDE.md](../../CLAUDE.md). Bespoke auth-reading logic is prohibited.
- Response field naming MUST be `camelCase`. Field names and shapes for a
  shared concept (e.g., a supplier summary) MUST be identical everywhere that
  concept is returned.

**Rationale**: The API is the product's external contract. Consistency is the
only way a frontend or mobile team can learn the API once instead of 26 times,
and the only way a breaking change can be spotted in review.

### IV. Performance Requirements

Performance is a feature. Every change MUST be evaluated against the targets
below before merge; regressions against these targets MUST be called out in the
PR description with justification.

Non-negotiable rules:

- Read endpoints MUST serve p95 ≤ 200 ms and p99 ≤ 500 ms under the current
  production traffic profile. Write endpoints MUST serve p95 ≤ 400 ms.
- N+1 query patterns are prohibited. New list endpoints MUST use explicit
  joins, `IN` lookups, or batched loads; reviewers MUST verify with query logs
  when in doubt.
- List endpoints MUST paginate. Unbounded result sets exposed to clients are
  prohibited.
- Every new index MUST be introduced via a generated migration and MUST be
  justified by an actual query pattern. Speculative indexes are prohibited.
- File uploads MUST stream to `StorageService` — buffering entire files in
  memory beyond the Fastify multipart limit is prohibited.
- Long-running work (> 500 ms sync wall time) MUST be moved to an async path
  (queue, webhook, background job) rather than blocking the request.

**Rationale**: Request latency compounds across user journeys; a 500 ms
regression in one hot endpoint translates to seconds of perceived slowness.

## Additional Standards

- **Security**: Paymob webhook signatures (HMAC) MUST be verified before any
  state mutation. Session cookies MUST remain `httpOnly` and `secure` in
  production. Secrets MUST come from environment variables and MUST NOT be
  committed.
- **Observability**: Command and query handlers SHOULD emit structured logs at
  start and completion with the correlation ID. Exceptions MUST propagate to
  the global filter; swallowing errors silently is prohibited.
- **Data integrity**: UUID generation for public `_id` fields MUST happen in a
  `@BeforeInsert()` hook. Hand-rolled UUIDs at the controller or service layer
  are prohibited.
- **File storage**: Prefer OCI Object Storage in production paths;
  `storeLocalFile` is permitted only in dev/fallback flows.

## Development Workflow & Quality Gates

1. All work MUST be performed on a feature branch; direct commits to `main`
   are prohibited.
2. Before opening a PR: `pnpm lint` and `pnpm test -- --runInBand` MUST both
   pass locally.
3. Every PR MUST include a "Constitution Check" section confirming the four
   principles are respected, or listing deviations with justification under a
   "Complexity Tracking" entry as defined in the plan template.
4. PRs that add or modify a public endpoint MUST include an e2e test.
5. PRs that touch migrations MUST include the generated migration file and a
   note confirming `migration:run` succeeded locally.
6. Reviewers MUST block on violations of Principles I–IV unless the author
   documents a justified deviation.

## Governance

This constitution supersedes ad-hoc conventions. When it conflicts with a
comment, a README, or a verbal agreement, this document wins.

- **Amendments**: Any principle change requires a PR modifying this file, a
  version bump per the rules below, and an updated Sync Impact Report at the
  top.
- **Versioning policy**: MAJOR = backward-incompatible principle removal or
  redefinition; MINOR = new principle or materially expanded guidance;
  PATCH = clarifications, typos, non-semantic refinements.
- **Compliance review**: Every PR review MUST verify alignment with the four
  core principles. Systematic drift detected across multiple PRs MUST trigger a
  constitution amendment rather than silent tolerance.
- **Runtime guidance**: Day-to-day implementation guidance lives in
  [CLAUDE.md](../../CLAUDE.md). This constitution governs the *rules*;
  CLAUDE.md documents the *mechanics*.

**Version**: 1.0.0 | **Ratified**: 2026-04-17 | **Last Amended**: 2026-04-17
