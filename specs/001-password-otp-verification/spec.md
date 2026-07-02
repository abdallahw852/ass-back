# Feature Specification: Password + Email OTP Verification for Signup & Access Control

**Feature Branch**: `001-password-otp-verification`
**Created**: 2026-04-17
**Status**: Draft
**Input**: User description: "Design a comprehensive update plan for a web application's authentication system transitioning from OTP-based verification to password-based OTP verification sent to users' email during signup. Ensure the plan includes modifications to the user registration flow, verification process, and backend validation to prevent unverified users from accessing any endpoints requiring authentication. Detail the necessary changes to authentication middleware, database schema updates for storing verification status, and the handling of OTP delivery and validation. The aim is to enhance security by enforcing user verification before granting access to protected resources, ensuring that unverified users are restricted from any endpoint that requires authentication."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign up with password and verify email via OTP (Priority: P1)

A new visitor creates an account by providing an email and a password. Before the account can be used to access any protected feature, the visitor must prove ownership of the email address by entering a one-time code that is emailed to them during signup. Only after the code is validated is the account marked verified and allowed to sign in.

**Why this priority**: This is the core of the transition — it replaces the legacy OTP-only login with a password primary credential gated by an email-ownership challenge. Without this flow the rest of the feature cannot exist.

**Independent Test**: Can be fully tested end-to-end by submitting a registration, receiving the OTP email, submitting the OTP, and confirming the account status moves from "unverified" to "verified". Delivers the value of a secure, verifiable signup path on its own.

**Acceptance Scenarios**:

1. **Given** a visitor with a valid email and a password meeting policy, **When** they submit the signup form, **Then** the account is created in an "unverified" state, an OTP is sent to the email, and the visitor is directed to an OTP entry step.
2. **Given** an unverified account with an active OTP, **When** the user submits the correct OTP before expiry, **Then** the account is marked verified and the user may proceed to sign in.
3. **Given** an unverified account, **When** the user submits an incorrect OTP, **Then** the attempt is rejected, a remaining-attempts count is decremented, and the account remains unverified.
4. **Given** a signup attempt using an email that is already registered and verified, **When** the form is submitted, **Then** the system refuses to create a duplicate account and guides the user to sign in or recover the password.
5. **Given** a signup attempt using an email tied to an existing unverified account, **When** the form is resubmitted, **Then** the prior unverified record is reused (password updated if provided) and a fresh OTP is issued, so abandoned signups can be recovered without creating duplicates.

---

### User Story 2 - Unverified users cannot access protected resources (Priority: P1)

Even if an unverified account has somehow obtained a session (e.g., legacy session, race during signup, or a partially completed flow), it must be blocked from any endpoint that requires an authenticated user. The user is instead redirected to finish verification.

**Why this priority**: This is the stated security goal of the change. Without enforcement at the protected-route layer, the signup change alone does not improve security — verification must be a hard gate at the point of access.

**Independent Test**: Can be tested by attempting to call any protected endpoint while holding a session for an unverified account and confirming the request is refused with a clear "verification required" response. Works independently of how the session was acquired.

**Acceptance Scenarios**:

1. **Given** an authenticated session belonging to an unverified user, **When** the user calls any protected endpoint, **Then** the request is rejected with a response indicating verification is required and including guidance to resume verification.
2. **Given** an authenticated session belonging to a verified user, **When** the user calls any protected endpoint, **Then** the request proceeds normally.
3. **Given** an unauthenticated request, **When** it hits a protected endpoint, **Then** it is rejected with an authentication-required response (existing behavior preserved).
4. **Given** a user who completes verification mid-session, **When** they next call a protected endpoint, **Then** access is granted without requiring a new sign-in.

---

### User Story 3 - Sign in with password after verification (Priority: P1)

Existing and newly verified users sign in with email + password (not an OTP). The session issued on successful sign-in carries the verified state so downstream access-control checks are consistent.

**Why this priority**: The migration from OTP-as-login to password-as-login is user-visible and required. Without a working password login, verified users cannot access the product.

**Independent Test**: Can be tested by signing in a verified account with the correct password and confirming a session is issued; and by signing in a verified account with a wrong password and confirming it is refused.

**Acceptance Scenarios**:

1. **Given** a verified user, **When** they submit email + correct password, **Then** a session is issued and they can access protected endpoints.
2. **Given** a verified user, **When** they submit a wrong password, **Then** sign-in is rejected with a generic "invalid credentials" response (no distinction between "wrong password" and "no such user").
3. **Given** an unverified user, **When** they submit email + correct password, **Then** sign-in is refused with a clear "verify your email to continue" response and the OTP is automatically re-sent.
4. **Given** repeated failed password attempts on the same account within a short window, **When** the threshold is exceeded, **Then** further sign-in attempts for that account are temporarily throttled to slow brute force.

---

### User Story 4 - Resend OTP and handle expired codes (Priority: P2)

Emails get lost, delayed, or deleted. A user who did not receive or has lost the OTP can request a new one. Codes have a short lifetime and expired codes are rejected cleanly.

**Why this priority**: Signup abandonment is a direct consequence of undeliverable or expired OTPs. The primary flow still works without resend, but completion rates suffer meaningfully — hence P2, not P1.

**Independent Test**: Can be tested by requesting a resend during an in-progress signup, confirming a new code is sent, the prior code is invalidated, and the new one validates.

**Acceptance Scenarios**:

1. **Given** an unverified account waiting at OTP entry, **When** the user requests a resend, **Then** a new OTP is sent, the prior OTP is invalidated, and a per-email resend rate limit applies.
2. **Given** an OTP that has passed its expiry window, **When** the user submits it, **Then** the submission is rejected with an "expired — request a new code" response.
3. **Given** an OTP that has reached the maximum number of failed attempts, **When** the user submits again, **Then** the OTP is locked and the user must request a new one.

---

### User Story 5 - Backwards compatibility for existing users (Priority: P2)

Accounts that existed under the legacy OTP-only model must continue to be usable after the migration without forcing silent data loss. Each such account is treated in a predictable way: either it is considered verified (email ownership already proven historically), or it is prompted to set a password and re-verify on next sign-in.

**Why this priority**: Protects existing users from being locked out. Secondary to launching the new flow, but required before the feature can be rolled out to the whole user base.

**Independent Test**: Can be tested by taking a representative pre-migration account, running the migration, and confirming the user can sign in (or complete the one-time upgrade step) without support intervention.

**Acceptance Scenarios**:

1. **Given** a pre-existing active account, **When** the migration runs, **Then** the account receives a verification state consistent with the chosen strategy (see Assumptions) and a password-setup state (either "password already set" or "must set password on next sign-in").
2. **Given** a pre-existing account that is required to set a password on next sign-in, **When** the user signs in using the legacy OTP flow one last time, **Then** they are prompted to choose a password before a full session is issued.

---

### Edge Cases

- A user enters a correct OTP after expiry — treated as invalid (same response as wrong code, to avoid leaking whether a code ever existed).
- OTP email is delayed and arrives after the user requested a resend — only the newest OTP is valid; the older one is silently dead.
- The same email is used to attempt signup many times in a short window — per-email rate limiting prevents email-bombing; the response is indistinguishable from a normal submission to avoid enumeration.
- A logged-in unverified user manually navigates to a protected page — blocked by the access-control gate, redirected to finish verification.
- Verification completes in one browser tab while another tab holds a stale "unverified" view — the next protected call from the stale tab succeeds (state is read from the session/DB, not cached in the tab).
- Account deletion / GDPR: an unverified account abandoned for the configured retention window is automatically purged along with its OTP records.
- OTP email delivery fails (bounce, transient SMTP error) — the signup still succeeds conceptually, but the UI surfaces the delivery problem and offers resend; the failure must not leak whether the address exists.
- An account is locked for repeated failed password attempts while an OTP is also in flight — the OTP flow remains usable so the legitimate owner can recover; password throttling and OTP throttling are tracked independently.
- Password reset flow (out of scope here, but must not conflict): the reset flow is expected to use a similar email-ownership challenge in a follow-up feature.

## Requirements *(mandatory)*

### Functional Requirements

**Registration**

- **FR-001**: The system MUST allow a new user to register by providing an email address and a password.
- **FR-002**: The system MUST reject passwords that do not meet the configured password policy (minimum length, complexity, and a denylist of common/breached passwords).
- **FR-003**: The system MUST store passwords only as a salted, computationally expensive one-way hash; plaintext passwords MUST never be persisted or logged.
- **FR-004**: On successful registration, the system MUST create the account in an unverified state and MUST NOT issue a session that grants access to protected resources.
- **FR-005**: On successful registration, the system MUST deliver a numeric OTP to the provided email within the configured delivery SLA.
- **FR-006**: If a signup is attempted with an email already tied to a verified account, the system MUST refuse to create a new record and MUST respond in a way that does not confirm or deny whether the email is registered (anti-enumeration).
- **FR-007**: If a signup is attempted with an email tied to an existing unverified account, the system MUST reuse that record and issue a fresh OTP rather than creating a duplicate row.

**OTP issuance and validation**

- **FR-008**: OTPs MUST expire after a short lifetime (default 10 minutes) and MUST be single-use.
- **FR-009**: Issuing a new OTP for a given account MUST invalidate all prior OTPs for that account.
- **FR-010**: The system MUST limit OTP verification attempts per code (default 5) and lock the code after the limit is reached.
- **FR-011**: The system MUST rate-limit OTP issuance per email and per source IP to prevent email-bombing and enumeration.
- **FR-012**: OTPs MUST be stored only as a hash at rest; the plaintext code exists only in the outbound email and in transit.
- **FR-013**: On successful OTP validation, the system MUST mark the account verified, record the verification timestamp, and invalidate the OTP.

**Authentication & access control**

- **FR-014**: Sign-in MUST require email and password; sign-in MUST NOT accept an OTP as a primary credential in the new flow.
- **FR-015**: Sign-in responses for wrong password and non-existent account MUST be indistinguishable (generic "invalid credentials").
- **FR-016**: Sign-in against an unverified account MUST be refused with a distinct "verification required" signal and MUST trigger an automatic OTP resend (subject to rate limits).
- **FR-017**: The authentication layer MUST expose the verified state on the session so downstream access control can read it without an extra database round-trip on every request.
- **FR-018**: Every endpoint that currently requires authentication MUST additionally require the authenticated account to be verified; unverified authenticated requests MUST be rejected with a dedicated "verification required" response distinct from "unauthenticated".
- **FR-019**: A small, explicitly enumerated set of endpoints MUST remain reachable by unverified authenticated users so they can complete verification: submit OTP, request OTP resend, sign out, and read the minimum account state needed to render the verification screen. No other endpoints may rely on this exception.
- **FR-020**: Repeated failed password attempts against the same account MUST be throttled (progressive delay or temporary lockout) to slow brute-force attacks, independent of OTP throttling.

**Data & migration**

- **FR-021**: The user record MUST carry a verification status (unverified / verified) and a verification timestamp.
- **FR-022**: The user record MUST carry a password-hash field; accounts migrated from the legacy OTP-only flow MUST carry a flag indicating that a password is not yet set, so the next sign-in can prompt the user to choose one.
- **FR-023**: OTP records MUST be stored separately from the user record and MUST include: owning account, hashed code, purpose (signup verification vs. future uses), issued-at, expires-at, attempts-used, and consumed-at.
- **FR-024**: The migration MUST be designed so that rollout can be staged (e.g., feature-flagged) and so that existing sessions for pre-migration users remain valid under a defined, documented policy.

**Observability & abuse prevention**

- **FR-025**: The system MUST record a structured audit event for every signup, OTP issuance, OTP validation attempt (success and failure), sign-in attempt (success and failure), verification state transition, and access denial due to unverified state.
- **FR-026**: Audit events MUST NOT contain plaintext passwords, plaintext OTPs, or full session identifiers.
- **FR-027**: The system MUST automatically delete or anonymize unverified accounts that remain unverified beyond a configured retention window (default 30 days), along with any OTP records tied to them.

### Key Entities *(include if feature involves data)*

- **User**: Represents a person with access to the application. Carries identity (email), authentication material (password hash), verification status (unverified/verified), verification timestamp, a flag indicating whether a password has been set, and audit timestamps. The email is unique across verified accounts.
- **EmailVerificationOtp**: Represents a single-use, short-lived numeric code tied to a user and a purpose (signup verification). Carries the code in hashed form, an issued-at and expires-at timestamp, a count of failed attempts, and a consumed-at timestamp. Superseded codes for the same user are invalidated when a new code is issued.
- **AuthEvent** (conceptual): Represents an audit record for authentication-relevant actions (signup, OTP issued, OTP submitted, sign-in attempt, verification completed, access denied due to unverified state). Used for security monitoring and rate-limit decisions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of users who start signup complete email verification within 10 minutes of submitting the signup form.
- **SC-002**: 0% of requests to protected endpoints succeed for accounts whose verification state is "unverified", measured over a rolling 7-day window.
- **SC-003**: OTP email delivery achieves a p95 inbox arrival time of under 60 seconds and a delivery success rate of 99% or better over any 24-hour window.
- **SC-004**: Signup abandonment between "form submitted" and "verification completed" drops by at least 20% compared to the legacy OTP-only flow within 30 days of launch (or does not regress if a baseline is unavailable).
- **SC-005**: Brute-force password attempts against a single account are effectively slowed — an attacker attempting to try 1,000 passwords against one account triggers throttling well before completing the attempt.
- **SC-006**: Support contacts relating to "can't access my account after signup" drop by at least 30% within 60 days of launch, measured against the pre-migration baseline.
- **SC-007**: Zero incidents of plaintext passwords or plaintext OTPs appearing in logs, error traces, or audit records over any audit of the first 90 days post-launch.

## Assumptions

- **Password reset is a separate feature.** This spec covers signup verification and access-gating only. A distinct "forgot password" flow (likely another email-ownership challenge) is assumed to follow and is explicitly out of scope here.
- **Email is the single channel for the verification OTP.** SMS and authenticator-app codes are out of scope for this feature.
- **OTP format is a 6-digit numeric code.** Sufficient entropy when combined with per-code attempt limits, short TTL, and rate limits.
- **OTP TTL defaults to 10 minutes; OTP resend cooldown defaults to 60 seconds; per-email OTP issuance defaults to at most 5 per hour.** These are operational defaults and may be tuned without changing the behavior described here.
- **Unverified retention defaults to 30 days.** Unverified accounts older than this are purged along with their OTP records.
- **Legacy user migration strategy**: pre-existing accounts that had successfully used the OTP-only login before migration are considered verified (since email ownership was demonstrated historically), but they carry a "password not set" flag and will be prompted to choose a password on their next sign-in. This default may be overridden per-deployment.
- **Session model is preserved.** The existing session mechanism continues to be used; this feature adds a verification gate on top, not a replacement for session issuance and storage.
- **Rate limiting is tracked per account and per source IP.** Both dimensions are necessary to cover credential stuffing (many accounts, one IP) and brute force (one account, many IPs).
- **Anti-enumeration is a design requirement.** Responses to signup, sign-in, and resend must not reveal whether an email is registered.
- **Existing business endpoints are considered protected by default.** The small list of exceptions (FR-019) is explicit; any endpoint not on that list requires a verified user.
