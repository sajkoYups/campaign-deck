import { randomBytes } from "crypto";
import type { WorkspaceRole } from "@/generated/prisma/client";
import { getPublicAppUrl } from "@/lib/app-url";

export function createInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function inviteExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const INVITE_ROLES: WorkspaceRole[] = [
  "ADMIN",
  "MANAGER",
  "EDITOR",
  "VIEWER",
];

export function inviteAcceptUrl(token: string): string {
  return `${getPublicAppUrl()}/invite/${token}`;
}

export function logInviteLink(email: string, url: string) {
  console.info("[CampaignDeck] Workspace invitation");
  console.info(`[CampaignDeck] Invitee: ${email}`);
  console.info(`[CampaignDeck] Accept link: ${url}`);
}

export function logClientInviteLink(
  email: string,
  clientName: string,
  url: string,
) {
  console.info("[CampaignDeck] Client invitation");
  console.info(`[CampaignDeck] Client: ${clientName}`);
  console.info(`[CampaignDeck] Invitee: ${email}`);
  console.info(`[CampaignDeck] Accept link: ${url}`);
}
