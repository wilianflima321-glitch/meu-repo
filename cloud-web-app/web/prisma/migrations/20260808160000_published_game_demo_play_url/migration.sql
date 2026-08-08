-- R18 / XIV.3 — Persist Instant Play honesty on PublishedGame (fail-closed; no fake URLs).
-- Operator: apply with `npx prisma migrate deploy` (or `migrate dev`) when DATABASE_URL is available.
ALTER TABLE "PublishedGame" ADD COLUMN IF NOT EXISTS "demoPlayUrl" TEXT;
ALTER TABLE "PublishedGame" ADD COLUMN IF NOT EXISTS "noWebDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PublishedGame" ADD COLUMN IF NOT EXISTS "demoBundleBytes" INTEGER;
ALTER TABLE "PublishedGame" ADD COLUMN IF NOT EXISTS "compressionMandatePassed" BOOLEAN NOT NULL DEFAULT false;
