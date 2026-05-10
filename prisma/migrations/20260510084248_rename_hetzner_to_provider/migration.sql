-- Rename Hetzner-specific columns to provider-neutral names so a future
-- AWS/GCP backend can be added without another schema migration. Each table
-- gets a `provider` column that defaults to "hetzner" so existing rows are
-- backfilled implicitly. The unique index on servers.providerServerId is
-- preserved automatically by RENAME COLUMN.

ALTER TABLE "users" RENAME COLUMN "hetznerToken" TO "providerToken";
ALTER TABLE "users" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'hetzner';

ALTER TABLE "user_snapshots" RENAME COLUMN "hetznerImageId" TO "providerImageId";
ALTER TABLE "user_snapshots" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'hetzner';

ALTER TABLE "servers" RENAME COLUMN "hetznerServerId" TO "providerServerId";
ALTER TABLE "servers" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'hetzner';

ALTER TABLE "snapshot_builds" RENAME COLUMN "hetznerBuilderId" TO "providerBuilderId";
ALTER TABLE "snapshot_builds" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'hetzner';
