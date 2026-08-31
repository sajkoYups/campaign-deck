"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type InviteInfo = {
  type: "workspace" | "client";
  email: string;
  role: string;
  workspaceName: string;
  needsAccount: boolean;
  clientId?: string;
  clientName?: string;
};

function emailsMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function InviteAcceptClient({ token }: { token: string }) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<InviteInfo | null>(null);

  useEffect(() => {
    fetch(`/api/invite/accept?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error?.message || "Invalid invitation");
        setInfo(json.data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function acceptInvite(extra?: { name?: string; password?: string }) {
    if (!info) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        name: extra?.name,
        password: extra?.password,
      }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(json.error?.message || "Could not accept invitation");
      return;
    }

    if (json.data?.type === "client" && json.data.clientId) {
      toast.success("Joined client");
      router.push(`/clients/${json.data.clientId}`);
    } else {
      toast.success("Joined workspace");
      router.push("/dashboard");
    }
    router.refresh();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!info) return;
    const form = new FormData(e.currentTarget);
    await acceptInvite({
      name: String(form.get("name") || ""),
      password: String(form.get("password") || ""),
    });
  }

  async function signOutWrongAccount() {
    await authClient.signOut();
    router.refresh();
  }

  if (loading || sessionPending) {
    return <p className="text-sm text-muted-foreground">Loading invitation…</p>;
  }

  if (error && !info) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Link href="/login" className="text-sm underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (!info) return null;

  const title =
    info.type === "client" && info.clientName
      ? `View ${info.clientName}`
      : `Join ${info.workspaceName}`;

  const subtitle =
    info.type === "client" && info.clientName ? (
      <>
        View-only access to{" "}
        <span className="font-medium text-foreground">{info.clientName}</span> at{" "}
        <span className="font-medium text-foreground">{info.workspaceName}</span>{" "}
        for <span className="font-medium text-foreground">{info.email}</span>
      </>
    ) : (
      <>
        Invited as <span className="font-medium text-foreground">{info.role}</span>{" "}
        for <span className="font-medium text-foreground">{info.email}</span>
      </>
    );

  const loginHref = `/login?next=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(info.email)}`;
  const sessionEmail = session?.user?.email;
  const signedInAsInvitee =
    !!sessionEmail && emailsMatch(sessionEmail, info.email);
  const signedInAsOther =
    !!sessionEmail && !emailsMatch(sessionEmail, info.email);

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        {info.needsAccount ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={info.email} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Joining…" : "Create account & join"}
            </Button>
          </form>
        ) : signedInAsInvitee ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Signed in as <strong>{info.email}</strong>. Accept to continue.
            </p>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="button"
              className="w-full"
              disabled={submitting}
              onClick={() => acceptInvite()}
            >
              {submitting ? "Joining…" : "Accept invitation"}
            </Button>
          </div>
        ) : signedInAsOther ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You&apos;re signed in as <strong>{sessionEmail}</strong>, but this
              invite is for <strong>{info.email}</strong>. Sign out, then sign
              in with the invited email.
            </p>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="button"
              className="w-full"
              onClick={signOutWrongAccount}
            >
              Sign out
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in with <strong>{info.email}</strong> to accept this
              invitation.
            </p>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Link
              href={loginHref}
              className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Sign in to accept
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
