# Data Retention & Privacy Policy (Operational)

**Status:** Canonical operational policy (2026-06-19)
**Scope:** Aethel Engine cloud platform (`cloud-web-app/web`)
**Legal basis:** LGPD (Brazil) + GDPR (EU) — rights to access, portability, and erasure.
**Implements:** `IMPROVE-COMPLIANCE-001`
**Surfaces:**
- Export (portability): `GET /api/account/export` → UI `Settings → Security → Export my data`
- Erasure (right to be forgotten): `DELETE /api/account` → UI `Settings → Security → Delete account`

> This is the operational source of truth for engineers. The user-facing legal copy lives at `/privacy` and `/legal/privacy`; keep them consistent with this file.

---

## 1. Principles

1. **Data minimization** — we store only what the product needs to function and bill correctly.
2. **Self-serve rights** — users can export and delete their own data without contacting support.
3. **Honest erasure** — deletion is real and irreversible (Prisma `onDelete: Cascade`), not a soft flag.
4. **Secrets never leave** — exports exclude passwords, auth tokens, MFA secrets, and BYOK keys.

---

## 2. What we store and why (grounded in `prisma/schema.prisma`)

| Data | Model(s) | Purpose | Retention |
|------|----------|---------|-----------|
| Account profile | `User` | Authentication, billing identity | Until account deletion |
| Auth sessions | `Session` | Keep users signed in | Expire at `expiresAt`; deleted with account |
| Projects, files, assets | `Project`, `File`, `Asset` | Core product | Until project or account deletion |
| Chat history | `ChatThread`, `ChatMessage` | AI assistant continuity | Until account deletion (or per-thread delete) |
| Usage metering | `UsageBucket` | Quota enforcement, billing accuracy | Rolling; deleted with account |
| Payments | `Payment`, `Subscription` | Billing, tax, dispute records | See §4 (financial exception) |
| Credits ledger | `CreditLedgerEntry` | Wallet integrity | Deleted with account |
| Audit log | `AuditLog` | Security/abuse investigation | Deleted with account |
| Support | `SupportTicket`, `SupportMessage` | Customer support | Deleted with account |
| Integrations | `McpServer`, `InstalledExtension` | User configuration | Deleted with account |

---

## 3. Erasure behavior (`DELETE /api/account`)

1. Requires explicit confirmation: body `{ confirmation: "DELETE", email: "<account email>" }`.
2. Best-effort cancels the active Stripe subscription (non-blocking — erasure never fails on Stripe).
3. Deletes the `User` row; all related rows cascade via `onDelete: Cascade`.
4. Clears the auth cookie on the response.
5. Action is logged (`account.deleted`) **before** the row disappears, via structured logger (not a DB row that would be cascade-deleted).

**Irreversibility:** there is no soft-delete or recovery window. This is intentional for genuine erasure.

---

## 4. Financial records exception

Payment and invoice records may be retained by our payment processor (Stripe) and in aggregate accounting for the period required by tax/financial law, independent of platform account deletion. Platform-side `Payment`/`Subscription` rows are deleted with the account; the authoritative financial record of record remains with Stripe.

---

## 5. Export behavior (`GET /api/account/export`)

- Returns a single JSON document (`format: aethel.account-export`, `version: 1`).
- Includes: profile (safe fields), subscription, payments, usage, credits, projects, chat threads, support tickets, MCP servers.
- **Excludes** (by design): `password`, `verificationToken`, `resetToken`, `mfaSecret`, `mfaBackupCodes`, `byokKey`, `adminPermissions`.
- Delivered as a download (`Content-Disposition: attachment`), `Cache-Control: no-store`.

---

## 6. Open follow-ups

| Item | Owner | Notes |
|------|-------|-------|
| Backups vs erasure | Ops | `IMPROVE-OPS-002` — ensure deleted accounts are purged from PITR backups within the backup rotation window |
| Async export for large accounts | Platform | Current export is synchronous; consider a job + email link if payloads grow large |
| Reconcile `/privacy` legal copy | Product/Legal | Keep public legal text aligned with this operational policy |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-19 | v1 — operational retention policy created alongside live export + erasure endpoints (`IMPROVE-COMPLIANCE-001`) |
