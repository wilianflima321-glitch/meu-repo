-- Block 6F — Creative Wallet O(1) balance cache (lane-separated from LLM creditBalance)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creativeCreditBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creativeCreditBalanceSyncedAt" TIMESTAMP(3);
