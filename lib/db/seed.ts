import { getDb } from "./index";

export function seedDemoProjects(): void {
  const db = getDb();

  const count = db.prepare("SELECT COUNT(*) as count FROM projects").get() as { count: number };
  if (count && count.count > 0) return;

  // Insert sample Angular project
  db.prepare(`
    INSERT INTO projects (id, repo_owner, repo_name, created_at)
    VALUES (?, ?, ?, ?)
  `).run(
    "proj_angular_demo",
    "angular",
    "angular-tour-of-heroes",
    new Date(Date.now() - 3600000).toISOString()
  );

  db.prepare(`
    INSERT INTO analyses (id, project_id, status, commit_sha, framework, file_count, edge_count, route_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "ana_angular_demo",
    "proj_angular_demo",
    "complete",
    "7f8a9b1",
    "Angular",
    42,
    88,
    6,
    new Date(Date.now() - 3600000).toISOString()
  );

  // Insert sample Spring Boot project
  db.prepare(`
    INSERT INTO projects (id, repo_owner, repo_name, created_at)
    VALUES (?, ?, ?, ?)
  `).run(
    "proj_spring_demo",
    "spring-projects",
    "spring-petclinic",
    new Date().toISOString()
  );

  db.prepare(`
    INSERT INTO analyses (id, project_id, status, commit_sha, framework, file_count, edge_count, route_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "ana_spring_demo",
    "proj_spring_demo",
    "complete",
    "3c4d5e6",
    "Spring Boot",
    58,
    114,
    18,
    new Date().toISOString()
  );
}
