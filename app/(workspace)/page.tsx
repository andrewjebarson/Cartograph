import Link from "next/link";
import { listAnalyses } from "@/lib/db";
import { seedSampleData, clearAllData } from "./actions";

export default async function DashboardPage() {
  const analyses = listAnalyses();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h1 className="font-mono text-base font-semibold tracking-tight text-fg">
            Repository Analyses
          </h1>
          <p className="mt-0.5 text-xs text-fg-muted">
            Local dependency graphs for Angular and Spring Boot projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {analyses.length > 0 && (
            <form action={clearAllData}>
              <button
                type="submit"
                className="h-7 rounded border border-line bg-surface px-2.5 font-mono text-[11px] text-fg-muted transition-colors hover:border-red-500/50 hover:text-red-500"
              >
                Clear Database
              </button>
            </form>
          )}
          <Link
            href="/preview"
            className="flex h-7 items-center rounded border border-amber-500/40 bg-amber-500/10 px-2.5 font-mono text-[11px] font-medium text-amber-600 dark:text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            🗺️ Open Map Preview
          </Link>
          <form action={seedSampleData}>
            <button
              type="submit"
              className="h-7 rounded border border-line bg-raised px-2.5 font-mono text-[11px] font-medium text-fg transition-colors hover:bg-surface hover:text-accent"
            >
              + Seed Sample Projects
            </button>
          </form>
        </div>
      </div>

      {analyses.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface/50 py-16 text-center">
          <div className="font-mono text-xs text-fg-muted">cartograph.db</div>
          <h2 className="mt-2 text-sm font-medium text-fg">No analyses yet</h2>
          <p className="mt-1 max-w-sm text-xs text-fg-muted">
            The local SQLite database is ready. Seed sample Angular &amp; Spring
            Boot repositories to test the workspace.
          </p>
          <form action={seedSampleData} className="mt-5">
            <button
              type="submit"
              className="h-7 rounded bg-accent px-3 text-xs font-medium text-accent-fg transition-opacity hover:opacity-90"
            >
              Seed Sample Repositories
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-raised font-mono text-[11px] text-fg-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Repository</th>
                  <th className="px-4 py-2 font-medium">Framework</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Files</th>
                  <th className="px-4 py-2 text-right font-medium">Edges</th>
                  <th className="px-4 py-2 text-right font-medium">Routes</th>
                  <th className="px-4 py-2 font-medium">Commit</th>
                  <th className="px-4 py-2 text-right font-medium">Analyzed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {analyses.map((a) => (
                  <tr
                    key={a.id}
                    className="transition-colors hover:bg-raised/50"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-fg">
                      <Link
                        href="/preview"
                        className="hover:text-amber-500 hover:underline"
                      >
                        {a.repo_owner}/{a.repo_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
                        {a.framework ?? "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          a.status === "complete"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : a.status === "failed"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-fg-muted">
                      {a.file_count}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-fg-muted">
                      {a.edge_count}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-fg-muted">
                      {a.route_count}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-fg-muted">
                      {a.commit_sha ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] text-fg-muted">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
