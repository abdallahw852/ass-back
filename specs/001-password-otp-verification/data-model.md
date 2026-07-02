# Phase 1 Data Model: Password + Email OTP Verification

**Feature**: `001-password-otp-verification`
**Date**: 2026-04-17
**Input**: [spec.md](./spec.md), [research.md](./research.md)

This document describes the persisted data model changes required. The migration is additive except for one deliberate **drop of `users.is_verified`** (replaced by a single nullable `verified_at` column — see §3 below). A single generated TypeORM migration (`pnpm run migration:generate -- src/shared/database/migrations/AddPasswordOtpVerification`) produces the diff; no hand-written SQL.

---

## 1. Aggregate: `User` (`auth` context)

Existing aggregate in `src/contexts/auth/domain/aggregates/user.aggregate.ts`. This feature adds password-lifecycle behavior to it and replaces the boolean `isVerified` state with a `verifiedAt` timestamp.

### New / updated domain methods on `UserAggregate`

| Method | Behavior | Emits |
|---|---|---|
| `register(email, passwordHash)` | Creates a user in the "not yet verified" state (`verifiedAt = null`) with a password already hashed by the application layer. | `UserRegisteredEvent` |
| `setInitialPassword(passwordHash)` | Permitted only when `requiresPasswordSetup` is true. Clears the flag and stores the hash. | `PasswordSetEvent` |
| `changePassword(passwordHash)` | Replaces the hash on an already-setup account. Method slot reserved; out of scope for v1. | `PasswordSetEvent` |
| `verifyEmail(now: Date)` | Sets `verifiedAt = now`. Idempotent — re-raising on an already-verified user is a no-op. | `OtpVerifiedEvent` |
| `isVerified(): boolean` (getter) | Returns `this.verifiedAt !== null`. No persisted boolean — derived at read time. | — |

### Invariants

- `passwordHash` MUST be present when `requiresPasswordSetup` is false.
- `passwordHash` MAY be null when `requiresPasswordSetup` is true.
- `verifiedAt` starts null and is set exactly once; the transition is monotonic (`null → Date`, never back).

---

## 2. ORM entity: `UserOrmEntity` (`users` table)

File: `src/contexts/auth/infrastructure/persistence/user.orm-entity.ts`

### Columns added

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `passwordHash` | `varchar(255)` | yes | `null` | bcrypt hash. Null for legacy accounts pending setup. |
| `requiresPasswordSetup` | `boolean` | no | `false` | Set to `true` by the backfill migration for pre-existing accounts; cleared after `set-initial-password`. |
| `verifiedAt` | `timestamptz` | yes | `null` | Replaces the old `isVerified` boolean. Non-null ⇔ user is verified. |
| `lastPasswordChangedAt` | `timestamptz` | yes | `null` | Updated on register, set-initial-password, and future change-password. |

### Column dropped

| Column | Reason |
|---|---|
| `isVerified` (`boolean`) | Redundant with `verifiedAt`. One nullable timestamp carries strictly more information. All call sites switch to `verifiedAt !== null`. |

### Columns retained unchanged

`id`, `_id`, `email`, `name`, `phone`, `avatar`, `role`, `supplierId`, `createdAt`, `updatedAt`, `lastLoginAt`, `deletedAt`.

### Backfill rules executed inside the generated migration's `up()` (runs BEFORE the `isVerified` drop)

```sql
-- Carry forward verification history: where is_verified was true, record the
-- moment of verification using updatedAt as the best available approximation.
UPDATE users
   SET verified_at = updated_at
 WHERE is_verified = true AND verified_at IS NULL;

-- Mark legacy (pre-migration) accounts as needing a password on next login.
UPDATE users
   SET requires_password_setup = true
 WHERE password_hash IS NULL;
```

The generated migration then drops `is_verified`. Both statements are idempotent; re-running against a fresh DB with no legacy rows is a no-op.

### Call-site updates required by the column drop

Every grep match for `isVerified` on a `UserOrmEntity` or session object becomes a check against `verifiedAt !== null`. The known call sites at the time of writing are:
- `src/contexts/auth/infrastructure/persistence/user.orm-entity.ts` (definition)
- `src/contexts/auth/application/commands/handlers/verify-otp.handler.ts` (`isVerified: true` on save)
- `src/contexts/auth/domain/aggregates/user.aggregate.ts` and `entities/user-account.entity.ts` (getter `getIsVerified`, `verify()` method)
- Any `session.user.isVerified` reads (none exist today; introduced by this feature as `verifiedAt`).

The tasks phase will produce the full list by grep, and the work is mechanical.

### Indexes

| Index | Fields | Why |
|---|---|---|
| `ux_users_email_not_deleted` (existing) | `email` where `deletedAt IS NULL` | Unique email among non-soft-deleted rows. No change. |
| (no new index) | — | `requiresPasswordSetup` and `verifiedAt` are always narrowed by `email` in the hot path. |

---

## 3. Entity: `EmailVerificationOtp` (`auth_otp_codes` table)

File: `src/contexts/auth/infrastructure/persistence/otp-code.orm-entity.ts`

### Columns added

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `purpose` | `varchar(32)` | no | `'signup_verification'` | Enum-like string. Current values: `signup_verification`, `login_challenge` (reserved). |
| `userId` | `int` | yes | `null` | Optional FK to `users.id`. Null before the user row is created; reserved for future flows. |

### Columns retained unchanged

`id`, `email`, `codeHash`, `expiresAt`, `attempts`, `consumedAt`, `createdAt`, `updatedAt`, `deletedAt`.

### Backfill rules executed inside the generated migration's `up()`

```sql
-- Legacy rows predate the purpose column; they all correspond to the old OTP-login flow.
UPDATE auth_otp_codes SET purpose = 'signup_verification' WHERE purpose IS NULL;
```

### Indexes

| Index | Fields | Why |
|---|---|---|
| `ix_otp_email` (existing) | `email` | Latest-by-email lookup. No change. |
| `ix_otp_email_purpose` (new) | `(email, purpose)` | Supports the `findLatestByEmailAndPurpose` query added in this feature. |

### Lifecycle rules (enforced in handlers, not in schema)

- Issuing a new OTP for a given `(email, purpose)` soft-invalidates all prior active OTPs for that pair: `UPDATE auth_otp_codes SET consumed_at = NOW() WHERE email = $1 AND purpose = $2 AND consumed_at IS NULL`.
- Consumption is a single atomic update: `UPDATE ... SET consumed_at = NOW() WHERE id = $1 AND consumed_at IS NULL RETURNING *`. The handler rejects the verification if zero rows were affected (race-safe against a concurrent second submission of the same code).
- Expired and fully-attempted rows remain in the table for audit; they are filtered out by the lookup (`consumedAt IS NULL AND expiresAt > NOW() AND attempts < maxAttempts`).

### Retention / cleanup

A scheduled job (`@nestjs/schedule` — already a dependency) runs nightly and deletes OTP rows older than 30 days with `consumedAt IS NOT NULL OR expiresAt < NOW() - INTERVAL '30 days'`. The job also purges unverified users older than the retention window per FR-027 (`verifiedAt IS NULL AND createdAt < NOW() - INTERVAL '30 days'`). Both jobs emit a `RetentionSweepCompleted` log event so SREs can confirm they ran.

---

## 4. Value object: `PasswordPolicy`

File: `src/contexts/auth/domain/value-objects/password-policy.ts` (new)

A frozen record, no persistence. Exposed to handlers and to the DTO validator. Documented in [research.md §2](./research.md#2-password-policy).

```ts
export const PasswordPolicy = Object.freeze({
  minLength: 12,
  maxLength: 128,
  requiredClassCount: 3, // out of 4: lowercase, uppercase, digit, symbol
  breachedPasswordDenylistPath: 'resources/breached-passwords-top1000.txt',
});
```

---

## 5. Domain events (new)

File: `src/contexts/auth/domain/events/`

| Event | Payload (beyond `aggregateId`, `version`) | Consumers |
|---|---|---|
| `UserRegisteredEvent` | `email`, `hasPassword: boolean` (false for legacy) | `audit-log` |
| `PasswordSetEvent` | `email`, `reason: 'register' \| 'initial-setup' \| 'change'` | `audit-log` |
| `OtpIssuedEvent` | `email`, `purpose`, `expiresAt` | `audit-log`, `notification` (optional) |
| `OtpVerifiedEvent` | `email`, `purpose` | `audit-log`; replaces direct `UserVerifiedEvent` in the new flow |
| `LoginSucceededEvent` | `email`, `ip` | `audit-log` |
| `LoginFailedEvent` | `email`, `ip`, `reason: 'invalid_credentials' \| 'unverified' \| 'throttled'` | `audit-log` |
| `AccessDeniedUnverifiedEvent` | `userPublicId`, `route` | `audit-log` |

Event payloads are redacted per FR-026: no plaintext password, no plaintext OTP, no raw session identifier. Emails are retained (needed for audit correlation).

---

## 6. Validation rules at a glance

| Rule | Source | Enforced at |
|---|---|---|
| Email is a valid RFC 5322 address | FR-001, Principle III | DTO (`class-validator`) |
| Password matches `PasswordPolicy` | FR-002 | DTO + domain (defense in depth) |
| Password is not plaintext-persisted or logged | FR-003, FR-026 | Handler + review checklist |
| OTP is 6 digits | Assumption #3 | DTO |
| OTP expires ≤ 10 min | FR-008 | Handler + schema default |
| OTP attempts ≤ 5 | FR-010 | Handler |
| Verified users only on protected routes | FR-018 | Global `VerifiedUserGuard` |

---

## 7. Session payload shape (not persisted in SQL; lives in Redis)

```ts
session.user = {
  id: number;                  // internal PK — never leaks to clients
  _id: string;                 // UUID, public
  email: string;
  role: UserRole;
  verifiedAt: Date | null;     // NEW — null ⇒ unverified; non-null ⇒ verified
};
```

The session user shape is updated in exactly three places: the new `LoginHandler`, the extended `VerifyOtpHandler`, and the new `SetInitialPasswordHandler`. `VerifiedUserGuard` reads `session.user.verifiedAt != null` — no database round-trip per request (Principle IV). The canonical cast in `CLAUDE.md` is updated to the new shape.
