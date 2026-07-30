-- CreateTable
CREATE TABLE "workspace_utm_settings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "allowedSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedMediums" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_utm_settings_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "link" ADD COLUMN "qrPlacement" TEXT,
ADD COLUMN "utmSource" TEXT,
ADD COLUMN "utmMedium" TEXT,
ADD COLUMN "utmCampaign" TEXT,
ADD COLUMN "utmContent" TEXT,
ADD COLUMN "utmTerm" TEXT;

-- CreateTable
CREATE TABLE "click_event" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorHash" TEXT NOT NULL,
    "country" TEXT,
    "referrer" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "operatingSystem" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "click_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_link_statistic" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "uniqueClicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_link_statistic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_utm_settings_workspaceId_key" ON "workspace_utm_settings"("workspaceId");

-- CreateIndex
CREATE INDEX "click_event_linkId_idx" ON "click_event"("linkId");

-- CreateIndex
CREATE INDEX "click_event_timestamp_idx" ON "click_event"("timestamp");

-- CreateIndex
CREATE INDEX "click_event_country_idx" ON "click_event"("country");

-- CreateIndex
CREATE INDEX "click_event_linkId_timestamp_idx" ON "click_event"("linkId", "timestamp");

-- CreateIndex
CREATE INDEX "click_event_linkId_visitorHash_timestamp_idx" ON "click_event"("linkId", "visitorHash", "timestamp");

-- CreateIndex
CREATE INDEX "daily_link_statistic_date_idx" ON "daily_link_statistic"("date");

-- CreateIndex
CREATE INDEX "daily_link_statistic_linkId_date_idx" ON "daily_link_statistic"("linkId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_link_statistic_linkId_date_key" ON "daily_link_statistic"("linkId", "date");

-- CreateIndex
CREATE INDEX "link_utmSource_idx" ON "link"("utmSource");

-- CreateIndex
CREATE INDEX "link_utmMedium_idx" ON "link"("utmMedium");

-- CreateIndex
CREATE INDEX "link_utmCampaign_idx" ON "link"("utmCampaign");

-- AddForeignKey
ALTER TABLE "workspace_utm_settings" ADD CONSTRAINT "workspace_utm_settings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_event" ADD CONSTRAINT "click_event_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "link"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_link_statistic" ADD CONSTRAINT "daily_link_statistic_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "link"("id") ON DELETE CASCADE ON UPDATE CASCADE;
