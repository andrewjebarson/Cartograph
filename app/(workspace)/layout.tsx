import Link from "next/link";
import { cookies } from "next/headers";
import { ThemeControl } from "@/components/theme-control";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <header className="flex h-9 shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
        <Link
          href="/"
          className="font-mono text-xs font-semibold tracking-tight text-fg hover:text-accent transition-colors"
        >
          cartograph
        </Link>
        <span className="text-line">/</span>
        <span className="font-mono text-xs text-fg-muted">local</span>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/evals"
            className="font-mono text-xs text-fg-muted hover:text-fg transition-colors px-1.5 py-0.5 rounded border border-transparent hover:border-line"
          >
            evaluations
          </Link>
          <ThemeControl initial={theme} />
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
