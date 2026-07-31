import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { WorkspaceSettingsForm } from "@/components/workspace-settings-form";
import { UtmRulesForm } from "@/components/utm-rules-form";
import { ReplayOnboardingButton } from "@/components/onboarding/replay-button";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { WorkspaceMembersPanel } from "@/components/workspace-members-panel";
import { WorkspaceOwnerActions } from "@/components/workspace-owner-actions";

export default async function SettingsPage() {
  const { workspace, role, session } = await requireWorkspace();
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace, team, and UTM rules.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Workspace</h2>
        <WorkspaceSettingsForm
          workspace={{
            name: workspace.name,
            slug: workspace.slug,
            timezone: workspace.timezone,
            logoPath: workspace.logoPath,
          }}
          canEdit={can(role, "workspace.settings")}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Members</h2>
        <WorkspaceMembersPanel
          currentRole={role}
          currentUserId={session.user.id}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">UTM Rules</h2>
        <UtmRulesForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Onboarding</h2>
        <ReplayOnboardingButton />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-red-600 dark:text-red-400">
          Danger zone
        </h2>
        <WorkspaceOwnerActions
          isOwner={role === "OWNER"}
          members={members.map((m) => ({
            userId: m.user.id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
          }))}
        />
        <DeleteAccountButton />
      </section>
    </div>
  );
}
