export const ONBOARDING_STEPS = [
  "welcome",
  "client",
  "campaign",
  "link",
  "explain",
  "done",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function isOnboardingStep(
  value: string | null | undefined,
): value is OnboardingStep {
  return !!value && (ONBOARDING_STEPS as readonly string[]).includes(value);
}
