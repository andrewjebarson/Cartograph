import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { SCHEMA_SQL } from "./schema.ts";
import type { ParseResult, ParsedFile, ResolvedEdge } from "../parser/types.ts";
import type { ExtractedRoute } from "../adapters/types.ts";

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
    if (!filesCols.has("role")) {
      db.exec("ALTER TABLE files ADD COLUMN role TEXT");
    }
    if (!filesCols.has("content")) {
      db.exec("ALTER TABLE files ADD COLUMN content TEXT");
    }

    const edgesCols = new Set(
      (db.prepare("PRAGMA table_info(edges)").all() as { name: string }[]).map((c) => c.name)
    );
    if (!edgesCols.has("specifier")) {
      db.exec("ALTER TABLE edges ADD COLUMN specifier TEXT");
    }

    const routesCols = new Set(
      (db.prepare("PRAGMA table_info(routes)").all() as { name: string }[]).map((c) => c.name)
    );
    if (!routesCols.has("line_number")) {
      db.exec("ALTER TABLE routes ADD COLUMN line_number INTEGER DEFAULT 1");
    }

    const explanationsInfo = db.prepare("PRAGMA table_info(explanations)").all() as {
      name: string;
      notnull: number;
    }[];
    const explanationsCols = new Set(explanationsInfo.map((c) => c.name));
    if (!explanationsCols.has("target_path")) {
      db.exec("ALTER TABLE explanations ADD COLUMN target_path TEXT DEFAULT ''");
    }

    const fileIdCol = explanationsInfo.find((c) => c.name === "file_id");
    if (fileIdCol && fileIdCol.notnull === 1) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS explanations_new (
          id TEXT PRIMARY KEY,
          file_id TEXT,
          target_path TEXT NOT NULL DEFAULT '',
          content_hash TEXT NOT NULL,
          model TEXT NOT NULL,
          explanation TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        INSERT INTO explanations_new (id, file_id, target_path, content_hash, model, explanation, created_at)
        SELECT id, file_id, COALESCE(target_path, ''), content_hash, model, explanation, created_at FROM explanations;
        DROP TABLE explanations;
        ALTER TABLE explanations_new RENAME TO explanations;
        CREATE INDEX IF NOT EXISTS idx_explanations_hash_model ON explanations(content_hash, model);
      `);
    }


    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_traces (
        id TEXT PRIMARY KEY,
        analysis_id TEXT,
        target_path TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        model TEXT NOT NULL,
        cache_hit INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_explanations_hash_model ON explanations(content_hash, model);
      CREATE INDEX IF NOT EXISTS idx_ai_traces_hash ON ai_traces(content_hash);
    `);
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
  routes: ExtractedRoute[] = [],
  fileRoles: Map<string, string> = new Map(),
  fileContents?: { path: string; content: string }[],
) {
  const db = getDb();
  const now = new Date().toISOString();

  const contentMap = new Map<string, string>();
  if (fileContents) {
    for (const item of fileContents) {
      contentMap.set(item.path, item.content);
    }
  }

  // Run in a transaction
  db.exec("BEGIN TRANSACTION");
  try {
    // Delete any old files / edges / routes for this analysis
    db.prepare("DELETE FROM files WHERE analysis_id = ?").run(analysisId);
    db.prepare("DELETE FROM edges WHERE analysis_id = ?").run(analysisId);
    db.prepare("DELETE FROM routes WHERE analysis_id = ?").run(analysisId);

    // Insert files
    const insertFile = db.prepare(`
      INSERT INTO files (
        id, analysis_id, path, extension, skip_reason,
        line_count, byte_size, content_hash, package_or_namespace, role,
        fan_in, fan_out, content
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertRole = db.prepare(`
      INSERT INTO file_roles (id, file_id, role, source)
      VALUES (?, ?, ?, 'adapter')
    `);

    const fileIdMap = new Map<string, string>();

    for (let i = 0; i < parseResult.files.length; i++) {
      const f = parseResult.files[i];
      const fileId = `${analysisId}_f_${i}`;
      fileIdMap.set(f.path, fileId);
      const role = fileRoles.get(f.path) || f.role || null;
      const content = contentMap.get(f.path) || null;
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
        role,
        f.fanIn,
        f.fanOut,
        content,
      );

      if (role) {
        insertRole.run(`${analysisId}_fr_${i}`, fileId, role);
      }
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

    // Insert routes
    const insertRoute = db.prepare(`
      INSERT INTO routes (
        id, analysis_id, file_id, method, path, line_number
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      const fileId = fileIdMap.get(r.filePath) || null;
      insertRoute.run(
        r.id || `${analysisId}_r_${i}`,
        analysisId,
        fileId,
        r.method,
        r.path,
        r.line || 1,
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
          route_count = ?,
          coverage_rate = ?,
          unresolved_count = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      commitSha,
      framework,
      parseResult.files.length,
      parseResult.edges.length,
      routes.length,
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

export function getAnalysisRoutes(analysisId: string): ExtractedRoute[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT r.id, r.method, r.path, COALESCE(r.line_number, 1) as line_number, f.path as file_path
    FROM routes r
    LEFT JOIN files f ON r.file_id = f.id
    WHERE r.analysis_id = ?
    ORDER BY r.path ASC
  `).all(analysisId) as {
    id: string;
    method: string;
    path: string;
    line_number: number;
    file_path: string | null;
  }[];

  return rows.map((row) => ({
    id: row.id,
    method: row.method,
    path: row.path,
    filePath: row.file_path || "",
    line: row.line_number,
  }));
}

export function getAnalysisGraph(analysisId: string): ParseResult | null {
  const db = getDb();
  const analysis = getAnalysis(analysisId);
  if (!analysis || analysis.status !== "complete") return null;

  const rawFiles = db.prepare(`
    SELECT path, extension, line_count, byte_size, content_hash, package_or_namespace, role, fan_in, fan_out, skip_reason
    FROM files
    WHERE analysis_id = ?
  `).all(analysisId) as {
    path: string;
    extension: string | null;
    line_count: number;
    byte_size: number;
    content_hash: string | null;
    package_or_namespace: string | null;
    role: string | null;
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
        role: f.role || undefined,
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

export interface CachedExplanation {
  id: string;
  file_id: string | null;
  target_path: string | null;
  content_hash: string;
  model: string;
  explanation: string;
  created_at: string;
}

export function getCachedExplanation(
  contentHash: string,
  model: string,
): CachedExplanation | undefined {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, file_id, target_path, content_hash, model, explanation, created_at
    FROM explanations
    WHERE content_hash = ? AND model = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(contentHash, model);
  return toPlain(row) as CachedExplanation | undefined;
}

export function saveExplanation(params: {
  fileId?: string | null;
  targetPath: string;
  contentHash: string;
  model: string;
  explanation: string;
}): void {
  const db = getDb();
  const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO explanations (id, file_id, target_path, content_hash, model, explanation, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.fileId || null,
    params.targetPath,
    params.contentHash,
    params.model,
    params.explanation,
    now,
  );
}

export function recordAiTrace(params: {
  analysisId?: string | null;
  targetPath: string;
  contentHash: string;
  model: string;
  cacheHit: boolean;
  durationMs: number;
}): void {
  const db = getDb();
  const id = `trc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO ai_traces (id, analysis_id, target_path, content_hash, model, cache_hit, duration_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.analysisId || null,
    params.targetPath,
    params.contentHash,
    params.model,
    params.cacheHit ? 1 : 0,
    params.durationMs,
    now,
  );
}

export function getFileRecord(analysisId: string, filePath: string) {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, path, role, content_hash, content, line_count, byte_size, fan_in, fan_out
    FROM files
    WHERE analysis_id = ? AND path = ?
  `).get(analysisId, filePath);
  return toPlain(row) as
    | {
        id: string;
        path: string;
        role: string | null;
        content_hash: string | null;
        content: string | null;
        line_count: number;
        byte_size: number;
        fan_in: number;
        fan_out: number;
      }
    | undefined;
}

export function getFileNeighbors(analysisId: string, filePath: string) {
  const db = getDb();
  const outgoingRows = db.prepare(`
    SELECT to_path FROM edges WHERE analysis_id = ? AND from_path = ?
  `).all(analysisId, filePath) as { to_path: string }[];

  const incomingRows = db.prepare(`
    SELECT from_path FROM edges WHERE analysis_id = ? AND to_path = ?
  `).all(analysisId, filePath) as { from_path: string }[];

  return {
    imports: Array.from(new Set(outgoingRows.map((r) => r.to_path))),
    importedBy: Array.from(new Set(incomingRows.map((r) => r.from_path))),
  };
}

export function getFolderDetails(analysisId: string, folderPath: string) {
  const db = getDb();
  const folderPrefix = folderPath.endsWith("/") ? folderPath : folderPath + "/";

  // Files in folder
  const files = db.prepare(`
    SELECT id, path, role, content_hash, line_count
    FROM files
    WHERE analysis_id = ? AND (path LIKE ? OR path = ?)
  `).all(analysisId, folderPrefix + "%", folderPath) as {
    id: string;
    path: string;
    role: string | null;
    content_hash: string | null;
    line_count: number;
  }[];

  const filePathsSet = new Set(files.map((f) => f.path));

  // Edges
  const allEdges = db.prepare(`
    SELECT from_path, to_path FROM edges WHERE analysis_id = ?
  `).all(analysisId) as { from_path: string; to_path: string }[];

  const incomingFiles = new Set<string>();
  const outgoingFiles = new Set<string>();

  for (const edge of allEdges) {
    const isFromInside = filePathsSet.has(edge.from_path);
    const isToInside = filePathsSet.has(edge.to_path);

    if (isFromInside && !isToInside) {
      outgoingFiles.add(edge.to_path);
    } else if (!isFromInside && isToInside) {
      incomingFiles.add(edge.from_path);
    }
  }

  return {
    files: files.map((f) => ({ path: f.path, role: f.role || undefined, contentHash: f.content_hash || undefined })),
    fanIn: incomingFiles.size,
    fanOut: outgoingFiles.size,
    incomingFiles: Array.from(incomingFiles),
    outgoingFiles: Array.from(outgoingFiles),
  };
}
