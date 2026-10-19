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
  file_id TEXT,
  target_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  explanation TEXT NOT NULL,
  created_at TEXT NOT NULL
);

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

CREATE TABLE IF NOT EXISTS eval_records (
  id TEXT PRIMARY KEY,
  target_path TEXT NOT NULL,
  eval_type TEXT NOT NULL,
  score REAL NOT NULL,
  passed INTEGER NOT NULL,
  total_paths INTEGER DEFAULT 0,
  invented_paths_json TEXT,
  duration_ms INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prompt_experiments (
  id TEXT PRIMARY KEY,
  prompt_v1_name TEXT NOT NULL,
  prompt_v2_name TEXT NOT NULL,
  dataset_size INTEGER NOT NULL,
  v1_path_accuracy REAL NOT NULL,
  v2_path_accuracy REAL NOT NULL,
  v1_specificity REAL NOT NULL,
  v2_specificity REAL NOT NULL,
  path_accuracy_delta REAL NOT NULL,
  specificity_delta REAL NOT NULL,
  winner TEXT NOT NULL,
  summary TEXT NOT NULL,
  details_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analyses_project ON analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_files_analysis ON files(analysis_id);
CREATE INDEX IF NOT EXISTS idx_edges_analysis ON edges(analysis_id);
CREATE INDEX IF NOT EXISTS idx_routes_analysis ON routes(analysis_id);
CREATE INDEX IF NOT EXISTS idx_explanations_hash_model ON explanations(content_hash, model);
CREATE INDEX IF NOT EXISTS idx_ai_traces_hash ON ai_traces(content_hash);
CREATE INDEX IF NOT EXISTS idx_eval_records_type ON eval_records(eval_type);
`;

