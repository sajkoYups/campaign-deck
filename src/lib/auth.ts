import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.APP_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      console.info("[CampaignDeck] Password reset requested");
      console.info(`[CampaignDeck] User: ${user.email}`);
      console.info(`[CampaignDeck] Reset link: ${url}`);
    },
    onPasswordReset: async ({ user }) => {
      console.info(`[CampaignDeck] Password reset completed for ${user.email}`);
    },
  },
  plugins: [nextCookies()],
});

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return session;
}
