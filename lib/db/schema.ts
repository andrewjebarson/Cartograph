export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('queued', 'parsing', 'complete', 'failed')),
  stage TEXT DEFAULT 'queued',
  stage_message TEXT,
  error_message TEXT,
  failed_stage TEXT,
  commit_sha TEXT,
  framework TEXT,
  file_count INTEGER DEFAULT 0,
  edge_count INTEGER DEFAULT 0,
  route_count INTEGER DEFAULT 0,
  coverage_rate REAL DEFAULT 100,
  unresolved_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  extension TEXT,
  skip_reason TEXT,
  line_count INTEGER DEFAULT 0,
  byte_size INTEGER DEFAULT 0,
  content_hash TEXT,
  package_or_namespace TEXT,
  role TEXT,
  fan_in INTEGER DEFAULT 0,
  fan_out INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  from_path TEXT NOT NULL,
  to_path TEXT NOT NULL,
  specifier TEXT,
  kind TEXT NOT NULL DEFAULT 'import'
);

CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  file_id TEXT REFERENCES files(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  line_number INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS file_roles (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'adapter'
);

CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS explanations (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  explanation TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analyses_project ON analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_files_analysis ON files(analysis_id);
CREATE INDEX IF NOT EXISTS idx_edges_analysis ON edges(analysis_id);
CREATE INDEX IF NOT EXISTS idx_routes_analysis ON routes(analysis_id);
`;
