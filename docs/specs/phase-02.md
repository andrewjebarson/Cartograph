# Phase 2 — Local schema and dashboard

**Goal.** The local workspace has persistent storage and a dashboard to view
and select repository analyses.

## Build

- **Local Relational Schema.** A lightweight local SQLite database (`cartograph.db`)
  containing the core tables: `projects`, `analyses`, `files`, `edges`,
  `routes`, `explanations`, `file_roles`, and `insights`.
- **Database Client.** A standalone local database utility running in server code.
  Foreign keys enabled, cascade deletion on project removal.
- **The Dashboard.** Displays the list of parsed repositories/analyses, their
  timestamps, language/framework detected, and status (`queued`, `parsing`,
  `complete`, `failed`).
- **Empty State.** Clean developer-oriented empty state when no repository has
  been analyzed yet.

## Constraints

- **No Cloud Database Dependency.** Zero Supabase Cloud dependencies; the app
  runs completely local and offline without API keys.
- **Pure Server Code Database Access.** Database operations occur in server
  actions and route handlers, never directly in client components.
- **Deterministic Migrations.** Table creation is managed via declarative code
  that runs on first boot if `cartograph.db` does not exist.

## Acceptance check

1. Boot the application with a fresh database. The tables are initialized
   automatically in SQLite.
2. The dashboard displays the clean empty state when no analyses exist.
3. Insert a seeded analysis record (e.g., an Angular or Spring Boot project).
   The dashboard lists it with its name, status, and file counts on first paint.
4. Verify database operations succeed with strict types and no cloud network
   calls.
