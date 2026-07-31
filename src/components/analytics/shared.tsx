"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "custom", label: "Custom" },
] as const;

export function RangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = searchParams.get("range") ?? "30d";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function setRange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", next);
    if (next !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function setCustom(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    if (value) {
      const iso = new Date(value).toISOString();
      params.set(key, iso);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => (
        <Button
          key={preset.key}
          size="sm"
          variant={range === preset.key ? "default" : "outline"}
          onClick={() => setRange(preset.key)}
        >
          {preset.label}
        </Button>
      ))}
      {range === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="h-7 w-auto"
            value={from ? from.slice(0, 10) : ""}
            onChange={(e) => setCustom("from", e.target.value)}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="h-7 w-auto"
            value={to ? to.slice(0, 10) : ""}
            onChange={(e) => setCustom("to", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

export function CampaignNav({
  campaignId,
  active,
}: {
  campaignId: string;
  active: "overview" | "links" | "analytics" | "assets";
}) {
  const items = [
    { key: "overview", href: `/campaigns/${campaignId}`, label: "Overview" },
    {
      key: "links",
      href: `/campaigns/${campaignId}/links`,
      label: "Links",
    },
    {
      key: "analytics",
      href: `/campaigns/${campaignId}/analytics`,
      label: "Analytics",
    },
    {
      key: "assets",
      href: `/campaigns/${campaignId}/assets`,
      label: "Assets",
    },
  ] as const;

  return (
    <div className="flex gap-1 border-b border-border">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={
            active === item.key
              ? "-mb-px border-b-2 border-foreground px-3 py-2 text-sm font-medium"
              : "px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          }
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

export function BreakdownList({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="truncate text-muted-foreground">{item.label}</span>
              <span className="font-medium tabular-nums">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
