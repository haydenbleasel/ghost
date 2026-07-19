-- AlterEnum
ALTER TYPE "DesiredState" ADD VALUE 'hibernated' AFTER 'stopped';

-- AlterEnum
ALTER TYPE "ObservedState" ADD VALUE 'hibernating' AFTER 'stopped';
ALTER TYPE "ObservedState" ADD VALUE 'hibernated' AFTER 'hibernating';
ALTER TYPE "ObservedState" ADD VALUE 'waking' AFTER 'hibernated';

-- AlterTable
ALTER TABLE "servers" ADD COLUMN "hibernatedAt" TIMESTAMP(3),
ADD COLUMN "hibernationImageId" TEXT;
