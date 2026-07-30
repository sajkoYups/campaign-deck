import { prisma } from "@/lib/db";

export {
  ONBOARDING_STEPS,
  isOnboardingStep,
  type OnboardingStep,
} from "@/lib/onboarding-steps";

/**
 * Auto-complete onboarding only for legacy workspaces that already have
 * clients and never started the tour (`onboardingStep` is null).
 * Do not auto-complete when a step is set (active tour or replay).
 */
export async function ensureOnboardingState(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { _count: { select: { clients: true } } },
  });

  if (!workspace) return null;

  if (
    !workspace.onboardingCompletedAt &&
    workspace._count.clients > 0 &&
    !workspace.onboardingStep
  ) {
    return prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        onboardingCompletedAt: new Date(),
        onboardingStep: null,
      },
    });
  }

  return workspace;
}

export function needsOnboarding(workspace: {
  onboardingCompletedAt: Date | null;
}): boolean {
  return workspace.onboardingCompletedAt == null;
}
