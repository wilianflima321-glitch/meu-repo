-- Block 6G.7 / H.1 prep — Aethel Coins ledger stub (no mint API yet)
CREATE TABLE IF NOT EXISTS "AethelCoinLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'aethel_coins',
    "entryType" TEXT NOT NULL,
    "reference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AethelCoinLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AethelCoinLedgerEntry_userId_createdAt_idx" ON "AethelCoinLedgerEntry"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AethelCoinLedgerEntry_entryType_idx" ON "AethelCoinLedgerEntry"("entryType");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AethelCoinLedgerEntry_userId_fkey'
  ) THEN
    ALTER TABLE "AethelCoinLedgerEntry"
      ADD CONSTRAINT "AethelCoinLedgerEntry_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
