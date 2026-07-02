# Implementation Plan: Password + Email OTP Verification for Signup & Access Control

**Branch**: `001-password-otp-verification` | **Date**: 2026-04-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-password-otp-verification/spec.md`

## Summary

Transition the application's authentication from OTP-as-login to **password + email-OTP verification**. New users register with email + password, receive a 6-digit OTP over email, and must verify before any protected endpoint is reachable. A new global `VerifiedUserGuard` enforces the verification gate on every route except a small, explicitly-enumerated allow-list (`POST /auth/verify-otp`, `POST /auth/request-otp`, `POST /auth/set-initial-password`, `GET /auth/me`, `DELETE /auth/logout`). Legacy accounts migrate via a `requiresPasswordSetup` flag and a one-time bootstrap endpoint, so no user is locked out. The existing `users.is_verified` boolean is replaced by a single nullable `verified_at` timestamp (non-null ⇒ verified), and `auth_otp_codes` gains a `purpose` column to support future non-signup uses without another migration.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (NestJS 11)
**Primary Dependencies**: NestJS 11, Fastify 5, `@nestjs/cqrs`, TypeORM, `@fastify/session`, `@nestjs/throttler`, `@nestjs/jwt`, `bcrypt`, `class-validator`, `@nestjs/schedule` — all already in `package.json`.
**Storage**: PostgreSQL (write connection named `'write'` on port 5432). No read-model changes in this feature — per project guidance the read-model pattern is not used here.
**Testing**: Jest. Unit tests (colocated `*.spec.ts`) and e2e tests (`test/*.e2e-spec.ts`). TDD is mandatory per constitution Principle II — failing test first, then the code. `pnpm test -- --runInBand` is the only sanctioned runner.
**Target Platform**: Linux server (production), Windows/macOS/Linux for local dev. Local container runtime is Podman.
**Project Type**: NestJS modular monolith with DDD/CQRS bounded contexts. Changes confined to the `auth` context (`src/contexts/auth/`) plus one shared guard (`src/shared/infrastructure/guards/verified-user.guard.ts`) and one session-shape update reflected in `src/shared/infrastructure/guards/session-auth.guard.ts` and CLAUDE.md's canonical session cast.
**Performance Goals**: Per constitution Principle IV — write endpoints p95 ≤ 400 ms; login's bcrypt cost (12 rounds, ~250 ms) is budgeted within this envelope. Read endpoints unaffected by this feature (`GET /auth/me` remains p95 ≤ 200 ms).
**Constraints**:

- Session payload is read-only in the hot path — no DB round-trip per authenticated request (Principle IV).
- Plaintext passwords and plaintext OTPs MUST NOT appear in logs, error payloads, or audit records (FR-026, SC-007).
- Responses to `/register`, `/login`, and `/request-otp` MUST be timing-equalised against email enumeration (FR-006).
- Every existing protected endpoint MUST continue to require a verified session *without* per-controller changes (global guard).
**Scale/Scope**:

- Single bounded context edit (`auth`) plus one shared-guard addition.
- ~10 new/edited source files, ~8 new spec files, ~2 new e2e tests, 1 generated migration.
- User base: whatever already exists in `users`. Legacy accounts auto-migrate via the `requiresPasswordSetup` flag — no manual data entry.

## Constitution Check

| Principle | Gate | How this plan satisfies it |
| --- | --- | --- |
| I. Code Quality & Maintainability | DDD layering is preserved; domain logic lives in the `UserAggregate` (new methods `register`, `setInitialPassword`, `verifyEmail`); application handlers are thin; ORM lives only in `infrastructure/`. | Ports (`PasswordPort`) stay in `application/ports/`; adapters (`BcryptPasswordAdapter`) stay in `infrastructure/`. Repositories injected via Symbol tokens with `import type` (existing convention). |
| II. Testing Standards (NON-NEGOTIABLE) | Every new handler ships with a colocated `*.spec.ts`; every new/changed HTTP endpoint ships with an e2e. The full suite runs with `--runInBand`. Test doubles go through repository interfaces — no ORM mocking. | See `research.md §11` for the full list. |
| III. API Consistency (UX) | New endpoints follow `POST /auth/<verb>` shape, use the shared error envelope, use `id` (UUID) as the public identifier in all JSON bodies, use `class-validator` DTOs, and use `@UseGuards(SessionAuthGuard)` where a session is required. No bespoke auth-reading logic. | See `contracts/auth-endpoints.md`. |
| IV. Performance Requirements | Global guard reads `session.user.verifiedAt` — no DB hit per request. Bcrypt cost fits within p95 ≤ 400 ms. Throttler uses existing Redis. New index on `auth_otp_codes (email, purpose)` is justified by the actual lookup pattern. | See `research.md §1, §3, §6`. |
| Security | Passwords bcrypt-hashed (cost 12), OTPs bcrypt-hashed at rest, no plaintext in logs, `console.log` of OTP removed, sessions stay `httpOnly; secure`, Paymob webhook HMAC behavior unchanged. | See `research.md §12`. |
| Data integrity | Migration is generated via `pnpm run migration:generate` (not hand-written). UUIDs remain generated in `@BeforeInsert()`. | See `data-model.md §2`. |

**Gate status**: PASS. No deviations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/001-password-otp-verification/
├── plan.md                         # This file
├── spec.md                         # Feature spec (done in /speckit.specify)
├── research.md                     # Phase 0 — decisions + rationale
├── data-model.md                   # Phase 1 — schema, aggregates, events
├── contracts/
│   └── auth-endpoints.md           # Phase 1 — HTTP contract for /auth/*
├── quickstart.md                   # Phase 1 — end-to-end smoke-test guide
├── checklists/
│   └── requirements.md             # Spec quality checklist (from /speckit.specify)
└── tasks.md                        # Created by /speckit.tasks (NOT by this command)
```

### Source Code (repository root)

```text
src/
├── contexts/
│   └── auth/                                           # ALL aggregate-level changes confined here
│       ├── domain/
│       │   ├── aggregates/
│       │   │   └── user.aggregate.ts                   # EDIT: add register(), setInitialPassword(), verifyEmail(), isVerified getter
│       │   ├── entities/
│       │   │   └── user-account.entity.ts              # EDIT: replace isVerified boolean with verifiedAt timestamp
│       │   ├── events/
│       │   │   ├── user-registered.event.ts            # NEW
│       │   │   ├── password-set.event.ts               # NEW
│       │   │   ├── otp-issued.event.ts                 # NEW
│       │   │   ├── otp-verified.event.ts               # NEW
│       │   │   ├── login-succeeded.event.ts            # NEW
│       │   │   ├── login-failed.event.ts               # NEW
│       │   │   └── access-denied-unverified.event.ts   # NEW
│       │   ├── value-objects/
│       │   │   └── password-policy.ts                  # NEW — PasswordPolicy frozen record + validator
│       │   ├── auth.exceptions.ts                      # FILL (currently empty): typed exceptions for each error code in the contract
│       │   └── repositories/
│       │       ├── user.repository.interface.ts        # EDIT: findByEmailAndPurpose omitted; keep findByEmail
│       │       └── otp-code.repository.interface.ts    # EDIT: add findLatestByEmailAndPurpose, invalidateActiveByEmailAndPurpose
│       ├── application/
│       │   ├── ports/
│       │   │   └── password.port.ts                    # FILL (currently empty): hash(password), compare(password, hash)
│       │   ├── commands/
│       │   │   ├── register-user.command.ts            # EXISTS — ensure shape includes accountType
│       │   │   ├── register-user.handler.ts            # FILL (currently empty): creates or rehydrates unverified row, issues OTP
│       │   │   ├── login.command.ts                    # EXISTS
│       │   │   ├── login.handler.ts                    # FILL (currently empty): verify password, check verifiedAt, issue session
│       │   │   ├── set-initial-password.command.ts     # NEW
│       │   │   ├── set-initial-password.handler.ts     # NEW
│       │   │   └── handlers/
│       │   │       ├── request-otp.handler.ts          # EDIT: purpose column, remove `console.log(code)`, adapt to anti-enumeration
│       │   │       └── verify-otp.handler.ts           # EDIT: purpose filter, atomic consumption, passwordSetupRequired response
│       │   └── queries/
│       │       └── handlers/get-current-user.handler.ts # EDIT: return verifiedAt, role
│       ├── infrastructure/
│       │   ├── bcrypt-password.adapter.ts              # FILL (currently empty): BcryptPasswordAdapter implementing PasswordPort
│       │   └── persistence/
│       │       ├── user.orm-entity.ts                  # EDIT: add passwordHash, requiresPasswordSetup, verifiedAt, lastPasswordChangedAt; drop isVerified
│       │       ├── otp-code.orm-entity.ts              # EDIT: add purpose (non-null, default 'signup_verification'), userId (nullable FK)
│       │       ├── user.repository.ts                  # EDIT: new methods
│       │       └── otp-code.repository.ts              # EDIT: new methods
│       ├── presentation/
│       │   ├── auth.controller.ts                      # EDIT: wire /register, /login, /set-initial-password, keep /verify-otp/ /request-otp /me /logout; add @AllowUnverified on the allow-list
│       │   └── dto/
│       │       ├── register.dto.ts                     # FILL (currently empty): email, password, accountType with class-validator + PasswordPolicy rule
│       │       ├── login.dto.ts                        # FILL (currently empty): email, password
│       │       ├── set-initial-password.dto.ts         # NEW
│       │       ├── request-otp.dto.ts                  # EDIT: removed admin accountType if redundant
│       │       └── verify-otp.dto.ts                   # EDIT: drop accountType (role is on record)
│       └── auth.module.ts                              # EDIT: wire new handlers, PasswordPort, throttler profiles
│
└── shared/
    ├── infrastructure/
    │   └── guards/
    │       ├── verified-user.guard.ts                  # NEW — global guard, reads session.user.verifiedAt, honours @AllowUnverified
    │       └── session-auth.guard.ts                   # EDIT: session.user shape now carries verifiedAt
    └── decorators/
        └── allow-unverified.decorator.ts               # NEW — marks routes reachable by unverified sessions

src/app.module.ts                                       # EDIT: register VerifiedUserGuard via APP_GUARD (composed after SessionAuthGuard)

src/shared/database/migrations/
└── <timestamp>-AddPasswordOtpVerification.ts           # GENERATED via `pnpm run migration:generate`

test/
└── auth-password-otp.e2e-spec.ts                       # NEW — signup → OTP → verify → protected-route → login; plus unverified-blocked case; plus legacy migration
```

**Structure Decision**: No new top-level directories. Every change is confined to the existing `src/contexts/auth/` DDD layering (domain / application / infrastructure / presentation) plus one shared guard + one shared decorator + one `AppModule` wire-up. This matches the constitution's Principle I (layering) and minimises blast radius.

## Phase 2 (preview — executed by `/speckit.tasks`)

The tasks file will be generated by `/speckit.tasks`, not by this command. The expected ordering (TDD per Principle II) is:

1. Write failing unit tests for `PasswordPolicy` + `BcryptPasswordAdapter` → implement.
2. Write failing unit test + implementation for `VerifiedUserGuard` + `@AllowUnverified`.
3. Generate the migration (`pnpm run migration:generate`), review the diff, run it locally.
4. Write failing unit tests for each handler (`register-user`, `login`, `set-initial-password`, updated `verify-otp`, updated `request-otp`) → implement.
5. Update the `auth.controller.ts` and DTOs; register throttler profiles in the module.
6. Wire `VerifiedUserGuard` globally in `AppModule`; add `@AllowUnverified` to the five exempt routes.
7. Write e2e covering the full journey + the unverified-block case + the legacy bootstrap.
8. Run `pnpm lint` and `pnpm test -- --runInBand`; clear all diagnostics.

## Complexity Tracking

No constitution gates violated. No entries required.
