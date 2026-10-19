import React from "react";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { ThemeControl } from "@/components/theme-control";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; repo?: string }>;
}) {
  const { next, repo } = await searchParams;
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <div className="min-h-screen flex flex-col bg-background text-fg">
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-line bg-surface px-4">
        <span className="font-mono text-xs font-semibold tracking-tight">cartograph</span>
        <ThemeControl initial={theme} />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <LoginForm redirectTo={next || "/"} initialRepoUrl={repo} />
      </main>
    </div>
  );
}
