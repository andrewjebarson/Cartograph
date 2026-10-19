import { getDb, storeAnalysisData } from "./index";
import { SAMPLE_GRAPH_DATA } from "../sample-graph-data";

export function seedDemoProjects(): void {
  const db = getDb();

  const count = db.prepare("SELECT COUNT(*) as count FROM projects").get() as { count: number };
  if (count && count.count > 0) return;

  const now = new Date().toISOString();

  // Insert sample Fullstack Ecommerce project
  db.prepare(`
    INSERT INTO projects (id, repo_owner, repo_name, created_at)
    VALUES (?, ?, ?, ?)
  `).run(
    "proj_ecommerce_demo",
    "example-org",
    "ecommerce-fullstack",
    now,
  );

  db.prepare(`
    INSERT INTO analyses (
      id, project_id, status, stage, stage_message,
      commit_sha, framework, file_count, edge_count, route_count,
      coverage_rate, unresolved_count, created_at, updated_at
    )
    VALUES (?, ?, 'parsing', 'store', 'Storing graph data...', '49c38f9', 'Fullstack (Angular + Spring Boot)', 0, 0, 0, 100, 0, ?, ?)
  `).run(
    "ana_ecommerce_demo",
    "proj_ecommerce_demo",
    now,
    now,
  );

  // Store full sample graph data (179 files, edges, circular cycle)
  storeAnalysisData(
    "ana_ecommerce_demo",
    SAMPLE_GRAPH_DATA,
    "49c38f9",
    "Fullstack (Angular + Spring Boot)",
  );
}

