-- Scope each user's golden Hetzner image per deployment environment so a
-- preview build can't clobber the prod snapshot. Existing rows are migrated
-- into the "production" bucket before the legacy column is dropped.

-- CreateTable
CREATE TABLE "user_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "hetznerImageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_snapshots_userId_environment_key" ON "user_snapshots"("userId", "environment");

-- CreateIndex
CREATE INDEX "user_snapshots_userId_idx" ON "user_snapshots"("userId");

-- AddForeignKey
ALTER TABLE "user_snapshots" ADD CONSTRAINT "user_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing per-user golden images into the production bucket.
INSERT INTO "user_snapshots" ("id", "userId", "environment", "hetznerImageId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'production', "hetznerImageId", NOW(), NOW()
FROM "users"
WHERE "hetznerImageId" IS NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "hetznerImageId";
