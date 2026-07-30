import { requireWorkspace } from "@/lib/workspace";
import { WorkspaceSettingsForm } from "@/components/workspace-settings-form";
import { UtmRulesForm } from "@/components/utm-rules-form";

export default async function SettingsPage() {
  const { workspace } = await requireWorkspace();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace and UTM rules.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Workspace</h2>
        <WorkspaceSettingsForm workspace={workspace} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">UTM Rules</h2>
        <UtmRulesForm />
      </section>
    </div>
  );
}
