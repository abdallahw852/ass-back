# HTTP Contract: Auth Endpoints (Password + OTP)

**Feature**: `001-password-otp-verification`
**Base path**: `/auth`
**Session**: `@fastify/session` cookie `sid`; `httpOnly; secure; sameSite=lax` in production.

All request/response bodies are `application/json`. Public identifiers in request bodies, response bodies, and URL params use the field name **`id`** and carry the UUID (the aggregate ID). The internal auto-increment primary key is never exposed to clients. All field names are `camelCase`.

## Account types

At signup time the caller **must** declare whether the account is a **buyer** or a **supplier**. That decision is persisted on the user record as `role` (`UserRole.BUYER` or `UserRole.SUPPLIER`) and cannot be changed via this feature's endpoints. Admin accounts are provisioned out-of-band and continue to use the existing `/auth/admin/*` endpoints; admins are out of scope here.

API surface:

- **Registration** takes `accountType` (`'buyer' | 'supplier'`) and it is mandatory.
- **Login** does **not** take `accountType` — the role is already on the record, so the server returns it.
- Responses always include `role` so the client can branch its UX (buyer dashboard vs. supplier dashboard).

## Error envelope (uniform across the API per Principle III)

```json
{
  "statusCode": 401,
  "errorCode": "AUTH_INVALID_CREDENTIALS",
  "message": "Invalid email or password.",
  "timestamp": "2026-04-18T10:15:30.000Z"
}
```

Error codes introduced or reused by this feature:

| Code | HTTP | Meaning |
|---|---|---|
| `AUTH_EMAIL_ALREADY_REGISTERED` | — | **Never returned** — anti-enumeration. Handler treats the case internally. |
| `AUTH_PASSWORD_POLICY_VIOLATION` | 400 | Password does not meet `PasswordPolicy`. Safe to return — policy is public. |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong password OR unknown email (indistinguishable per FR-015). |
| `AUTH_USER_NOT_VERIFIED` | 403 | Authenticated but email not yet verified. Triggers auto-resend. |
| `AUTH_OTP_INVALID_OR_EXPIRED` | 401 | Wrong, expired, or already-consumed code (indistinguishable). |
| `AUTH_OTP_LOCKED` | 429 | Max attempts reached on the current code; request a new one. |
| `AUTH_OTP_RESEND_COOLDOWN` | 429 | Resend requested within the cooldown window. |
| `AUTH_RATE_LIMITED` | 429 | Throttler-level limit hit (per-email or per-IP). |
| `AUTH_ACCOUNT_TYPE_MISMATCH` | 409 | Signup re-attempted with a different `accountType` on an existing unverified row. |
| `AUTH_PASSWORD_SETUP_REQUIRED` | 409 | Account is verified but still legacy (`requiresPasswordSetup = true`); call `set-initial-password` before login. |

---

## 1. `POST /auth/register`

Create a new user account and issue a signup-verification OTP.

### Authentication

None. Public.

### Rate limit

`otp-issue` profile: 5/hour/email, 20/hour/IP.

### Request

```json
{
  "email": "alice@example.com",
  "password": "Correct-Horse-Battery-Staple-42",
  "accountType": "buyer"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | yes | RFC 5322 email, ≤ 254 chars, normalised to lowercase server-side |
| `password` | string | yes | Matches `PasswordPolicy` (length 12–128, three-of-four classes, not in breach denylist) |
| `accountType` | string | yes | One of `"buyer"` or `"supplier"`. Persisted as `role`. |

### Response (200 OK — always, regardless of email existence)

```json
{ "status": "otp_sent" }
```

**Anti-enumeration**: The same 200 OK with the same body is returned for:

- a brand-new email (user row is created with the declared `accountType`, OTP sent);
- an email tied to an existing **unverified** account whose `accountType` matches the request (password hash is overwritten, fresh OTP sent, prior OTPs invalidated);
- an email tied to an existing **verified** account (no user change, **no OTP sent**, but the handler performs a dummy bcrypt hash to equalise timing).

**`accountType` mismatch on an unverified row** is the one exception that surfaces an error: see `AUTH_ACCOUNT_TYPE_MISMATCH` below. It must be visible to the user so they do not silently end up with the wrong role.

No session is issued on this endpoint.

### Error responses

- **400 `AUTH_PASSWORD_POLICY_VIOLATION`** — body includes `violations: string[]` describing each failed rule (e.g., `"min_length"`, `"character_classes"`, `"breached"`).
- **409 `AUTH_ACCOUNT_TYPE_MISMATCH`** — email is tied to an existing unverified account registered as the other type. Response suggests switching to login or using a different email.
- **429 `AUTH_RATE_LIMITED`** — throttler bucket exceeded.

---

## 2. `POST /auth/verify-otp`

Consume a signup OTP and (on success) issue a session.

### Authentication

None. Public.

### Rate limit

Default global throttler (lenient); per-OTP attempts enforced by handler.

### Request

```json
{
  "email": "alice@example.com",
  "code": "123456"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | yes | RFC 5322 email |
| `code` | string | yes | Exactly 6 digits (`/^\d{6}$/`) |

Note: `accountType` is **not** submitted on verify — the role has already been stored on the user record at register time. Omitting it here prevents the client from accidentally toggling the role after signup.

### Response (200 OK)

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
    "email": "alice@example.com",
    "role": "buyer",
    "verifiedAt": "2026-04-18T10:15:30.000Z",
    "passwordSetupRequired": false
  }
}
```

Side effects:

- OTP row is marked `consumedAt = NOW()`.
- `users.verifiedAt = NOW()` if not already set.
- Session cookie is issued with `session.user.verifiedAt` and `session.user.role` populated.

If the account is a legacy user (`requiresPasswordSetup = true`), the response sets `passwordSetupRequired: true` and **no session is issued**. A short-lived `passwordSetupToken` is returned for the bootstrap step:

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
    "email": "alice@example.com",
    "role": "supplier",
    "verifiedAt": "2026-04-18T10:15:30.000Z",
    "passwordSetupRequired": true
  },
  "passwordSetupToken": "eyJ..."
}
```

The token is an opaque signed value (JWT via `@nestjs/jwt` — already a dependency) with a 10-minute TTL and a single-use nonce stored in Redis.

### Error responses

- **401 `AUTH_OTP_INVALID_OR_EXPIRED`** — wrong, expired, or already-consumed code. Increments `attempts` counter.
- **429 `AUTH_OTP_LOCKED`** — code reached max attempts.

---

## 3. `POST /auth/request-otp` (resend)

Re-issue a signup OTP for an in-progress signup.

### Authentication

None. Public.

### Rate limit

`otp-issue` profile + per-email 60-second cooldown.

### Request

```json
{ "email": "alice@example.com" }
```

### Response (200 OK — always)

```json
{ "status": "otp_sent" }
```

Same anti-enumeration semantics as `/register`:

- Known unverified email: new OTP issued for that user's `role`, prior OTPs for `(email, signup_verification)` invalidated.
- Known verified email: no OTP issued, but timing-equalised via a dummy hash.
- Unknown email: no OTP issued, same response.

### Error responses

- **429 `AUTH_OTP_RESEND_COOLDOWN`** — requested within the 60s cooldown.
- **429 `AUTH_RATE_LIMITED`** — throttler bucket exceeded.

---

## 4. `POST /auth/login`

Sign in with email + password. The server returns the account's role — the client does not submit it.

### Authentication

None. Public.

### Rate limit

`login` profile: 10 failures per 15 min per `{email}:{ip}` pair. A successful login resets the counter.

### Request

```json
{
  "email": "alice@example.com",
  "password": "Correct-Horse-Battery-Staple-42"
}
```

### Response (200 OK)

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
    "email": "alice@example.com",
    "role": "buyer",
    "verifiedAt": "2026-04-18T10:15:30.000Z"
  }
}
```

`role` is one of `"buyer"`, `"supplier"`, `"user"` (legacy), or `"admin"` (admin accounts use the admin endpoints but the role is still returned for completeness). Session cookie is issued.

### Error responses

- **401 `AUTH_INVALID_CREDENTIALS`** — wrong password, unknown email, or user with `passwordHash IS NULL` (identical response for all three per FR-015). The handler performs a dummy bcrypt hash on the "unknown email" branch to equalise timing.
- **403 `AUTH_USER_NOT_VERIFIED`** — correct password but `verifiedAt IS NULL`. Response body also includes `{ "status": "otp_sent" }` and a new OTP is auto-issued subject to the cooldown. No session is issued.
- **409 `AUTH_PASSWORD_SETUP_REQUIRED`** — verified legacy user with `requiresPasswordSetup = true`; the client is expected to complete the one-time bootstrap via `/auth/verify-otp` then `/auth/set-initial-password`.
- **429 `AUTH_RATE_LIMITED`** — throttler bucket exceeded.

---

## 5. `POST /auth/set-initial-password`

One-time bootstrap for legacy users: sets the password after the first OTP verification.

### Authentication

Bearer of the short-lived `passwordSetupToken` returned by `/auth/verify-otp` when `passwordSetupRequired` was true. **Not** a session.

### Request

```json
{
  "passwordSetupToken": "eyJ...",
  "password": "Correct-Horse-Battery-Staple-42"
}
```

### Response (200 OK)

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
    "email": "alice@example.com",
    "role": "buyer",
    "verifiedAt": "2026-04-18T10:15:30.000Z"
  }
}
```

Side effects:

- `users.passwordHash` is set.
- `users.requiresPasswordSetup = false`.
- `users.lastPasswordChangedAt = NOW()`.
- Session cookie is issued with the account's existing `role` preserved verbatim.
- The `passwordSetupToken` nonce is burned in Redis.

### Error responses

- **400 `AUTH_PASSWORD_POLICY_VIOLATION`** — same shape as `/register`.
- **401 `AUTH_INVALID_CREDENTIALS`** — token expired, invalid signature, or nonce already consumed.
- **409 `AUTH_PASSWORD_SETUP_REQUIRED`** — `requiresPasswordSetup` is already false (defensive; should never happen on a fresh token).

---

## 6. `GET /auth/me`

Return the currently authenticated user, including their `role` so the client can pick a dashboard.

### Authentication

Session. **Allowed for unverified users** (explicit exception per FR-019) — the frontend needs this to render the verification screen.

### Response (200 OK)

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
    "email": "alice@example.com",
    "role": "buyer",
    "verifiedAt": "2026-04-18T10:15:30.000Z"
  }
}
```

`verifiedAt` is `null` when the user has not yet completed verification. If the session has no user, returns `{ "user": null }` with 200 OK (existing behavior).

---

## 7. `DELETE /auth/logout`

Clear the session. Allowed for unverified users.

### Response

```json
{ "success": true }
```

---

## Access-control gate (applies to every other endpoint)

Every route **not** listed below requires `session.user != null AND session.user.verifiedAt != null`. Routes excepted from the verified-user check (reachable by unverified authenticated sessions):

| Route | Reason |
|---|---|
| `POST /auth/verify-otp` | Completes verification. |
| `POST /auth/request-otp` | Resends OTP. |
| `POST /auth/set-initial-password` | Legacy bootstrap. |
| `GET /auth/me` | Renders the verification screen. |
| `DELETE /auth/logout` | User must be able to leave. |

Role-level authorisation (buyer-only vs supplier-only endpoints) remains the responsibility of each context's existing guards (e.g., `RolesGuard`, `IsFullyVerifiedSupplierGuard`). This feature only adds the *email-verification* gate; it does not change how buyer/supplier permissions are checked.

Unverified authenticated request to any protected route:

- **403 `AUTH_USER_NOT_VERIFIED`** — body includes `{ "resumeUrl": "/auth/verify-otp" }` to direct the client.

Unauthenticated request to any protected route: **401 `AUTH_UNAUTHENTICATED`** (existing behavior, preserved).
