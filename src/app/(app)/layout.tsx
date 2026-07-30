import { requireWorkspace } from "@/lib/workspace";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspace } = await requireWorkspace();

  return (
    <div className="flex min-h-screen">
      <AppSidebar workspaceName={workspace.name} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
