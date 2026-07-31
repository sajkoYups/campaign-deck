import { randomBytes } from "crypto";
import type { WorkspaceRole } from "@/generated/prisma/client";

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
  const base =
    process.env.APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/invite/${token}`;
}

export function logInviteLink(email: string, url: string) {
  console.info("[CampaignDeck] Workspace invitation");
  console.info(`[CampaignDeck] Invitee: ${email}`);
  console.info(`[CampaignDeck] Accept link: ${url}`);
}
