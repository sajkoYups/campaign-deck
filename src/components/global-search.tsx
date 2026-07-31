"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type SearchResults = {
  clients: { id: string; name: string }[];
  campaigns: { id: string; name: string; client: { name: string } }[];
  links: {
    id: string;
    name: string;
    slug: string;
    destinationUrl: string;
  }[];
  assets: {
    id: string;
    originalName: string;
    mimeType: string;
    campaign: { id: string; name: string };
  }[];
};

const emptyResults: SearchResults = {
  clients: [],
  campaigns: [],
  links: [],
  assets: [],
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (res.ok) setResults(json.data);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, open]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setResults(emptyResults);
    router.push(href);
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults(emptyResults);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search clients, campaigns, links, assets…"
              value={query}
              onValueChange={onQueryChange}
            />
            <CommandList>
              <CommandEmpty>
                {loading
                  ? "Searching…"
                  : query.trim()
                    ? "No results."
                    : "Type to search."}
              </CommandEmpty>

              {results.clients.length > 0 && (
                <CommandGroup heading="Clients">
                  {results.clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={`client-${client.id}`}
                      onSelect={() => go(`/clients/${client.id}`)}
                    >
                      {client.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.campaigns.length > 0 && (
                <CommandGroup heading="Campaigns">
                  {results.campaigns.map((campaign) => (
                    <CommandItem
                      key={campaign.id}
                      value={`campaign-${campaign.id}`}
                      onSelect={() => go(`/campaigns/${campaign.id}`)}
                    >
                      <span>{campaign.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {campaign.client.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.links.length > 0 && (
                <CommandGroup heading="Links">
                  {results.links.map((link) => (
                    <CommandItem
                      key={link.id}
                      value={`link-${link.id}`}
                      onSelect={() => go(`/links/${link.id}`)}
                    >
                      <div className="flex min-w-0 flex-col">
                        <span>{link.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {link.slug}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {(results.assets?.length ?? 0) > 0 && (
                <CommandGroup heading="Assets">
                  {results.assets.map((asset) => (
                    <CommandItem
                      key={asset.id}
                      value={`asset-${asset.id}`}
                      onSelect={() =>
                        go(`/campaigns/${asset.campaign.id}/assets`)
                      }
                    >
                      <div className="flex min-w-0 flex-col">
                        <span>{asset.originalName}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {asset.campaign.name}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
