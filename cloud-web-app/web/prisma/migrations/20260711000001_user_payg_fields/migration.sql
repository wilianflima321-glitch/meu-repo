-- Block 6C — PAYG on-demand fields (default off; mandatory spend cap).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paygEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paygSpendCapUsdCents" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paygAccruedUsdCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paygPeriodKey" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripePaymentMethodId" TEXT;
