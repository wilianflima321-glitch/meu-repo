-- Sprint A: Foundation Production Tables
-- Models: McpServer, ProjectShareLink, SamlAssertionReplayGuard, RenderJob, PublishedGame

-- McpServer
CREATE TABLE IF NOT EXISTS "McpServer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "transport" TEXT NOT NULL DEFAULT 'stdio',
    "status" TEXT NOT NULL DEFAULT 'registered',
    "description" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpServer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "McpServer_userId_idx" ON "McpServer"("userId");
CREATE INDEX IF NOT EXISTS "McpServer_status_idx" ON "McpServer"("status");

ALTER TABLE "McpServer" DROP CONSTRAINT IF EXISTS "McpServer_userId_fkey";
ALTER TABLE "McpServer" ADD CONSTRAINT "McpServer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProjectShareLink
CREATE TABLE IF NOT EXISTS "ProjectShareLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'link',
    "permissions" TEXT NOT NULL DEFAULT 'view',
    "invitedEmail" TEXT,
    "teamId" TEXT,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectShareLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectShareLink_token_key" ON "ProjectShareLink"("token");
CREATE INDEX IF NOT EXISTS "ProjectShareLink_projectId_idx" ON "ProjectShareLink"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectShareLink_token_idx" ON "ProjectShareLink"("token");
CREATE INDEX IF NOT EXISTS "ProjectShareLink_createdBy_idx" ON "ProjectShareLink"("createdBy");

ALTER TABLE "ProjectShareLink" DROP CONSTRAINT IF EXISTS "ProjectShareLink_projectId_fkey";
ALTER TABLE "ProjectShareLink" ADD CONSTRAINT "ProjectShareLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SamlAssertionReplayGuard
CREATE TABLE IF NOT EXISTS "SamlAssertionReplayGuard" (
    "assertionId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SamlAssertionReplayGuard_pkey" PRIMARY KEY ("assertionId")
);

CREATE INDEX IF NOT EXISTS "SamlAssertionReplayGuard_expiresAt_idx" ON "SamlAssertionReplayGuard"("expiresAt");

-- RenderJob
CREATE TABLE IF NOT EXISTS "RenderJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL DEFAULT 'internal',
    "outputUrl" TEXT,
    "errorMessage" TEXT,
    "costUsd" DOUBLE PRECISION,
    "receiptRef" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenderJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RenderJob_projectId_idx" ON "RenderJob"("projectId");
CREATE INDEX IF NOT EXISTS "RenderJob_requestedBy_idx" ON "RenderJob"("requestedBy");
CREATE INDEX IF NOT EXISTS "RenderJob_status_idx" ON "RenderJob"("status");

ALTER TABLE "RenderJob" DROP CONSTRAINT IF EXISTS "RenderJob_projectId_fkey";
ALTER TABLE "RenderJob" ADD CONSTRAINT "RenderJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RenderJob" DROP CONSTRAINT IF EXISTS "RenderJob_requestedBy_fkey";
ALTER TABLE "RenderJob" ADD CONSTRAINT "RenderJob_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PublishedGame
CREATE TABLE IF NOT EXISTS "PublishedGame" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exportJobId" TEXT,
    "playUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "plays" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishedGame_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PublishedGame_slug_key" ON "PublishedGame"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "PublishedGame_projectId_key" ON "PublishedGame"("projectId");
CREATE INDEX IF NOT EXISTS "PublishedGame_authorId_idx" ON "PublishedGame"("authorId");
CREATE INDEX IF NOT EXISTS "PublishedGame_status_idx" ON "PublishedGame"("status");
CREATE INDEX IF NOT EXISTS "PublishedGame_visibility_idx" ON "PublishedGame"("visibility");
CREATE INDEX IF NOT EXISTS "PublishedGame_publishedAt_idx" ON "PublishedGame"("publishedAt");

ALTER TABLE "PublishedGame" DROP CONSTRAINT IF EXISTS "PublishedGame_projectId_fkey";
ALTER TABLE "PublishedGame" ADD CONSTRAINT "PublishedGame_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublishedGame" DROP CONSTRAINT IF EXISTS "PublishedGame_authorId_fkey";
ALTER TABLE "PublishedGame" ADD CONSTRAINT "PublishedGame_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
