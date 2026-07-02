---

description: "Tasks for feature 001-password-otp-verification"
---

# Tasks: Password + Email OTP Verification for Signup & Access Control

**Input**: Design documents in [/specs/001-password-otp-verification/](.)
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/auth-endpoints.md](./contracts/auth-endpoints.md), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED. Constitution Principle II is non-negotiable (TDD). Every handler test is written FIRST and MUST FAIL before the implementation task is started. The user input to `/speckit.plan` confirmed TDD/DDD/CQRS as the working method.

**Organization**: Tasks are grouped by user story (US1–US5 from [spec.md](./spec.md)). Each story is independently testable per its acceptance criteria.

## Format: `[ID] [P?] [Story] Description`

- `[P]` — parallelisable (different files, no dependency on an incomplete task)
- `[Story]` — `[US1]`–`[US5]` (only on user-story phases)
- File paths are absolute relative to the repo root

## Path Conventions

This is a NestJS monorepo with one bounded context affected: `src/contexts/auth/`. One shared guard and decorator are added under `src/shared/`. Test files are colocated `*.spec.ts` for unit tests and live under `test/` for e2e.

---

## Phase 1: Setup

**Purpose**: Static assets and tooling needed by the feature. This phase is small — the project is already initialised.

- [x] T001 [P] Create breached-password denylist file at [resources/breached-passwords-top1000.txt](../../resources/breached-passwords-top1000.txt) (one password per line, top 1000 from a public breach corpus). Add `resources/` to the project root if it does not exist.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, domain primitives, repository surfaces, the access-control gate, and DI wiring that EVERY user story depends on. No user-story work begins until this phase is green.

**⚠️ CRITICAL**: Migration generation (T013) MUST run after the ORM-entity edits (T009, T010) and before any handler work in Phase 3+.

### Domain primitives (TDD: spec first, then implementation)

- [x] T002 [P] Write failing unit spec for `PasswordPolicy` (length bounds, character classes, denylist hit, denylist miss) at [src/contexts/auth/domain/value-objects/password-policy.spec.ts](../../src/contexts/auth/domain/value-objects/password-policy.spec.ts)
- [x] T003 [P] Write failing unit spec for `BcryptPasswordAdapter` (hash/verify round-trip, wrong-password rejection, hash format check) at [src/contexts/auth/infrastructure/bcrypt-password.adapter.spec.ts](../../src/contexts/auth/infrastructure/bcrypt-password.adapter.spec.ts)
- [x] T004 [P] Implement `PasswordPolicy` frozen record + `validate(password): { valid: boolean; violations: string[] }` at [src/contexts/auth/domain/value-objects/password-policy.ts](../../src/contexts/auth/domain/value-objects/password-policy.ts) (resolves T002)
- [x] T005 [P] Define `PasswordPort` interface (`hash(plain: string): Promise<string>`, `compare(plain: string, hash: string): Promise<boolean>`, `dummyHash(plain: string): Promise<void>`) and Symbol token `PASSWORD_PORT` at [src/contexts/auth/application/ports/password.port.ts](../../src/contexts/auth/application/ports/password.port.ts)
- [x] T006 [P] Implement `BcryptPasswordAdapter` (cost 12) implementing `PasswordPort` at [src/contexts/auth/infrastructure/bcrypt-password.adapter.ts](../../src/contexts/auth/infrastructure/bcrypt-password.adapter.ts) (resolves T003; depends on T005)
- [x] T007 [P] Define typed domain exceptions for every error code in [contracts/auth-endpoints.md](./contracts/auth-endpoints.md) (`AuthInvalidCredentialsException`, `AuthUserNotVerifiedException`, `AuthOtpInvalidOrExpiredException`, `AuthOtpLockedException`, `AuthOtpResendCooldownException`, `AuthRateLimitedException`, `AuthAccountTypeMismatchException`, `AuthPasswordSetupRequiredException`, `AuthPasswordPolicyViolationException`) at [src/contexts/auth/domain/auth.exceptions.ts](../../src/contexts/auth/domain/auth.exceptions.ts) (currently empty)

### Domain events

- [x] T008 [P] Add new domain events (`UserRegisteredEvent`, `PasswordSetEvent`, `OtpIssuedEvent`, `OtpVerifiedEvent`, `LoginSucceededEvent`, `LoginFailedEvent`, `AccessDeniedUnverifiedEvent`) under [src/contexts/auth/domain/events/](../../src/contexts/auth/domain/events/) following the existing event-base pattern (one file per event)

### ORM entities, repositories, migration

- [x] T009 Edit `UserOrmEntity` to add `passwordHash` (varchar nullable), `requiresPasswordSetup` (boolean default false), `verifiedAt` (timestamptz nullable), `lastPasswordChangedAt` (timestamptz nullable) and **drop `isVerified`** at [src/contexts/auth/infrastructure/persistence/user.orm-entity.ts](../../src/contexts/auth/infrastructure/persistence/user.orm-entity.ts). Update `setDefaults()` accordingly.
- [x] T010 [P] Edit `OtpCodeOrmEntity` to add `purpose` (varchar(32) non-null default `'signup_verification'`) and `userId` (int nullable FK) plus `@Index(['email','purpose'])` at [src/contexts/auth/infrastructure/persistence/otp-code.orm-entity.ts](../../src/contexts/auth/infrastructure/persistence/otp-code.orm-entity.ts)
- [x] T011 Update `IUserRepository` and `UserRepository` to expose new methods needed downstream: `findByEmailIncludingUnverified(email)`, `updateVerification(id, verifiedAt)`, `updatePassword(id, passwordHash, lastPasswordChangedAt)`, `markRequiresPasswordSetup(id, value)` at [src/contexts/auth/domain/repositories/user.repository.interface.ts](../../src/contexts/auth/domain/repositories/user.repository.interface.ts) and [src/contexts/auth/infrastructure/persistence/user.repository.ts](../../src/contexts/auth/infrastructure/persistence/user.repository.ts) (depends on T009)
- [x] T012 Update `IOtpCodeRepository` and `OtpCodeRepository` to add `findLatestByEmailAndPurpose(email, purpose)`, `invalidateActiveByEmailAndPurpose(email, purpose)`, atomic `consumeById(id)` (returns boolean for race-safety) at [src/contexts/auth/domain/repositories/otp-code.repository.interface.ts](../../src/contexts/auth/domain/repositories/otp-code.repository.interface.ts) and [src/contexts/auth/infrastructure/persistence/otp-code.repository.ts](../../src/contexts/auth/infrastructure/persistence/otp-code.repository.ts) (depends on T010)
- [x] T013 Generate the migration: run `pnpm run migration:generate -- src/shared/database/migrations/AddPasswordOtpVerification`, then hand-add the backfill statements documented in [data-model.md §2 and §3](./data-model.md) (set `verified_at` from `updated_at` where `is_verified = true`, set `requires_password_setup = true` where `password_hash IS NULL`, set `purpose = 'signup_verification'` where null) BEFORE the `is_verified` drop. Apply with `WRITE_DB_HOST=localhost pnpm run migration:run`. (depends on T009, T010)

### Aggregate updates

- [x] T014 Write failing unit spec for `UserAggregate` new behaviour (`register`, `setInitialPassword`, `verifyEmail` idempotence, `isVerified` getter, invariant: `passwordHash` required when `requiresPasswordSetup` is false) at [src/contexts/auth/domain/aggregates/user.aggregate.spec.ts](../../src/contexts/auth/domain/aggregates/user.aggregate.spec.ts)
- [x] T015 Update `UserAggregate` (add `register(email, passwordHash)`, `setInitialPassword(passwordHash)`, `verifyEmail(now)`, `isVerified()` derived from `verifiedAt !== null`; emit events from T008) at [src/contexts/auth/domain/aggregates/user.aggregate.ts](../../src/contexts/auth/domain/aggregates/user.aggregate.ts) and [src/contexts/auth/domain/entities/user-account.entity.ts](../../src/contexts/auth/domain/entities/user-account.entity.ts) (resolves T014)

### Access-control gate

- [x] T016 [P] Add `@AllowUnverified()` decorator + `ALLOW_UNVERIFIED_KEY` reflector metadata constant at [src/shared/decorators/allow-unverified.decorator.ts](../../src/shared/decorators/allow-unverified.decorator.ts)
- [x] T017 Write failing unit spec for `VerifiedUserGuard` (verified session passes, unverified session throws `AuthUserNotVerifiedException`, `@AllowUnverified` route bypasses, missing session falls through to `SessionAuthGuard`'s 401) at [src/shared/infrastructure/guards/verified-user.guard.spec.ts](../../src/shared/infrastructure/guards/verified-user.guard.spec.ts)
- [x] T018 Implement `VerifiedUserGuard` reading `session.user.verifiedAt` and honouring `@AllowUnverified` via `Reflector` at [src/shared/infrastructure/guards/verified-user.guard.ts](../../src/shared/infrastructure/guards/verified-user.guard.ts) (resolves T017)
- [x] T019 Update `SessionAuthGuard` session-user shape to include `verifiedAt: Date | null` at [src/shared/infrastructure/guards/session-auth.guard.ts](../../src/shared/infrastructure/guards/session-auth.guard.ts) (no behaviour change — type only)
- [x] T020 Register `VerifiedUserGuard` globally in `AppModule` via `APP_GUARD`, ordered AFTER `SessionAuthGuard`, at [src/app.module.ts](../../src/app.module.ts)
- [x] T021 Update CLAUDE.md canonical session cast snippet (Session auth section) to add `verifiedAt: Date | null` to the documented session-user shape at [CLAUDE.md](../../CLAUDE.md)

### Throttler profiles

- [x] T022 [P] Configure two named throttler profiles (`otp-issue`: 5/hour/email, 20/hour/IP; `login`: 10 failures/15min per `{email}:{ip}` pair, success resets) backed by Redis storage in `AuthModule` at [src/contexts/auth/auth.module.ts](../../src/contexts/auth/auth.module.ts)

**Checkpoint**: Foundation green. `pnpm test -- --runInBand` passes for all foundational specs (T002, T003, T014, T017). Migration applied. User-story phases can proceed.

---

## Phase 3: User Story 1 — Sign up with password + verify email via OTP (Priority: P1) 🎯 MVP

**Goal**: A new visitor can register with email + password + accountType, receive an OTP, submit it, and obtain a verified session.

**Independent Test**: Run steps 4–5 of [quickstart.md](./quickstart.md). Body of the verify response carries `user.verifiedAt` set and a `sid` cookie is issued.

### Tests for User Story 1 (TDD — write FIRST, MUST fail)

- [x] T023 [P] [US1] Failing unit spec for `RegisterUserHandler` covering: new email → user row created with `accountType` mapped to `role`, password hashed, OTP issued; existing unverified email with same accountType → row reused, password rehashed, fresh OTP issued, prior OTPs invalidated; existing verified email → no user change, no OTP, dummy hash for timing equalisation; `accountType` mismatch on existing unverified → throws `AuthAccountTypeMismatchException`; password failing policy → throws `AuthPasswordPolicyViolationException` at [src/contexts/auth/application/commands/register-user.handler.spec.ts](../../src/contexts/auth/application/commands/register-user.handler.spec.ts)
- [x] T024 [P] [US1] Failing unit spec for the updated `VerifyOtpHandler` covering: success consumes OTP atomically and sets `verifiedAt`; wrong code increments `attempts`; expired code rejected; locked-attempts code rejected with `AuthOtpLockedException`; consumed code returns indistinguishable `AuthOtpInvalidOrExpiredException`; legacy account (`requiresPasswordSetup=true`) returns `passwordSetupRequired=true` + `passwordSetupToken` and issues NO session at [src/contexts/auth/application/commands/handlers/verify-otp.handler.spec.ts](../../src/contexts/auth/application/commands/handlers/verify-otp.handler.spec.ts)
- [x] T025 [P] [US1] Failing e2e covering: register → fetch logged OTP → verify → call `GET /cart` → 200 OK at [test/auth-password-otp.e2e-spec.ts](../../test/auth-password-otp.e2e-spec.ts)

### Implementation for User Story 1

- [x] T026 [P] [US1] Fill `register-user.command.ts` (carries `email`, `password`, `accountType: 'buyer' | 'supplier'`) at [src/contexts/auth/application/commands/register-user.command.ts](../../src/contexts/auth/application/commands/register-user.command.ts)
- [x] T027 [P] [US1] Fill `register.dto.ts` with `class-validator` decorators (`@IsEmail`, `@IsIn(['buyer','supplier'])`, custom `@IsPasswordPolicyCompliant` driven by `PasswordPolicy.validate`) at [src/contexts/auth/presentation/dto/register.dto.ts](../../src/contexts/auth/presentation/dto/register.dto.ts)
- [x] T028 [US1] Implement `RegisterUserHandler` with anti-enumeration timing equalisation (always hash, even on the verified-email no-op branch) at [src/contexts/auth/application/commands/register-user.handler.ts](../../src/contexts/auth/application/commands/register-user.handler.ts) (resolves T023; depends on T011, T012, T015, T026)
- [x] T029 [US1] Update `verify-otp.dto.ts` to drop `accountType` (role is on the user record after register) at [src/contexts/auth/presentation/dto/verify-otp.dto.ts](../../src/contexts/auth/presentation/dto/verify-otp.dto.ts)
- [x] T030 [US1] Update `VerifyOtpHandler` to filter by `(email, purpose='signup_verification')`, use atomic `consumeById`, set `verifiedAt = now`, emit `OtpVerifiedEvent`, and return `passwordSetupToken` + skip session when `requiresPasswordSetup=true` (token issued via `@nestjs/jwt`, nonce stored in Redis with 10-min TTL) at [src/contexts/auth/application/commands/handlers/verify-otp.handler.ts](../../src/contexts/auth/application/commands/handlers/verify-otp.handler.ts) (resolves T024; depends on T011, T012, T015)
- [x] T031 [US1] Update `GetCurrentUserHandler` to include `verifiedAt` and `role` in the projected DTO at [src/contexts/auth/application/queries/handlers/get-current-user.handler.ts](../../src/contexts/auth/application/queries/handlers/get-current-user.handler.ts)
- [x] T032 [US1] Update `auth.formatter.ts` so all returned `user` objects expose `id` (UUID, sourced from `_id`), `email`, `role`, `verifiedAt`, `passwordSetupRequired` per [contracts/auth-endpoints.md](./contracts/auth-endpoints.md) at [src/contexts/auth/presentation/auth.formatter.ts](../../src/contexts/auth/presentation/auth.formatter.ts)
- [x] T033 [US1] Wire `POST /auth/register` endpoint with `@Throttle('otp-issue')` and `@AllowUnverified()` at [src/contexts/auth/presentation/auth.controller.ts](../../src/contexts/auth/presentation/auth.controller.ts) (depends on T028)
- [x] T034 [US1] Mark `POST /auth/verify-otp` with `@AllowUnverified()` (it must remain reachable from the unverified-but-pending state) at [src/contexts/auth/presentation/auth.controller.ts](../../src/contexts/auth/presentation/auth.controller.ts)
- [x] T035 [US1] Register `RegisterUserHandler` and `PASSWORD_PORT → BcryptPasswordAdapter` provider in `AuthModule` at [src/contexts/auth/auth.module.ts](../../src/contexts/auth/auth.module.ts)

**Checkpoint**: US1 e2e (T025) green. A new buyer/supplier can sign up, verify, and reach a protected endpoint.

---

## Phase 4: User Story 2 — Unverified users cannot access protected resources (Priority: P1)

**Goal**: A session for an unverified user is rejected by every endpoint not on the explicit allow-list.

**Independent Test**: Steps 6–7 of [quickstart.md](./quickstart.md). `GET /cart` with an unverified-user session returns 403 `AUTH_USER_NOT_VERIFIED`.

The guard itself was implemented in Phase 2 (T017–T020). This phase covers the allow-list wiring and the e2e proof.

### Tests for User Story 2

- [x] T036 [P] [US2] Failing e2e covering: an authenticated unverified user gets 403 `AUTH_USER_NOT_VERIFIED` on `GET /cart`, `POST /cart/items`, `GET /products` (representative protected endpoints), and 200 on `GET /auth/me`, `DELETE /auth/logout`, `POST /auth/verify-otp`, `POST /auth/request-otp` (the allow-list) at [test/auth-verified-gate.e2e-spec.ts](../../test/auth-verified-gate.e2e-spec.ts)

### Implementation for User Story 2

- [x] T037 [US2] Mark `GET /auth/me`, `DELETE /auth/logout`, `POST /auth/request-otp` with `@AllowUnverified()` (verify-otp already done in T034) at [src/contexts/auth/presentation/auth.controller.ts](../../src/contexts/auth/presentation/auth.controller.ts)
- [x] T038 [US2] Audit every other controller in `src/contexts/*/presentation/*.controller.ts` to confirm no route incorrectly carries `@AllowUnverified()` or bypasses the global guard via `useGuards(NoOpGuard)`; document the audit in the PR description (no code change expected — the global guard catches them all)

**Checkpoint**: US2 e2e (T036) green. Unverified sessions are blocked everywhere except the five allow-listed routes.

---

## Phase 5: User Story 3 — Sign in with password after verification (Priority: P1)

**Goal**: A verified user signs in with email + password and obtains a session.

**Independent Test**: Step 8 of [quickstart.md](./quickstart.md). `POST /auth/login` with correct credentials returns 200 + session; with wrong password returns 401 generic; with unverified user returns 403 + auto-resend.

### Tests for User Story 3 (TDD — write FIRST, MUST fail)

- [x] T039 [P] [US3] Failing unit spec for `LoginHandler` covering: verified user + correct password → session issued with `verifiedAt`; wrong password → `AuthInvalidCredentialsException`; unknown email → `AuthInvalidCredentialsException` (timing-equalised via `dummyHash`); user with `passwordHash IS NULL` → `AuthInvalidCredentialsException`; verified legacy user with `requiresPasswordSetup=true` → `AuthPasswordSetupRequiredException`; unverified user with correct password → `AuthUserNotVerifiedException` and OTP auto-issued (subject to cooldown) at [src/contexts/auth/application/commands/login.handler.spec.ts](../../src/contexts/auth/application/commands/login.handler.spec.ts)
- [x] T040 [P] [US3] Failing unit spec for login throttling: 11th failure within 15 min for `{email}:{ip}` returns `AuthRateLimitedException`; successful login resets the counter at [src/contexts/auth/application/commands/login.handler.throttle.spec.ts](../../src/contexts/auth/application/commands/login.handler.throttle.spec.ts)
- [x] T041 [P] [US3] Extend [test/auth-password-otp.e2e-spec.ts](../../test/auth-password-otp.e2e-spec.ts) with login scenarios: success, wrong-password generic 401, unverified-with-correct-password 403 + auto-resend

### Implementation for User Story 3

- [x] T042 [P] [US3] Fill `login.command.ts` (carries `email`, `password`, `ip`) at [src/contexts/auth/application/commands/login.command.ts](../../src/contexts/auth/application/commands/login.command.ts)
- [x] T043 [P] [US3] Fill `login.dto.ts` with `@IsEmail` and `@IsString` (no policy check on login — only on register/set-initial-password) at [src/contexts/auth/presentation/dto/login.dto.ts](../../src/contexts/auth/presentation/dto/login.dto.ts)
- [x] T044 [US3] Implement `LoginHandler` with timing-equalised credential check, verification check, legacy-flag check, session issuance carrying `verifiedAt`, and event emission (`LoginSucceededEvent` / `LoginFailedEvent`) at [src/contexts/auth/application/commands/login.handler.ts](../../src/contexts/auth/application/commands/login.handler.ts) (resolves T039; depends on T006, T011, T015, T022)
- [x] T045 [US3] Wire `POST /auth/login` endpoint with `@Throttle('login')` (no `@AllowUnverified` — login produces unauth attempts; the guard never sees them) at [src/contexts/auth/presentation/auth.controller.ts](../../src/contexts/auth/presentation/auth.controller.ts)
- [x] T046 [US3] Register `LoginHandler` in `AuthModule` providers list at [src/contexts/auth/auth.module.ts](../../src/contexts/auth/auth.module.ts)

**Checkpoint**: US3 e2e additions (T041) green. Password-based login works end-to-end.

---

## Phase 6: User Story 4 — Resend OTP and handle expired codes (Priority: P2)

**Goal**: A user who lost or did not receive the OTP can request a new one. Expired/locked codes are rejected cleanly. Anti-enumeration responses are uniform.

**Independent Test**: Request resend twice in 60 seconds → second request returns `AUTH_OTP_RESEND_COOLDOWN`. Submit an expired OTP → `AUTH_OTP_INVALID_OR_EXPIRED`. Submit > 5 wrong codes → `AUTH_OTP_LOCKED`.

### Tests for User Story 4

- [x] T047 [P] [US4] Failing unit spec for the updated `RequestOtpHandler` covering: known-unverified email → new OTP, prior OTPs for `(email, signup_verification)` invalidated; known-verified email → no OTP, dummy-hash timing equalisation, identical response; unknown email → no OTP, identical response; cooldown enforced; **plaintext OTP is not logged anywhere** (assert `console.log` was not called with the code) at [src/contexts/auth/application/commands/handlers/request-otp.handler.spec.ts](../../src/contexts/auth/application/commands/handlers/request-otp.handler.spec.ts) (the existing spec file — extend, do not replace)
- [x] T048 [P] [US4] Failing e2e covering resend → cooldown → wait → resend works → submit old OTP → rejected → submit new OTP → accepted at [test/auth-otp-resend.e2e-spec.ts](../../test/auth-otp-resend.e2e-spec.ts)

### Implementation for User Story 4

- [x] T049 [US4] Update `RequestOtpHandler` to: filter by `(email, purpose)`, invalidate prior active OTPs for the pair before issuing a new one, equalise timing for unknown/verified emails via `PasswordPort.dummyHash`, **remove `console.log('Generated OTP:', code)`**, emit `OtpIssuedEvent` at [src/contexts/auth/application/commands/handlers/request-otp.handler.ts](../../src/contexts/auth/application/commands/handlers/request-otp.handler.ts) (resolves T047; depends on T012)
- [x] T050 [US4] Apply `@Throttle('otp-issue')` and `@AllowUnverified()` to `POST /auth/request-otp` (`@AllowUnverified` already added in T037; verify it remains) at [src/contexts/auth/presentation/auth.controller.ts](../../src/contexts/auth/presentation/auth.controller.ts)

**Checkpoint**: US4 e2e (T048) green. Resend, cooldown, expiry, and lockout all behave per contract.

---

## Phase 7: User Story 5 — Backwards compatibility for existing users (Priority: P2)

**Goal**: A pre-migration account (no `passwordHash`, `requiresPasswordSetup=true`) can complete a one-time bootstrap by verifying its email and then setting a password.

**Independent Test**: Seed a user with `passwordHash=NULL`, `requiresPasswordSetup=true`, `verifiedAt` already set. Trigger `POST /auth/request-otp` → `POST /auth/verify-otp` → response carries `passwordSetupToken` and **no session**. `POST /auth/set-initial-password` with that token + a valid password → 200 + session + `requiresPasswordSetup` cleared.

### Tests for User Story 5 (TDD — write FIRST, MUST fail)

- [x] T051 [P] [US5] Failing unit spec for `SetInitialPasswordHandler` covering: valid token + policy-compliant password → hash stored, flag cleared, session issued, nonce burned in Redis; expired token → `AuthInvalidCredentialsException`; reused token → `AuthInvalidCredentialsException`; password failing policy → `AuthPasswordPolicyViolationException`; user already past flag (`requiresPasswordSetup=false`) → `AuthPasswordSetupRequiredException` (defensive) at [src/contexts/auth/application/commands/set-initial-password.handler.spec.ts](../../src/contexts/auth/application/commands/set-initial-password.handler.spec.ts)
- [x] T052 [P] [US5] Failing e2e for the legacy bootstrap journey: seed legacy user → request-otp → verify-otp returns token + no session → set-initial-password issues session → subsequent login works at [test/auth-legacy-bootstrap.e2e-spec.ts](../../test/auth-legacy-bootstrap.e2e-spec.ts)

### Implementation for User Story 5

- [x] T053 [P] [US5] Add `set-initial-password.command.ts` (carries `passwordSetupToken`, `password`, `ip`) at [src/contexts/auth/application/commands/set-initial-password.command.ts](../../src/contexts/auth/application/commands/set-initial-password.command.ts)
- [x] T054 [P] [US5] Add `set-initial-password.dto.ts` with `@IsString` for the token + custom `@IsPasswordPolicyCompliant` for password at [src/contexts/auth/presentation/dto/set-initial-password.dto.ts](../../src/contexts/auth/presentation/dto/set-initial-password.dto.ts)
- [x] T055 [US5] Implement `SetInitialPasswordHandler`: verify token signature with `JwtService`, atomically burn the nonce in Redis (use `SET key value NX EX ttl` semantics inverted — `DEL` returning 1 means it was unburned), call `UserAggregate.setInitialPassword`, persist via `UserRepository.updatePassword` + `markRequiresPasswordSetup(false)`, issue session, emit `PasswordSetEvent` at [src/contexts/auth/application/commands/set-initial-password.handler.ts](../../src/contexts/auth/application/commands/set-initial-password.handler.ts) (resolves T051; depends on T011, T015, T022)
- [x] T056 [US5] Add `passwordSetupToken` issuance to `VerifyOtpHandler`: when the verified user has `requiresPasswordSetup=true`, sign a 10-minute JWT with a fresh nonce, store the nonce in Redis with the same TTL, return `{ user, passwordSetupToken }` and skip session creation at [src/contexts/auth/application/commands/handlers/verify-otp.handler.ts](../../src/contexts/auth/application/commands/handlers/verify-otp.handler.ts)
- [x] T057 [US5] Wire `POST /auth/set-initial-password` endpoint, mark with `@AllowUnverified()` (no session yet at this point), apply `@Throttle('login')` (same brute-force budget), at [src/contexts/auth/presentation/auth.controller.ts](../../src/contexts/auth/presentation/auth.controller.ts)
- [x] T058 [US5] Register `SetInitialPasswordHandler` in `AuthModule` providers at [src/contexts/auth/auth.module.ts](../../src/contexts/auth/auth.module.ts)

**Checkpoint**: US5 e2e (T052) green. Legacy users can bootstrap a password without support intervention.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Audit logging, retention job, observability cleanup, and final verification.

- [ ] T059 [P] Wire each new domain event emitted by the auth handlers into the existing `audit-log` context's projection so the events appear in the `audit_events` table (per [data-model.md §5](./data-model.md)) — verify under [src/contexts/audit-log/](../../src/contexts/audit-log/)
- [ ] T060 Add a nightly `@Cron` job (using `@nestjs/schedule`) to: (a) `DELETE FROM auth_otp_codes WHERE consumed_at IS NOT NULL OR expires_at < NOW() - INTERVAL '30 days'`; (b) soft-delete users matching `verified_at IS NULL AND created_at < NOW() - INTERVAL '30 days'`; emit a `RetentionSweepCompleted` log event. Place under [src/contexts/auth/infrastructure/jobs/auth-retention.job.ts](../../src/contexts/auth/infrastructure/jobs/auth-retention.job.ts)
- [x] T061 [P] Sweep all controllers for the canonical session cast `(req as SessionRequest).session?.user` and update every type definition / inline cast to include `verifiedAt: Date | null`. Confirmed by greppable rename. (Affects controllers in: `cart`, `checkout`, `inventory`, `product`, `review`, `rfq`, `supplier/identity`, `supplier/subscription`, `wishlist`, plus auth itself.)
- [ ] T062 [P] Document the new error codes (per [contracts/auth-endpoints.md](./contracts/auth-endpoints.md) error-code table) in the API reference / Swagger annotations on each updated endpoint
- [x] T063 Run `pnpm lint` and `pnpm test -- --runInBand`; resolve any new diagnostics or test failures (pre-existing baseline diagnostics in `main.ts` and `storage.service.spec.ts` are NOT to be touched)
- [ ] T064 Run `pnpm test:e2e` and confirm all four new e2e specs (T025, T036, T048, T052) pass alongside the existing suite
- [ ] T065 Walk [quickstart.md](./quickstart.md) end-to-end against a clean local DB; capture and resolve any drift between the doc and reality

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup) — no dependencies; can start immediately.
- Phase 2 (Foundational) — depends on Phase 1; **blocks all user stories**.
  - Within Phase 2: TDD pairs (T002↔T004, T003↔T006, T014↔T015, T017↔T018) must be ordered "spec → impl"; T009/T010 must precede T013 (migration generation); T011/T012 depend on T009/T010; T020 depends on T018.
- Phase 3 (US1) — depends on Phase 2 complete.
- Phase 4 (US2) — depends on Phase 2 complete; can run in parallel with Phase 3.
- Phase 5 (US3) — depends on Phase 2 complete; can run in parallel with Phases 3 and 4.
- Phase 6 (US4) — depends on Phase 2 complete and on Phase 3's `RequestOtpHandler` updates being merged or developed in the same branch (touches the same handler).
- Phase 7 (US5) — depends on Phase 2 complete and on Phase 3 (US1) for `VerifyOtpHandler` updates that issue the `passwordSetupToken`.
- Phase 8 (Polish) — depends on all desired user stories being complete.

### User Story Ordering

- US1 (P1) is the MVP. Stop here for an initial demo.
- US2 (P1) and US3 (P1) round out the P1 set; US2 requires only the foundational guard, US3 unlocks password login.
- US4 (P2) and US5 (P2) are quality-of-life and migration coverage.

### Parallel Opportunities

- Phase 1 — only T001, parallel-safe.
- Phase 2 — domain primitives (T002–T008) are mostly independent and can run in parallel; ORM edits T009/T010 are independent files; guard work (T016–T018) parallel to throttler config (T022).
- Phase 3 — DTO/command file fills (T026, T027) parallel; T028 depends on them; T031, T032 parallel to T028 (different files); controller wiring (T033, T034) sequential against the same controller file.
- Phase 4 — only one impl task (T037 controller edit) follows the failing e2e (T036).
- Phase 5 — DTO and command file (T042, T043) parallel; handler T044 depends on them.
- Phase 6 — extends an existing handler; sequential.
- Phase 7 — DTO/command (T053, T054) parallel; handler T055 depends on them; controller wiring (T057) sequential.
- Phase 8 — most polish tasks parallel; T063/T064/T065 sequential at the end.

---

## Parallel Example: User Story 1 kickoff

```bash
# After Phase 2 is green, launch the failing US1 specs in parallel:
Task: "T023 Write failing unit spec for RegisterUserHandler"
Task: "T024 Write failing unit spec for updated VerifyOtpHandler"
Task: "T025 Write failing e2e for signup → OTP → verify → /cart"

# Then launch the independent fills in parallel:
Task: "T026 Fill register-user.command.ts"
Task: "T027 Fill register.dto.ts"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 (setup file).
2. Phase 2 (foundational — entities, migration, guard, throttler).
3. Phase 3 (US1) — register + verify-otp end-to-end.
4. **Stop and validate**: run [quickstart.md](./quickstart.md) steps 1–5; demo signup + verify path.

### Incremental Delivery

1. Phase 1 + 2 → foundation ready.
2. + Phase 3 (US1) → MVP, deployable.
3. + Phase 4 (US2) → access control fully enforced (the *security* milestone).
4. + Phase 5 (US3) → password login (full new auth flow).
5. + Phase 6 (US4) → resend / cooldown polish.
6. + Phase 7 (US5) → legacy users unblocked.
7. + Phase 8 → audit/retention/observability.

### Parallel Team Strategy

After Phase 2 lands on the feature branch:

- Dev A: Phase 3 (US1)
- Dev B: Phase 4 (US2) and Phase 5 (US3) in sequence (small-ish)
- Dev C: Phase 6 (US4) — coordinates with A on `RequestOtpHandler`
- Dev A → Phase 7 (US5) once US1 lands (shares `VerifyOtpHandler`)

---

## Notes

- **Tests are written first and MUST fail before the corresponding implementation task is started.** This is non-negotiable per Constitution Principle II.
- **Test doubles MUST NOT mock the ORM.** Use in-memory fakes of `IUserRepository`, `IOtpCodeRepository`, `PasswordPort`. Reuse the `EmailService` recording fake from existing auth specs.
- **Migration is GENERATED, not hand-written.** Hand-edit only the backfill `UPDATE` statements documented in [data-model.md](./data-model.md), placed before the `is_verified` drop.
- **Plaintext password and OTP must never appear in logs, error payloads, or audit records.** SC-007 is a launch blocker.
- **Commit after each completed task** with a conventional-commit message; do not batch commits across phases.
- **Always run tests with `--runInBand`.** Parallel Jest collides on shared DB/Redis fixtures (Constitution Principle II).
- **Use `id` (UUID) as the public identifier in every JSON body.** The internal numeric PK never leaks (Constitution Principle III; see [contracts/auth-endpoints.md](./contracts/auth-endpoints.md)).
