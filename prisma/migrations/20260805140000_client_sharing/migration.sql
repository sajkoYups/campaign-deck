-- AlterEnum
ALTER TYPE "WorkspaceRole" ADD VALUE 'GUEST';

-- CreateEnum
CREATE TYPE "ClientAccessRole" AS ENUM ('VIEWER');

-- CreateTable
CREATE TABLE "client_access" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ClientAccessRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_invitation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ClientAccessRole" NOT NULL DEFAULT 'VIEWER',
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_access_userId_idx" ON "client_access"("userId");

-- CreateIndex
CREATE INDEX "client_access_clientId_idx" ON "client_access"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "client_access_clientId_userId_key" ON "client_access"("clientId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "client_invitation_token_key" ON "client_invitation"("token");

-- CreateIndex
CREATE INDEX "client_invitation_clientId_idx" ON "client_invitation"("clientId");

-- CreateIndex
CREATE INDEX "client_invitation_email_idx" ON "client_invitation"("email");

-- AddForeignKey
ALTER TABLE "client_access" ADD CONSTRAINT "client_access_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_access" ADD CONSTRAINT "client_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_invitation" ADD CONSTRAINT "client_invitation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_invitation" ADD CONSTRAINT "client_invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
