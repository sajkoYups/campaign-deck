"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  isOnboardingStep,
  type OnboardingStep,
} from "@/lib/onboarding-steps";

type Progress = {
  client: { id: string; name: string } | null;
  campaign: { id: string; name: string; clientId: string } | null;
  link: {
    id: string;
    name: string;
    shortUrl: string;
    slug: string;
    campaignId: string;
  } | null;
};

const STEPS: OnboardingStep[] = [
  "welcome",
  "client",
  "campaign",
  "link",
  "explain",
  "done",
];

/** Honor saved step (e.g. replay → welcome); only clamp when prerequisites are missing. */
function inferStep(progress: Progress, saved?: string | null): OnboardingStep {
  if (isOnboardingStep(saved)) {
    if (
      (saved === "campaign" ||
        saved === "link" ||
        saved === "explain" ||
        saved === "done") &&
      !progress.client
    ) {
      return "welcome";
    }
    if (
      (saved === "link" || saved === "explain" || saved === "done") &&
      !progress.campaign
    ) {
      return progress.client ? "campaign" : "welcome";
    }
    if ((saved === "explain" || saved === "done") && !progress.link) {
      return progress.campaign ? "link" : progress.client ? "campaign" : "welcome";
    }
    return saved;
  }

  if (!progress.client) return "welcome";
  if (!progress.campaign) return "campaign";
  if (!progress.link) return "link";
  return "explain";
}

async function patchOnboarding(
  action: "complete" | "skip" | "step",
  step?: OnboardingStep,
) {
  await fetch("/api/workspace/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, step }),
  });
}

export function OnboardingWizard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [progress, setProgress] = useState<Progress>({
    client: null,
    campaign: null,
    link: null,
  });

  useEffect(() => {
    fetch("/api/workspace/onboarding")
      .then((r) => r.json())
      .then((json) => {
        const nextProgress: Progress = json.data?.progress ?? {
          client: null,
          campaign: null,
          link: null,
        };
        setProgress(nextProgress);
        setStep(inferStep(nextProgress, json.data?.workspace?.onboardingStep));
      })
      .catch(() => toast.error("Failed to load onboarding"))
      .finally(() => setLoading(false));
  }, []);

  const stepIndex = STEPS.indexOf(step);
  const progressLabel = useMemo(
    () => `${Math.min(stepIndex + 1, STEPS.length)} / ${STEPS.length}`,
    [stepIndex],
  );

  async function goTo(next: OnboardingStep) {
    setStep(next);
    await patchOnboarding("step", next);
  }

  async function skip() {
    setSaving(true);
    await patchOnboarding("skip");
    setSaving(false);
    router.push("/dashboard");
    router.refresh();
  }

  async function complete() {
    setSaving(true);
    await patchOnboarding("complete");
    setSaving(false);
    router.push("/dashboard");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading onboarding…
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold tracking-tight">CampaignDeck</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Step {progressLabel}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={skip} disabled={saving}>
          Skip for now
        </Button>
      </div>

      <div className="mb-8 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-foreground transition-all"
          style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {step === "welcome" && (
        <WelcomeStep onContinue={() => goTo("client")} />
      )}
      {step === "client" && (
        <ClientStep
          existing={progress.client}
          saving={saving}
          setSaving={setSaving}
          onDone={async (client) => {
            setProgress((p) => ({ ...p, client }));
            await goTo("campaign");
          }}
        />
      )}
      {step === "campaign" && progress.client && (
        <CampaignStep
          clientId={progress.client.id}
          clientName={progress.client.name}
          existing={progress.campaign}
          saving={saving}
          setSaving={setSaving}
          onDone={async (campaign) => {
            setProgress((p) => ({ ...p, campaign }));
            await goTo("link");
          }}
        />
      )}
      {step === "link" && progress.campaign && (
        <LinkStep
          campaignId={progress.campaign.id}
          campaignName={progress.campaign.name}
          existing={progress.link}
          saving={saving}
          setSaving={setSaving}
          onDone={async (link) => {
            setProgress((p) => ({ ...p, link }));
            await goTo("explain");
          }}
        />
      )}
      {step === "explain" && progress.link && (
        <ExplainStep
          link={progress.link}
          onContinue={() => goTo("done")}
        />
      )}
      {step === "done" && (
        <DoneStep
          campaignId={progress.campaign?.id}
          linkId={progress.link?.id}
          saving={saving}
          onFinish={complete}
        />
      )}
    </div>
  );
}

function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome to CampaignDeck
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          CampaignDeck is the source of truth for marketing links — not Bitly,
          not analytics theater. Every link belongs to a hierarchy:
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <ol className="space-y-3 text-sm">
          <li>
            <span className="font-medium">Workspace</span>
            <span className="text-muted-foreground"> — your agency account</span>
          </li>
          <li>
            <span className="font-medium">Client</span>
            <span className="text-muted-foreground"> — who you work for</span>
          </li>
          <li>
            <span className="font-medium">Campaign</span>
            <span className="text-muted-foreground"> — a launch, sale, or push</span>
          </li>
          <li>
            <span className="font-medium">Link</span>
            <span className="text-muted-foreground">
              {" "}
              — the short URL + QR you share
            </span>
          </li>
        </ol>
      </div>

      <p className="text-sm text-muted-foreground">
        Next we&apos;ll create your first real client, campaign, and link so
        you learn by doing.
      </p>

      <Button onClick={onContinue} className="w-full sm:w-auto">
        Continue
      </Button>
    </div>
  );
}

function ClientStep({
  existing,
  saving,
  setSaving,
  onDone,
}: {
  existing: Progress["client"];
  saving: boolean;
  setSaving: (v: boolean) => void;
  onDone: (client: { id: string; name: string }) => Promise<void>;
}) {
  if (existing) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Client ready</h1>
          <p className="text-sm text-muted-foreground">
            You already created <span className="font-medium text-foreground">{existing.name}</span>.
          </p>
        </div>
        <Button onClick={() => onDone(existing)}>Continue</Button>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        website: form.get("website") || undefined,
        notes: form.get("notes") || undefined,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(json.error?.message || "Failed to create client");
      return;
    }
    toast.success("Client created");
    await onDone({ id: json.data.id, name: json.data.name });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your first client
        </h1>
        <p className="text-sm text-muted-foreground">
          A client is the brand or business you manage links for — e.g. Nike,
          BioShop, or your own company.
        </p>
      </div>
      <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="name">Client name</Label>
          <Input id="name" name="name" required placeholder="BioShop" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website (optional)</Label>
          <Input
            id="website"
            name="website"
            type="url"
            placeholder="https://example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" name="notes" rows={3} />
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Creating…" : "Create client"}
      </Button>
    </form>
  );
}

function CampaignStep({
  clientId,
  clientName,
  existing,
  saving,
  setSaving,
  onDone,
}: {
  clientId: string;
  clientName: string;
  existing: Progress["campaign"];
  saving: boolean;
  setSaving: (v: boolean) => void;
  onDone: (campaign: {
    id: string;
    name: string;
    clientId: string;
  }) => Promise<void>;
}) {
  if (existing) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Campaign ready
          </h1>
          <p className="text-sm text-muted-foreground">
            You already created{" "}
            <span className="font-medium text-foreground">{existing.name}</span>.
          </p>
        </div>
        <Button onClick={() => onDone(existing)}>Continue</Button>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        name: form.get("name"),
        description: form.get("description") || undefined,
        status: "ACTIVE",
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(json.error?.message || "Failed to create campaign");
      return;
    }
    toast.success("Campaign created");
    await onDone({
      id: json.data.id,
      name: json.data.name,
      clientId,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create a campaign
        </h1>
        <p className="text-sm text-muted-foreground">
          Campaigns are the primary object. Everything else belongs to a
          campaign under <span className="font-medium text-foreground">{clientName}</span> —
          e.g. Black Friday, Summer Sale, Launch.
        </p>
      </div>
      <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="name">Campaign name</Label>
          <Input id="name" name="name" required placeholder="Summer Sale" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea id="description" name="description" rows={3} />
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Creating…" : "Create campaign"}
      </Button>
    </form>
  );
}

function LinkStep({
  campaignId,
  campaignName,
  existing,
  saving,
  setSaving,
  onDone,
}: {
  campaignId: string;
  campaignName: string;
  existing: Progress["link"];
  saving: boolean;
  setSaving: (v: boolean) => void;
  onDone: (link: Progress["link"] & object) => Promise<void>;
}) {
  if (existing) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Link ready</h1>
          <p className="text-sm text-muted-foreground">
            You already created{" "}
            <span className="font-medium text-foreground">{existing.name}</span>.
          </p>
        </div>
        <Button onClick={() => onDone(existing)}>Continue</Button>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        name: form.get("name"),
        destinationUrl: form.get("destinationUrl"),
        slug: form.get("slug") || undefined,
        utmSource: form.get("utmSource") || undefined,
        utmMedium: form.get("utmMedium") || undefined,
        utmCampaign: form.get("utmCampaign") || undefined,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(json.error?.message || "Failed to create link");
      return;
    }
    toast.success("Link created");
    await onDone({
      id: json.data.id,
      name: json.data.name,
      shortUrl: json.data.shortUrl,
      slug: json.data.slug,
      campaignId,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your first link
        </h1>
        <p className="text-sm text-muted-foreground">
          Links live inside{" "}
          <span className="font-medium text-foreground">{campaignName}</span>.
          You get a short URL and QR automatically. Optional UTM fields keep
          reporting consistent.
        </p>
      </div>
      <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="name">Link name</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="Facebook Carousel"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destinationUrl">Destination URL</Label>
          <Input
            id="destinationUrl"
            name="destinationUrl"
            type="url"
            required
            placeholder="https://example.com/sale"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Custom slug (optional)</Label>
          <Input id="slug" name="slug" placeholder="summer/facebook" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="utmSource">UTM source</Label>
            <Input id="utmSource" name="utmSource" placeholder="facebook" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="utmMedium">UTM medium</Label>
            <Input id="utmMedium" name="utmMedium" placeholder="paid-social" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="utmCampaign">UTM campaign</Label>
            <Input id="utmCampaign" name="utmCampaign" placeholder="summer-sale" />
          </div>
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Creating…" : "Create link"}
      </Button>
    </form>
  );
}

function ExplainStep({
  link,
  onContinue,
}: {
  link: NonNullable<Progress["link"]>;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          How your link works
        </h1>
        <p className="text-sm text-muted-foreground">
          You just created a real shareable link. Here&apos;s what happens next.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs text-muted-foreground">Short URL</div>
          <div className="mt-1 break-all font-mono text-sm">{link.shortUrl}</div>
          <p className="mt-3 text-sm text-muted-foreground">
            Visitors hit <span className="font-mono">/r/{link.slug}</span> and
            are redirected instantly. Clicks are recorded in the background —
            no cookies, no GA.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs text-muted-foreground">QR code</div>
          <div className="mt-3 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/links/${link.id}/qr`}
              alt={`QR for ${link.name}`}
              className="size-40 rounded border border-border"
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Every link gets a QR automatically. Download it from the link page
            for posters, flyers, or packaging.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs text-muted-foreground">Analytics</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Open a campaign&apos;s <span className="font-medium text-foreground">Analytics</span> tab
            to see clicks, unique visitors, countries, devices, and export CSV.
            Keep it simple — CampaignDeck answers “how is this campaign
            performing?”
          </p>
        </div>
      </div>

      <Button onClick={onContinue}>Got it</Button>
    </div>
  );
}

function DoneStep({
  campaignId,
  linkId,
  saving,
  onFinish,
}: {
  campaignId?: string;
  linkId?: string;
  saving: boolean;
  onFinish: () => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">You&apos;re set</h1>
        <p className="text-sm text-muted-foreground">
          You now understand the CampaignDeck model:
        </p>
      </div>

      <ul className="space-y-2 rounded-xl border border-border bg-card p-5 text-sm shadow-sm">
        <li>✓ Clients organize who you work for</li>
        <li>✓ Campaigns are the primary container</li>
        <li>✓ Links get short URLs + QR codes</li>
        <li>✓ Redirects stay fast; analytics stay lightweight</li>
        <li>✓ Search finds clients, campaigns, links, and UTMs</li>
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onFinish} disabled={saving}>
          {saving ? "Finishing…" : "Go to dashboard"}
        </Button>
        {campaignId && (
          <Button
            variant="outline"
            onClick={async () => {
              await patchOnboarding("complete");
              router.push(`/campaigns/${campaignId}/analytics`);
              router.refresh();
            }}
          >
            View campaign analytics
          </Button>
        )}
        {linkId && (
          <Button
            variant="outline"
            onClick={async () => {
              await patchOnboarding("complete");
              router.push(`/links/${linkId}`);
              router.refresh();
            }}
          >
            Open your link
          </Button>
        )}
      </div>
    </div>
  );
}
