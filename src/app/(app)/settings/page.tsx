import { requireWorkspace } from "@/lib/workspace";
import { WorkspaceSettingsForm } from "@/components/workspace-settings-form";

export default async function SettingsPage() {
  const { workspace } = await requireWorkspace();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace.
        </p>
      </div>
      <WorkspaceSettingsForm workspace={workspace} />
    </div>
  );
}
