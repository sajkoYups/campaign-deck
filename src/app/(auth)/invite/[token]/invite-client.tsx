"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteAcceptClient({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{
    email: string;
    role: string;
    workspaceName: string;
    needsAccount: boolean;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/workspace/accept?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error?.message || "Invalid invitation");
        setInfo(json.data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!info) return;
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/workspace/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        name: info.needsAccount ? form.get("name") : undefined,
        password: info.needsAccount ? form.get("password") : undefined,
      }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(json.error?.message || "Could not accept invitation");
      return;
    }

    toast.success("Joined workspace");
    router.push("/dashboard");
    router.refresh();
  }

  if (loading) {
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

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Join {info.workspaceName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Invited as <span className="font-medium text-foreground">{info.role}</span>{" "}
          for <span className="font-medium text-foreground">{info.email}</span>
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        {info.needsAccount ? (
          <>
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
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sign in with <strong>{info.email}</strong>, then accept this
            invitation.{" "}
            <Link href="/login" className="underline underline-offset-4">
              Sign in
            </Link>
          </p>
        )}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting
            ? "Joining…"
            : info.needsAccount
              ? "Create account & join"
              : "Accept invitation"}
        </Button>
      </form>
    </div>
  );
}
