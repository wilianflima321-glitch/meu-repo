-- F.1 / Law II — Prisma GameSave cloud slots (optional R2 CAS via blobHash/r2Key)
CREATE TABLE IF NOT EXISTS "GameSave" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB,
    "checksum" TEXT NOT NULL,
    "blobHash" TEXT,
    "r2Key" TEXT,
    "clientPlatform" TEXT,
    "revisedAt" TIMESTAMP(3) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSave_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GameSave_userId_gameId_slotIndex_key"
  ON "GameSave"("userId", "gameId", "slotIndex");

CREATE INDEX IF NOT EXISTS "GameSave_userId_gameId_idx" ON "GameSave"("userId", "gameId");
CREATE INDEX IF NOT EXISTS "GameSave_blobHash_idx" ON "GameSave"("blobHash");
CREATE INDEX IF NOT EXISTS "GameSave_revisedAt_idx" ON "GameSave"("revisedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GameSave_userId_fkey'
  ) THEN
    ALTER TABLE "GameSave"
      ADD CONSTRAINT "GameSave_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
