import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { AppSidebar } from "@/components/app-sidebar";
import {
  ensureOnboardingState,
  needsOnboarding,
} from "@/lib/onboarding";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspace } = await requireWorkspace();
  const current = await ensureOnboardingState(workspace.id);
  const ws = current ?? workspace;

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const onOnboarding = pathname.startsWith("/onboarding");

  if (needsOnboarding(ws) && !onOnboarding) {
    redirect("/onboarding");
  }

  if (!needsOnboarding(ws) && onOnboarding) {
    redirect("/dashboard");
  }

  if (onOnboarding) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar workspaceName={ws.name} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
