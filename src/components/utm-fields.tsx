"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  defaultUtmCampaignFromName,
  suggestedMediumsForSource,
} from "@/lib/analytics/utm-presets";

type UtmSettings = {
  allowedSources: string[];
  allowedMediums: string[];
};

type UtmFieldsProps = {
  campaignName: string;
  settings: UtmSettings | null;
  defaults?: {
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmContent?: string | null;
    utmTerm?: string | null;
  };
};

export function UtmFields({
  campaignName,
  settings,
  defaults,
}: UtmFieldsProps) {
  const allowedSources = settings?.allowedSources ?? [];
  const allowedMediums = settings?.allowedMediums ?? [];
  const autoCampaign = defaultUtmCampaignFromName(campaignName);

  const [source, setSource] = useState(defaults?.utmSource ?? "");
  const [medium, setMedium] = useState(defaults?.utmMedium ?? "");

  const mediumOptions = suggestedMediumsForSource(
    source,
    allowedMediums,
  );

  useEffect(() => {
    if (!medium) return;
    if (mediumOptions.length > 0 && !mediumOptions.includes(medium)) {
      setMedium("");
    }
  }, [medium, mediumOptions]);

  const selectClassName =
    "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <div className="text-sm font-medium">UTM parameters</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Optional tags appended to the destination URL for analytics tools.
          All fields are optional.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="utmSource">Source</Label>
          <p className="text-[11px] text-muted-foreground">
            Where traffic comes from (facebook, newsletter…)
          </p>
          {allowedSources.length > 0 ? (
            <select
              id="utmSource"
              name="utmSource"
              className={selectClassName}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">None</option>
              {allowedSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id="utmSource"
              name="utmSource"
              placeholder="facebook"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="utmMedium">Medium</Label>
          <p className="text-[11px] text-muted-foreground">
            Channel type
            {source
              ? " — filtered for the selected source"
              : " — pick a source first for suggestions"}
          </p>
          {mediumOptions.length > 0 || allowedMediums.length > 0 ? (
            <select
              id="utmMedium"
              name="utmMedium"
              className={selectClassName}
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              disabled={!source && mediumOptions.length === 0}
            >
              <option value="">None</option>
              {(mediumOptions.length > 0
                ? mediumOptions
                : allowedMediums
              ).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id="utmMedium"
              name="utmMedium"
              placeholder="paid-social"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="utmCampaign">Campaign (analytics tag)</Label>
          <p className="text-[11px] text-muted-foreground">
            Auto-filled from this CampaignDeck campaign for Google Analytics.
            Override only if needed.
          </p>
          <Input
            id="utmCampaign"
            name="utmCampaign"
            defaultValue={defaults?.utmCampaign ?? autoCampaign}
            placeholder={autoCampaign || "summer-sale"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="utmContent">Content</Label>
          <p className="text-[11px] text-muted-foreground">
            Which creative or CTA (carousel-a, header-cta). Skip if only one
            link.
          </p>
          <Input
            id="utmContent"
            name="utmContent"
            defaultValue={defaults?.utmContent ?? ""}
            placeholder="carousel-a"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="utmTerm">Term</Label>
          <p className="text-[11px] text-muted-foreground">
            Paid search keyword only. Leave blank for email/social/QR.
          </p>
          <Input
            id="utmTerm"
            name="utmTerm"
            defaultValue={defaults?.utmTerm ?? ""}
            placeholder="running-shoes"
          />
        </div>
      </div>
    </div>
  );
}
