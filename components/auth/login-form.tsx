"use client";

import React, { useActionState } from "react";
import { loginAction } from "@/app/(auth)/login/actions";
import Link from "next/link";

interface LoginFormProps {
  redirectTo?: string;
  initialRepoUrl?: string;
}

export function LoginForm({ redirectTo = "/", initialRepoUrl }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  const effectiveRedirect = initialRepoUrl
    ? `/?repo=${encodeURIComponent(initialRepoUrl)}`
    : redirectTo;

  return (
    <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex items-center gap-1.5 font-mono text-xs text-fg-muted mb-1">
          <Link href="/" className="hover:text-fg transition-colors">
            cartograph
          </Link>
          <span>/</span>
          <span className="text-fg font-medium">sign-in</span>
        </div>
        <h1 className="text-base font-semibold tracking-tight text-fg font-mono">
          Local Authentication
        </h1>
        <p className="mt-1 text-xs text-fg-muted">
          Sign in using local credentials configured in <code className="bg-raised px-1 py-0.5 rounded text-[11px]">.env.local</code>.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectTo" value={effectiveRedirect} />

        <div>
          <label
            htmlFor="username"
            className="block text-xs font-mono font-medium text-fg mb-1.5"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            defaultValue="admin"
            autoComplete="username"
            className="w-full rounded border border-line bg-raised px-2.5 py-1.5 font-mono text-xs text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-mono font-medium text-fg mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            defaultValue="admin"
            autoComplete="current-password"
            className="w-full rounded border border-line bg-raised px-2.5 py-1.5 font-mono text-xs text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {state?.error && (
          <div className="rounded border border-red-500/20 bg-red-500/10 p-2 text-xs font-mono text-red-500">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-8 rounded bg-accent px-3 font-mono text-xs font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending ? "Signing in..." : "Sign In →"}
        </button>

        <div className="pt-2 border-t border-line text-center">
          <p className="text-[11px] font-mono text-fg-muted">
            Default credentials: <span className="font-semibold text-fg">admin</span> / <span className="font-semibold text-fg">admin</span>
          </p>
        </div>
      </form>
    </div>
  );
}
