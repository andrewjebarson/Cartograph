import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { SCHEMA_SQL } from "./schema";
import type { ParseResult, ParsedFile, ResolvedEdge } from "../parser/types";

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
  stage?: string | null;
  stage_message?: string | null;
  error_message?: string | null;
  failed_stage?: string | null;
  commit_sha: string | null;
  framework: string | null;
  file_count: number;
  edge_count: number;
  route_count: number;
  coverage_rate: number;
  unresolved_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields for convenience
  repo_owner?: string;
  repo_name?: string;
}

let dbInstance: DatabaseSync | null = null;

function migrateSchema(db: DatabaseSync) {
  try {
    const analysesCols = new Set(
      (db.prepare("PRAGMA table_info(analyses)").all() as { name: string }[]).map((c) => c.name)
    );
    if (!analysesCols.has("stage")) {
      db.exec("ALTER TABLE analyses ADD COLUMN stage TEXT DEFAULT 'queued'");
    }
    if (!analysesCols.has("stage_message")) {
      db.exec("ALTER TABLE analyses ADD COLUMN stage_message TEXT");
    }
    if (!analysesCols.has("error_message")) {
      db.exec("ALTER TABLE analyses ADD COLUMN error_message TEXT");
    }
    if (!analysesCols.has("failed_stage")) {
      db.exec("ALTER TABLE analyses ADD COLUMN failed_stage TEXT");
    }
    if (!analysesCols.has("coverage_rate")) {
      db.exec("ALTER TABLE analyses ADD COLUMN coverage_rate REAL DEFAULT 100");
    }
    if (!analysesCols.has("unresolved_count")) {
      db.exec("ALTER TABLE analyses ADD COLUMN unresolved_count INTEGER DEFAULT 0");
    }
    if (!analysesCols.has("updated_at")) {
      db.exec("ALTER TABLE analyses ADD COLUMN updated_at TEXT");
      db.exec("UPDATE analyses SET updated_at = created_at WHERE updated_at IS NULL");
    }

    const filesCols = new Set(
      (db.prepare("PRAGMA table_info(files)").all() as { name: string }[]).map((c) => c.name)
    );
    if (!filesCols.has("byte_size")) {
      db.exec("ALTER TABLE files ADD COLUMN byte_size INTEGER DEFAULT 0");
    }
    if (!filesCols.has("extension")) {
      db.exec("ALTER TABLE files ADD COLUMN extension TEXT");
    }
    if (!filesCols.has("content_hash")) {
      db.exec("ALTER TABLE files ADD COLUMN content_hash TEXT");
    }
    if (!filesCols.has("package_or_namespace")) {
      db.exec("ALTER TABLE files ADD COLUMN package_or_namespace TEXT");
    }

    const edgesCols = new Set(
      (db.prepare("PRAGMA table_info(edges)").all() as { name: string }[]).map((c) => c.name)
    );
    if (!edgesCols.has("specifier")) {
      db.exec("ALTER TABLE edges ADD COLUMN specifier TEXT");
    }
  } catch (err) {
    console.error("Schema migration warning:", err);
  }
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbDir = process.cwd();
  const dbPath = path.join(dbDir, "cartograph.db");

  const exists = fs.existsSync(dbPath);
  dbInstance = new DatabaseSync(dbPath);

  if (!exists) {
    dbInstance.exec(SCHEMA_SQL);
  } else {
    migrateSchema(dbInstance);
  }

  return dbInstance;
}

function toPlain<T>(obj: unknown): T {
  if (!obj || typeof obj !== "object") return obj as T;
  if (Array.isArray(obj)) return obj.map((item) => toPlain(item)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    out[k] = (obj as Record<string, unknown>)[k];
  }
  return out as T;
}

export function listAnalyses(): Analysis[] {
  const db = getDb();
  const query = `
    SELECT 
      a.id,
      a.project_id,
      a.status,
      a.stage,
      a.stage_message,
      a.error_message,
      a.failed_stage,
      a.commit_sha,
      a.framework,
      a.file_count,
      a.edge_count,
      a.route_count,
      COALESCE(a.coverage_rate, 100) as coverage_rate,
      COALESCE(a.unresolved_count, 0) as unresolved_count,
      a.created_at,
      COALESCE(a.updated_at, a.created_at) as updated_at,
      p.repo_owner,
      p.repo_name
    FROM analyses a
    JOIN projects p ON a.project_id = p.id
    ORDER BY a.created_at DESC
  `;
  return toPlain(db.prepare(query).all()) as Analysis[];
}

export function getProject(id: string): Project | undefined {
  const db = getDb();
  return toPlain(db.prepare("SELECT * FROM projects WHERE id = ?").get(id)) as Project | undefined;
}

export function getAnalysis(id: string): Analysis | undefined {
  const db = getDb();
  const query = `
    SELECT 
      a.id,
      a.project_id,
      a.status,
      a.stage,
      a.stage_message,
      a.error_message,
      a.failed_stage,
      a.commit_sha,
      a.framework,
      a.file_count,
      a.edge_count,
      a.route_count,
      COALESCE(a.coverage_rate, 100) as coverage_rate,
      COALESCE(a.unresolved_count, 0) as unresolved_count,
      a.created_at,
      COALESCE(a.updated_at, a.created_at) as updated_at,
      p.repo_owner,
      p.repo_name
    FROM analyses a
    JOIN projects p ON a.project_id = p.id
    WHERE a.id = ?
  `;
  return toPlain(db.prepare(query).get(id)) as Analysis | undefined;
}

export function findAnalysisByRepo(owner: string, repo: string): Analysis | undefined {
  const db = getDb();
  const query = `
    SELECT 
      a.id,
      a.project_id,
      a.status,
      a.stage,
      a.stage_message,
      a.error_message,
      a.failed_stage,
      a.commit_sha,
      a.framework,
      a.file_count,
      a.edge_count,
      a.route_count,
      COALESCE(a.coverage_rate, 100) as coverage_rate,
      COALESCE(a.unresolved_count, 0) as unresolved_count,
      a.created_at,
      COALESCE(a.updated_at, a.created_at) as updated_at,
      p.repo_owner,
      p.repo_name
    FROM analyses a
    JOIN projects p ON a.project_id = p.id
    WHERE LOWER(p.repo_owner) = LOWER(?) AND LOWER(p.repo_name) = LOWER(?)
    ORDER BY a.created_at DESC
    LIMIT 1
  `;
  return toPlain(db.prepare(query).get(owner, repo)) as Analysis | undefined;
}

export function createAnalysis(owner: string, repo: string): { projectId: string; analysisId: string } {
  const db = getDb();
  const now = new Date().toISOString();

  // Find or create project
  const project = db.prepare(
    "SELECT id FROM projects WHERE LOWER(repo_owner) = LOWER(?) AND LOWER(repo_name) = LOWER(?)"
  ).get(owner, repo) as { id: string } | undefined;

  let projectId = project?.id;
  if (!projectId) {
    projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    db.prepare(`
      INSERT INTO projects (id, repo_owner, repo_name, created_at)
      VALUES (?, ?, ?, ?)
    `).run(projectId, owner, repo, now);
  }

  const analysisId = `ana_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  db.prepare(`
    INSERT INTO analyses (
      id, project_id, status, stage, stage_message,
      file_count, edge_count, route_count, coverage_rate, unresolved_count,
      created_at, updated_at
    )
    VALUES (?, ?, 'parsing', 'fetch', 'Preparing to download repository...', 0, 0, 0, 100, 0, ?, ?)
  `).run(analysisId, projectId, now, now);

  return { projectId, analysisId };
}

export function updateAnalysisStage(
  analysisId: string,
  stage: string,
  stageMessage: string,
) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE analyses
    SET stage = ?, stage_message = ?, updated_at = ?
    WHERE id = ?
  `).run(stage, stageMessage, now, analysisId);
}

export function updateAnalysisFailure(
  analysisId: string,
  failedStage: string,
  errorMessage: string,
) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE analyses
    SET status = 'failed', stage = 'failed', failed_stage = ?, error_message = ?, stage_message = ?, updated_at = ?
    WHERE id = ?
  `).run(failedStage, errorMessage, errorMessage, now, analysisId);
}

export function storeAnalysisData(
  analysisId: string,
  parseResult: ParseResult,
  commitSha: string,
  framework: string,
) {
  const db = getDb();
  const now = new Date().toISOString();

  // Run in a transaction
  db.exec("BEGIN TRANSACTION");
  try {
    // Delete any old files / edges for this analysis
    db.prepare("DELETE FROM files WHERE analysis_id = ?").run(analysisId);
    db.prepare("DELETE FROM edges WHERE analysis_id = ?").run(analysisId);

    // Insert files
    const insertFile = db.prepare(`
      INSERT INTO files (
        id, analysis_id, path, extension, skip_reason,
        line_count, byte_size, content_hash, package_or_namespace,
        fan_in, fan_out
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < parseResult.files.length; i++) {
      const f = parseResult.files[i];
      const fileId = `${analysisId}_f_${i}`;
      insertFile.run(
        fileId,
        analysisId,
        f.path,
        f.extension,
        null,
        f.lineCount,
        f.byteSize,
        f.contentHash,
        f.packageOrNamespace || null,
        f.fanIn,
        f.fanOut,
      );
    }

    // Insert skipped files
    for (let i = 0; i < parseResult.skippedFiles.length; i++) {
      const sf = parseResult.skippedFiles[i];
      const fileId = `${analysisId}_sf_${i}`;
      insertFile.run(
        fileId,
        analysisId,
        sf.path,
        null,
        sf.reason,
        0,
        0,
        null,
        null,
        0,
        0,
      );
    }

    // Insert edges
    const insertEdge = db.prepare(`
      INSERT INTO edges (
        id, analysis_id, from_path, to_path, specifier, kind
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < parseResult.edges.length; i++) {
      const e = parseResult.edges[i];
      const edgeId = `${analysisId}_e_${i}`;
      insertEdge.run(
        edgeId,
        analysisId,
        e.source,
        e.target,
        e.specifier,
        e.type,
      );
    }

    // Update analysis record to complete
    db.prepare(`
      UPDATE analyses
      SET status = 'complete',
          stage = 'complete',
          stage_message = 'Analysis complete',
          commit_sha = ?,
          framework = ?,
          file_count = ?,
          edge_count = ?,
          route_count = 0,
          coverage_rate = ?,
          unresolved_count = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      commitSha,
      framework,
      parseResult.files.length,
      parseResult.edges.length,
      parseResult.coverage.resolutionRate,
      parseResult.coverage.unresolvedImports,
      now,
      analysisId,
    );

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function getAnalysisGraph(analysisId: string): ParseResult | null {
  const db = getDb();
  const analysis = getAnalysis(analysisId);
  if (!analysis || analysis.status !== "complete") return null;

  const rawFiles = db.prepare(`
    SELECT path, extension, line_count, byte_size, content_hash, package_or_namespace, fan_in, fan_out, skip_reason
    FROM files
    WHERE analysis_id = ?
  `).all(analysisId) as {
    path: string;
    extension: string | null;
    line_count: number;
    byte_size: number;
    content_hash: string | null;
    package_or_namespace: string | null;
    fan_in: number;
    fan_out: number;
    skip_reason: string | null;
  }[];

  const rawEdges = db.prepare(`
    SELECT from_path, to_path, specifier, kind
    FROM edges
    WHERE analysis_id = ?
  `).all(analysisId) as {
    from_path: string;
    to_path: string;
    specifier: string | null;
    kind: string;
  }[];

  const files: ParsedFile[] = [];
  const skippedFiles: { path: string; reason: string }[] = [];

  for (const f of rawFiles) {
    if (f.skip_reason) {
      skippedFiles.push({ path: f.path, reason: f.skip_reason });
    } else {
      files.push({
        path: f.path,
        extension: f.extension || "",
        lineCount: f.line_count,
        byteSize: f.byte_size,
        contentHash: f.content_hash || "",
        fanIn: f.fan_in,
        fanOut: f.fan_out,
        packageOrNamespace: f.package_or_namespace || undefined,
      });
    }
  }

  const edges: ResolvedEdge[] = rawEdges.map((e) => ({
    source: e.from_path,
    target: e.to_path,
    specifier: e.specifier || "",
    type: (e.kind as "static" | "reexport") || "static",
  }));

  const totalLines = files.reduce((s, f) => s + f.lineCount, 0);
  const totalBytes = files.reduce((s, f) => s + f.byteSize, 0);

  return {
    rootPath: `${analysis.repo_owner}/${analysis.repo_name}`,
    files,
    edges,
    externalImports: [],
    unresolvedImports: [],
    skippedFiles,
    coverage: {
      totalFiles: files.length,
      totalLines,
      totalBytes,
      totalImports: edges.length + analysis.unresolved_count,
      internalEdges: edges.length,
      externalImports: 0,
      unresolvedImports: analysis.unresolved_count,
      resolutionRate: analysis.coverage_rate,
    },
  };
}
