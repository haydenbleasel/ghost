-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DesiredState" AS ENUM ('running', 'stopped', 'deleted');

-- CreateEnum
CREATE TYPE "ObservedState" AS ENUM ('pending', 'provisioning', 'running', 'unhealthy', 'lost', 'stopped', 'failed', 'deleted');

-- CreateEnum
CREATE TYPE "SnapshotBuildStatus" AS ENUM ('pending', 'compiling_agent', 'creating_vm', 'installing', 'snapshotting', 'ready', 'failed');

-- CreateTable
CREATE TABLE "snapshots" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'hetzner',
    "providerImageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "serverType" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'hetzner',
    "providerServerId" TEXT,
    "ipv4" TEXT,
    "desiredState" "DesiredState" NOT NULL DEFAULT 'running',
    "observedState" "ObservedState" NOT NULL DEFAULT 'pending',
    "phase" TEXT NOT NULL DEFAULT 'queued',
    "errorReason" TEXT,
    "rconPassword" TEXT NOT NULL,
    "joinPassword" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "backupsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastCommandId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_enrollments" (
    "jti" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "burnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_enrollments_pkey" PRIMARY KEY ("jti")
);

-- CreateTable
CREATE TABLE "commands" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "ackedAt" TIMESTAMP(3),
    "error" TEXT,
    "result" JSONB,
    "durationMs" INTEGER,

    CONSTRAINT "commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'server',

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_chunks" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "stream" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_builds" (
    "id" TEXT NOT NULL,
    "status" "SnapshotBuildStatus" NOT NULL DEFAULT 'pending',
    "agentBlobUrl" TEXT,
    "agentSha" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'hetzner',
    "providerBuilderId" TEXT,
    "snapshotId" TEXT,
    "previousSnapshotId" TEXT,
    "errorReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "snapshot_builds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "snapshots_environment_key" ON "snapshots"("environment");

-- CreateIndex
CREATE UNIQUE INDEX "servers_providerServerId_key" ON "servers"("providerServerId");

-- CreateIndex
CREATE INDEX "servers_desiredState_observedState_idx" ON "servers"("desiredState", "observedState");

-- CreateIndex
CREATE UNIQUE INDEX "agents_serverId_key" ON "agents"("serverId");

-- CreateIndex
CREATE INDEX "agent_enrollments_serverId_idx" ON "agent_enrollments"("serverId");

-- CreateIndex
CREATE INDEX "commands_serverId_status_idx" ON "commands"("serverId", "status");

-- CreateIndex
CREATE INDEX "activity_events_serverId_occurredAt_idx" ON "activity_events"("serverId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "activity_events_serverId_seq_key" ON "activity_events"("serverId", "seq");

-- CreateIndex
CREATE INDEX "log_chunks_serverId_ts_idx" ON "log_chunks"("serverId", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "log_chunks_serverId_seq_key" ON "log_chunks"("serverId", "seq");

-- CreateIndex
CREATE INDEX "snapshot_builds_createdAt_idx" ON "snapshot_builds"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_enrollments" ADD CONSTRAINT "agent_enrollments_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commands" ADD CONSTRAINT "commands_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_chunks" ADD CONSTRAINT "log_chunks_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

