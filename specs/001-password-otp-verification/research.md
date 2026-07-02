# Phase 0 Research: Password + Email OTP Verification

**Feature**: `001-password-otp-verification`
**Date**: 2026-04-17
**Input**: [spec.md](./spec.md)

This document resolves the technical unknowns surfaced in the Technical Context section of [plan.md](./plan.md). Each entry records the decision, the rationale, and the alternatives evaluated against the constitution and the existing codebase.

---

## 1. Password hashing algorithm

**Decision**: Use **bcrypt** (already a project dependency — `bcrypt@^6.0.0` in `package.json`) with a work factor of **12** rounds. Hashing and verification are exposed to the application layer via a `PasswordPort` interface (`application/ports/password.port.ts` — stub file already scaffolded) and implemented by a `BcryptPasswordAdapter` (`infrastructure/bcrypt-password.adapter.ts` — stub already scaffolded).

**Rationale**:

- Already available, already used for OTP hashing elsewhere; no new dependency.
- Adaptive work factor allows cost to be raised over time without schema change.
- 12 rounds targets ~250 ms per hash on production hardware — slow enough to meaningfully resist offline attacks, fast enough to stay within the p95 ≤ 400 ms write-endpoint constitution budget given that hashing happens at most once per signup and once per login.
- Keeping the algorithm behind a port (`PasswordPort`) preserves the constitution's DI-by-Symbol-token rule (Principle I) and allows a future migration to argon2id without touching handlers.

**Alternatives considered**:

- **argon2id** — stronger memory-hard primitive, but would introduce a native dependency not currently in the tree and requires per-deployment tuning of m/t/p. Deferred; the port makes a later swap cheap.
- **scrypt via `node:crypto`** — zero dependencies but cost parameters are less well understood by reviewers; bcrypt is more familiar and already pervasive.
- **PBKDF2** — rejected; too fast on modern GPUs for password storage.

---

## 2. Password policy

**Decision**: Policy enforced at the DTO boundary via `class-validator`, per Principle III:

- Minimum length **12 characters**.
- Must contain at least one character from **three of four** classes: lowercase, uppercase, digit, symbol.
- Denylist of the top ~1000 breached passwords (shipped as a static file loaded once at module boot). The denylist comparison is case-insensitive and strips diacritics.
- Maximum length **128 characters** (guards against DoS via bcrypt on very long inputs).

Password policy constants live in `domain/password-policy.ts` as a single value-object-style frozen record, so they are testable and reviewable in one place.

**Rationale**: Length-plus-composition-plus-breach-check is the NIST-aligned pattern and is verifiable by a pure function (trivially unit-testable per Principle II). Denylist handles the most common failure mode of composition rules alone (people pick `Password1!`).

**Alternatives considered**:

- **Online breach check (HIBP API)** — rejected for v1. Adds a network dependency on the signup hot path, violating Principle IV (latency). Revisit as an async post-signup warning.
- **No composition rules, length only** — also NIST-acceptable, but gives less feedback to users pasting obviously weak passwords.

---

## 3. Verification gate enforcement point

**Decision**: Introduce a **new `VerifiedUserGuard`** in `src/shared/infrastructure/guards/verified-user.guard.ts` and apply it globally via `APP_GUARD` in `AppModule`, composed **after** `SessionAuthGuard`. The guard:

1. Reads `session.user` (already populated by `SessionAuthGuard`).
2. Rejects with a distinct `UserNotVerifiedException` (HTTP 403 + typed error code `AUTH_USER_NOT_VERIFIED`) if `session.user.isVerified !== true`.
3. Is bypassed for routes marked with a new `@AllowUnverified()` decorator, which sets reflector metadata.

The allow-list of endpoints reachable by an unverified session (per FR-019) is:

- `POST /auth/verify-otp`
- `POST /auth/request-otp` (used as "resend OTP")
- `DELETE /auth/logout`
- `GET /auth/me` — required so the frontend can render the verification screen and know whose OTP it is entering.

**Rationale**:

- Global enforcement eliminates the risk that a future context forgets to add the guard — the default is secure (fail-closed), and an explicit decorator is required to opt out. This directly addresses SC-002 (zero unverified access).
- Decorator-based opt-out keeps the exception list mechanically discoverable (grep for `@AllowUnverified`) and reviewable in a single PR.
- Composing after `SessionAuthGuard` means unauthenticated requests still get the existing 401 rather than a confusing 403. The two failure modes (unauthenticated vs. authenticated-but-unverified) remain distinct per FR-018.
- Session carries `isVerified` so the guard does not hit the database on every request (Principle IV — latency).

**Alternatives considered**:

- **Per-controller `@UseGuards(VerifiedUserGuard)`** — rejected; requires touching every controller and relies on author discipline (the very failure mode Principle III exists to prevent).
- **Merge the check into `SessionAuthGuard`** — rejected; conflates "authentication" with "verification" and makes the allow-list awkward (you'd have to allow unauthenticated calls to escape the check).
- **Middleware instead of guard** — rejected; guards integrate with `Reflector` and `@nestjs/common`'s exception filter, keeping error shapes consistent with Principle III.

---

## 4. OTP purpose column

**Decision**: Extend `auth_otp_codes` with a `purpose` column (text, non-null, indexed together with `email`). Enum values:

- `signup_verification` — emitted during registration and resend.
- `login_challenge` — reserved; not used by this feature but the column is introduced now so a follow-up "password reset" or "step-up auth" feature does not require another migration.

Unique index on `(email, purpose)` filtered by `consumedAt IS NULL AND deletedAt IS NULL` is **not** added because TypeORM's partial-index support on PostgreSQL is awkward for the generated migration. Instead, the handler re-queries by `(email, purpose)` ordering by `createdAt DESC` — the same pattern the existing `findLatestByEmail` already uses.

**Rationale**: A purpose column is an additive, backward-compatible schema change. Issuing a fresh OTP for one purpose must not invalidate unrelated OTPs for a different purpose (a password-reset code should not be wiped by a signup resend).

**Alternatives considered**:

- **Separate tables per purpose** — rejected; identical structure and lifecycle, only the purpose string differs. A column keeps `OtpService` symmetric across uses.
- **Overloading a free-form `metadata` JSON column** — rejected; loses index-ability and invites typos.

---

## 5. Legacy migration: `passwordHash` nullability & a `requiresPasswordSetup` flag

**Decision**:

- Add `passwordHash: string | null` to `users`. Null means "no password set yet — legacy account in the upgrade funnel."
- Add `requiresPasswordSetup: boolean` (default `false`, set to `true` for pre-existing accounts by the backfill migration).
- Add `verifiedAt: timestamptz | null` — filled by the migration from the existing `isVerified` boolean (if true, set to `updatedAt`) so the audit requirement in FR-025 has a timestamp.
- Existing `isVerified` column is retained verbatim (no data loss, no rename).

Legacy accounts (previously OTP-only) are considered verified (they proved email ownership historically) and carry `requiresPasswordSetup = true`. On their next interaction, the existing `verify-otp` endpoint transparently serves as the one-time password bootstrap: if `requiresPasswordSetup` is true, the response includes a `passwordSetupRequired: true` flag and the frontend prompts for a password. A new `POST /auth/set-initial-password` endpoint (guarded only by session, allowed-unverified in the sense of `requiresPasswordSetup = true`) persists the hash and clears the flag.

**Rationale**:

- The spec's Assumption #6 ("pre-existing accounts that had successfully used the OTP-only login before migration are considered verified; they carry a password-not-set flag and will be prompted to choose a password on their next sign-in") maps directly to this schema.
- Keeping the column nullable avoids a massive, error-prone backfill of synthetic password hashes.
- Using the existing `verify-otp` flow as the transition path means no legacy user is ever locked out; they complete one last OTP round-trip and are then on the new flow.

**Alternatives considered**:

- **Force all legacy users to re-verify via a fresh signup** — rejected; user-hostile, violates SC-006 (support volume).
- **Synthesize random passwords and email them** — rejected; password emailing is an anti-pattern and surfaces secrets in mail logs.

---

## 6. Rate limiting & abuse prevention

**Decision**: Use `@nestjs/throttler` (already in dependencies) with two named throttler profiles wired at the controller:

- `otp-issue` — 5 requests per hour per email, 20 per hour per IP (covers FR-011 and FR-027 email-bombing concerns).
- `login` — 10 failed attempts per 15 minutes per email + IP pair (FR-020). A **successful** login resets the counter.

Throttler key is `{email}:{ip}` for the login profile and `{email}` for the OTP profile, implemented via a small custom `ThrottlerStorage` adapter that reuses the existing `RedisService` (no new Redis instance, Principle IV).

OTP per-code attempt limit (FR-010) is enforced in the `verify-otp` handler against the `attempts` column on the OTP row — this is orthogonal to throttler and remains in the handler.

**Rationale**:

- `@nestjs/throttler` integrates with guards and error filters, preserving consistent error shapes (Principle III).
- Redis-backed storage means limits survive process restarts and work across Fastify instances in production.
- Per-email vs. per-IP separation catches both brute-force (one email, many IPs) and credential stuffing (many emails, one IP).

**Alternatives considered**:

- **Custom fixed-window counter in Redis** — rejected; reinventing throttler for no benefit.
- **Throttler configured globally only** — rejected; the OTP and login profiles have materially different limits and keys.

---

## 7. Anti-enumeration response shape

**Decision**: All three signup-adjacent endpoints (`POST /auth/register`, `POST /auth/login`, `POST /auth/request-otp`) return **the same 200 OK envelope shape** regardless of whether the email is registered or not. Specifically:

- **Register**: Always returns `{ status: "otp_sent" }` with a constant-time branch in the handler (hashing runs even when the existing user is verified, to equalise timing).
- **Login**: On invalid credentials or non-existent user, returns 401 with identical `AUTH_INVALID_CREDENTIALS` code. On unverified user with correct password, returns 403 with distinct `AUTH_USER_NOT_VERIFIED` (this is acceptable — the spec explicitly distinguishes this case).
- **Request-OTP (resend)**: Always returns `{ status: "otp_sent" }` even if the email is not registered; no OTP is actually issued for unknown emails.

The one public enumeration vector that remains — the `AUTH_USER_NOT_VERIFIED` response — is intentional and required by FR-016. It does not leak unregistered-vs-registered because it only fires after the attacker has already supplied a correct password.

**Rationale**: FR-006 and the edge case ("responses indistinguishable from a normal submission") require this. Timing-equalisation via always-hash-once prevents the classic "response is faster when the email doesn't exist" side channel.

**Alternatives considered**:

- **Reveal email-not-found on register** — rejected; directly contradicts FR-006.
- **Equalise response by sleeping** — rejected; timing jitter is detectable and wasteful.

---

## 8. OTP format and delivery

**Decision**:

- 6-digit numeric code (matches spec Assumption #3 and the existing `OtpService.generate(6)` default).
- Stored only as bcrypt hash on the `auth_otp_codes.codeHash` column (matches existing behavior; no change).
- Delivered via `EmailService.sendOtpEmail(email, code, ttlSeconds)` (existing helper).
- TTL default **10 minutes** (`OTP_TTL_SECONDS=600`) — the existing default is 300s, so this feature raises it; the env var remains the source of truth.
- Resend cooldown **60 seconds** per email (`OTP_RESEND_WINDOW_SECONDS=60` — existing value, preserved).
- Max attempts per code **5** (`OTP_MAX_ATTEMPTS=5` — existing value, preserved).

**Rationale**: All values already exist as env vars in the current `request-otp.handler.ts`. Only the TTL default is changed (300 → 600) to align with the spec. No code change is required beyond the default; env overrides keep operator control.

**Alternatives considered**:

- **Magic link instead of numeric code** — rejected; out of scope per spec Assumption #2/#3.
- **TOTP via authenticator app** — rejected; out of scope per spec Assumption #2.

---

## 9. Session user shape & verification flag propagation

**Decision**: Extend `session.user` to carry `isVerified: boolean`:

```ts
session.user = { id, _id, email, role, isVerified };
```

The `VerifiedUserGuard` reads this flag without a DB round-trip. The flag is re-written whenever the session is (re)issued — at login, at verify-otp completion, and at set-initial-password completion. The canonical cast documented in CLAUDE.md is updated accordingly.

**Rationale**:

- Avoids a per-request database lookup (Principle IV).
- The window during which the session can go stale is bounded by the time between an admin marking an account unverified and the next session refresh. For this feature, verification is monotonic (you can become verified but not unverified), so staleness in the safer direction is irrelevant, and staleness in the other direction simply means one extra request succeeds — acceptable for the threat model.

**Alternatives considered**:

- **Read `users.isVerified` on every request** — rejected; adds a DB hit to every authenticated call.
- **Cache the flag in Redis with TTL** — rejected; premature optimisation; the session already lives in Redis.

---

## 10. Event sourcing / domain events

**Decision**: Reuse the existing `UserAggregate` and emit these new domain events through the existing `AggregateRoot` mechanism:

- `UserRegisteredEvent` — raised on signup (before verification).
- `PasswordSetEvent` — raised on initial password set and future password change.
- `OtpIssuedEvent` — raised when a signup OTP is issued (purpose = `signup_verification`).
- `OtpVerifiedEvent` — raised on successful verification (replaces the direct call to `UserVerifiedEvent` in the verify-otp path).
- `LoginSucceededEvent` / `LoginFailedEvent` — raised from the login handler for audit.
- `AccessDeniedUnverifiedEvent` — raised from the `VerifiedUserGuard` on a blocked request.

These events satisfy FR-025 (audit trail) and feed the existing `audit-log` context (already present as a bounded context).

**Rationale**: Keeps the domain layer the source of truth for auditable state transitions (Principle I) and leaves the infrastructure-level audit projection untouched.

**Alternatives considered**:

- **Ad-hoc `console.log` or one-off audit inserts** — rejected; violates Principle I (cross-layer leak) and the constitution's observability rule.

---

## 11. Testing strategy (TDD)

**Decision**: Strict TDD per Principle II. For each handler, write the failing test first, then the implementation. Organisation:

- **Unit tests** (`*.spec.ts`, colocated):
  - `register-user.handler.spec.ts` — password policy validation, existing-verified-email path (returns same response), existing-unverified-email path (reuses row, re-issues OTP), anti-enumeration timing (mock clock).
  - `verify-otp.handler.spec.ts` — extended: consumption on success, attempts increment on failure, expiry rejection, lockout after max attempts, purpose filter.
  - `login.handler.spec.ts` — invalid credentials generic, unverified-user distinct response with auto-resend, throttling on repeated failures, verified user → session issued with `isVerified: true`.
  - `set-initial-password.handler.spec.ts` — flag clearing, password policy enforcement, rejection when flag is already false.
  - `verified-user.guard.spec.ts` — allow on verified, reject on unverified, bypass on `@AllowUnverified`.
  - `password-policy.spec.ts` — pure function tests for each rule.
  - `bcrypt-password.adapter.spec.ts` — hash/verify round-trip and timing contract.
- **E2E tests** (`test/auth-password-otp.e2e-spec.ts`):
  - Full signup → OTP → verify → login journey.
  - Unverified user blocked from `GET /cart` (representative protected endpoint).
  - Legacy user migration: OTP round-trip → password prompt → `POST /auth/set-initial-password` → login works.
- **Test doubles**: in-memory fakes of `IUserRepository`, `IOtpCodeRepository`, `PasswordPort`, and a recording fake of `EmailService`. No ORM mocking (Principle II).

**Rationale**: Aligns with the constitution's non-negotiable testing rules and with the "test doubles MUST NOT mock the ORM" rule by going through repository interfaces.

**Alternatives considered**: None — Principle II is non-negotiable.

---

## 12. Structured logging & observability

**Decision**: Remove the stray `console.log('Generated OTP:', code)` currently in `request-otp.handler.ts` (violates FR-026 — plaintext OTP in logs). Replace with a structured log emitted at info level carrying only the email hash and a request correlation ID. All audit-relevant events are logged once at the handler boundary (start + end) per the constitution's observability rule.

**Rationale**: The existing log is a direct FR-026 violation and must be fixed as part of this feature.

**Alternatives considered**: Leaving the log in — rejected; it is a compliance blocker per SC-007.

---

## Summary of resolved NEEDS CLARIFICATION items

None remained open after the spec pass. The Assumptions section of the spec captured the operational defaults; this research document confirms those defaults are compatible with the existing code and constitution and records the concrete mechanisms (guard placement, schema change, policy location, throttler wiring) chosen to implement them.
