# Quickstart: Password + Email OTP Verification

**Feature**: `001-password-otp-verification`
**Audience**: developer picking up this feature branch to implement, review, or validate.
**Prereqs**: `pnpm install` succeeded. The dev stack (Postgres write/read + Redis + Elasticsearch) is running under Podman.

This guide verifies the happy path and the two key security gates end-to-end against a local dev instance.

---

## 1. Bring up the dev stack

Use the project's Podman compose file to start Postgres (write + read replica), Redis, and Elasticsearch:

```bash
podman compose up -d
```

Confirm the containers are healthy:

```bash
podman ps
```

Expected: four containers running (two Postgres, one Redis, one Elasticsearch).

## 2. Run the migration

```bash
WRITE_DB_HOST=localhost pnpm run migration:run
```

Expected: one migration named `AddPasswordOtpVerification...` runs, adding `passwordHash`, `requiresPasswordSetup`, `verifiedAt`, and `lastPasswordChangedAt` to `users`; adding `purpose` and `userId` to `auth_otp_codes`; dropping `users.is_verified` after backfilling `verified_at`.

Verify columns by shelling into the write DB container:

```bash
podman exec -it asas-postgres-write psql -U postgres -d asas_dev -c "\d users"
podman exec -it asas-postgres-write psql -U postgres -d asas_dev -c "\d auth_otp_codes"
```

(Adjust the container name to whatever `podman ps` reports.)

## 3. Start the API

```bash
pnpm start:dev
```

## 4. Register a new buyer

```bash
curl -s -c cookies.txt -H 'Content-Type: application/json' \
  -X POST http://localhost:3000/auth/register \
  -d '{"email":"alice+buyer@example.com","password":"Correct-Horse-Battery-Staple-42","accountType":"buyer"}'
```

Expected body:

```json
{ "status": "otp_sent" }
```

The OTP is logged by the dev `EmailService` (or delivered via SMTP in non-dev). Grab the code from the log line.

## 5. Verify the OTP and claim a session

```bash
curl -s -b cookies.txt -c cookies.txt -H 'Content-Type: application/json' \
  -X POST http://localhost:3000/auth/verify-otp \
  -d '{"email":"alice+buyer@example.com","code":"<THE_CODE>"}'
```

Expected body:

```json
{ "status": "verified" }
```

A `sid` cookie is now set in `cookies.txt`. If the OTP flow requires password setup (e.g. OTP-only sign-up without a password), the response is instead `{ "passwordSetupRequired": true, "passwordSetupToken": "<jwt>" }` — in that case call `POST /auth/set-initial-password` with the token before the session is established.

## 6. Confirm the verified-user gate lets the session through

```bash
curl -s -b cookies.txt http://localhost:3000/cart
```

Expected: a valid cart response (200 OK). The `VerifiedUserGuard` sees `session.user.verifiedAt != null` and lets the request through.

## 7. Confirm the gate blocks an unverified session

Register a second buyer but **do not** verify:

```bash
curl -s -c cookies2.txt -H 'Content-Type: application/json' \
  -X POST http://localhost:3000/auth/register \
  -d '{"email":"bob+buyer@example.com","password":"Correct-Horse-Battery-Staple-42","accountType":"buyer"}'
```

Attempt login without verifying:

```bash
curl -s -c cookies2.txt -H 'Content-Type: application/json' \
  -X POST http://localhost:3000/auth/login \
  -d '{"email":"bob+buyer@example.com","password":"Correct-Horse-Battery-Staple-42"}'
```

Expected: **403 `AUTH_USER_NOT_VERIFIED`** with `status: "otp_sent"`. A new OTP is emitted. No `sid` cookie is issued.

Attempt a protected route with bob's (empty) cookie jar:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -b cookies2.txt http://localhost:3000/cart
```

Expected: `401` (no session) or `403 AUTH_USER_NOT_VERIFIED` (if a session was issued). Either way, **not 200**.

## 8. Confirm login works after verification

Verify bob's OTP, then login:

```bash
curl -s -b cookies2.txt -c cookies2.txt -H 'Content-Type: application/json' \
  -X POST http://localhost:3000/auth/verify-otp \
  -d '{"email":"bob+buyer@example.com","code":"<THE_CODE>"}'

curl -s -o /dev/null -w "%{http_code}\n" -b cookies2.txt http://localhost:3000/cart
```

Expected: `200`.

## 9. Run the test suite

```bash
pnpm test -- --runInBand
pnpm test:e2e
```

Expected: all new unit tests and the new `auth-password-otp.e2e-spec.ts` pass. The existing suite continues to pass (no regression).

## 10. Confirm audit logging

Inspect recent audit events:

```bash
podman exec -it asas-postgres-write psql -U postgres -d asas_dev \
  -c "SELECT event_type, created_at FROM audit_events ORDER BY id DESC LIMIT 20;"
```

Expected entries (at minimum, in order): `UserRegistered`, `OtpIssued`, `OtpVerified`, `LoginSucceeded`. No plaintext OTPs or passwords appear in any column.

---

## Troubleshooting

- **`pnpm run migration:run` fails with "cannot drop column is_verified"** — a view or policy depends on the column. Drop/recreate it in the same migration or defer the drop.
- **403 on a route you expect to be open** — check whether it should be on the `@AllowUnverified` allow-list (see [contracts/auth-endpoints.md](./contracts/auth-endpoints.md#access-control-gate-applies-to-every-other-endpoint)).
- **OTP cooldown blocks retry** — wait 60 seconds or tune `OTP_RESEND_WINDOW_SECONDS` in `.env` for local dev.
- **`pnpm test` parallel run issues** — always use `--runInBand` (constitution Principle II, non-negotiable).
- **`podman compose up` complains about port conflicts** — another stack is already using 5432/5433/6379/9200. Stop it with `podman ps` + `podman stop <id>` or tune the compose file.
