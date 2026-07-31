-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'VIEWER');

-- AlterTable: add new workspace columns (nullable first for backfill)
ALTER TABLE "workspace" ADD COLUMN "logoPath" TEXT;
ALTER TABLE "workspace" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "workspace" ADD COLUMN "ownerId" TEXT;

-- Backfill ownerId from legacy userId
UPDATE "workspace" SET "ownerId" = "userId" WHERE "ownerId" IS NULL;

-- CreateTable workspace_member
CREATE TABLE "workspace_member" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_member_pkey" PRIMARY KEY ("id")
);

-- Backfill Owner memberships from legacy userId
INSERT INTO "workspace_member" ("id", "workspaceId", "userId", "role", "createdAt")
SELECT gen_random_uuid()::text, "id", "userId", 'OWNER', CURRENT_TIMESTAMP
FROM "workspace";

-- CreateTable workspace_invitation
CREATE TABLE "workspace_invitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable asset_folder
CREATE TABLE "asset_folder" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable asset
CREATE TABLE "asset" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "folderId" TEXT,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

-- Drop legacy FK and unique on userId
ALTER TABLE "workspace" DROP CONSTRAINT IF EXISTS "workspace_userId_fkey";
DROP INDEX IF EXISTS "workspace_userId_key";
ALTER TABLE "workspace" DROP COLUMN "userId";

-- Make ownerId required
ALTER TABLE "workspace" ALTER COLUMN "ownerId" SET NOT NULL;

-- Indexes
CREATE INDEX "workspace_ownerId_idx" ON "workspace"("ownerId");
CREATE UNIQUE INDEX "workspace_member_workspaceId_userId_key" ON "workspace_member"("workspaceId", "userId");
CREATE INDEX "workspace_member_userId_idx" ON "workspace_member"("userId");
CREATE UNIQUE INDEX "workspace_invitation_token_key" ON "workspace_invitation"("token");
CREATE INDEX "workspace_invitation_workspaceId_idx" ON "workspace_invitation"("workspaceId");
CREATE INDEX "workspace_invitation_email_idx" ON "workspace_invitation"("email");
CREATE INDEX "asset_folder_campaignId_idx" ON "asset_folder"("campaignId");
CREATE INDEX "asset_folder_parentId_idx" ON "asset_folder"("parentId");
CREATE INDEX "asset_campaignId_idx" ON "asset"("campaignId");
CREATE INDEX "asset_folderId_idx" ON "asset"("folderId");
CREATE INDEX "asset_uploadedById_idx" ON "asset"("uploadedById");
CREATE INDEX "asset_mimeType_idx" ON "asset"("mimeType");

-- Foreign keys
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_invitation" ADD CONSTRAINT "workspace_invitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_invitation" ADD CONSTRAINT "workspace_invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset_folder" ADD CONSTRAINT "asset_folder_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset_folder" ADD CONSTRAINT "asset_folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "asset_folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset" ADD CONSTRAINT "asset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset" ADD CONSTRAINT "asset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "asset_folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset" ADD CONSTRAINT "asset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
