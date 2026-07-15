-- Block 6B.6 / DEBT-FIN-002 — cached O(1) credit wallet balance on User.
-- Source of truth remains CreditLedgerEntry; cache is maintained on every debit/credit path
-- and lazily rebuilt when creditBalanceSyncedAt IS NULL.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creditBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creditBalanceSyncedAt" TIMESTAMP(3);
