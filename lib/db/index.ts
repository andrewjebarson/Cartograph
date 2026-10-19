import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { SCHEMA_SQL } from "./schema";

export interface Project {
  id: string;
  repo_owner: string;
  repo_name: string;
  created_at: string;
}

export interface Analysis {
  id: string;
  project_id: string;
  status: "queued" | "parsing" | "complete" | "failed";
  commit_sha: string | null;
  framework: string | null;
  file_count: number;
  edge_count: number;
  route_count: number;
  created_at: string;
  // Joined fields for convenience
  repo_owner?: string;
  repo_name?: string;
}

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbDir = process.cwd();
  const dbPath = path.join(dbDir, "cartograph.db");

  const exists = fs.existsSync(dbPath);
  dbInstance = new DatabaseSync(dbPath);

  if (!exists) {
    dbInstance.exec(SCHEMA_SQL);
  }

  return dbInstance;
}

export function listAnalyses(): Analysis[] {
  const db = getDb();
  const query = `
    SELECT 
      a.id,
      a.project_id,
      a.status,
      a.commit_sha,
      a.framework,
      a.file_count,
      a.edge_count,
      a.route_count,
      a.created_at,
      p.repo_owner,
      p.repo_name
    FROM analyses a
    JOIN projects p ON a.project_id = p.id
    ORDER BY a.created_at DESC
  `;
  return db.prepare(query).all() as unknown as Analysis[];
}

export function getProject(id: string): Project | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as unknown as Project | undefined;
}
