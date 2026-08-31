"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { GlobalSearch } from "@/components/global-search";

type WorkspaceOption = {
  id: string;
  name: string;
};

export function AppSidebar({
  workspaceName,
  workspaceId,
  workspaces,
  isGuest = false,
}: {
  workspaceName: string;
  workspaceId: string;
  workspaces: WorkspaceOption[];
  isGuest?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/campaigns", label: "Campaigns", icon: Megaphone },
    ...(!isGuest
      ? [{ href: "/settings", label: "Settings", icon: Settings }]
      : []),
  ];

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  async function switchWorkspace(id: string) {
    if (id === workspaceId) return;
    const res = await fetch("/api/workspace/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: id }),
    });
    if (!res.ok) return;
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-4 py-5">
        <Link href="/dashboard" className="block">
          <div className="text-sm font-semibold tracking-tight">CampaignDeck</div>
        </Link>
        {workspaces.length > 1 ? (
          <select
            className="mt-2 w-full truncate rounded-md border border-sidebar-border bg-transparent px-2 py-1.5 text-xs"
            value={workspaceId}
            onChange={(e) => switchWorkspace(e.target.value)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {workspaceName}
            {isGuest ? " · Guest" : ""}
          </div>
        )}
      </div>

      <div className="px-3 pt-4">
        <GlobalSearch />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
