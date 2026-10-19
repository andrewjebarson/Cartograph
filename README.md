# Cartograph 🧭

> **Interactive architectural dependency maps for modern codebases, backed 100% by real AST parsing.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-onrender.com-brightgreen?style=flat-square&logo=render)](https://cartograph-8ppu.onrender.com/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.6-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

---

### 🌐 Live Deployment

Try the live application here:
🔗 **[https://cartograph-8ppu.onrender.com/](https://cartograph-8ppu.onrender.com/)**

#### Default Sign-in Credentials:
- **Username:** `admin`
- **Password:** `admin`

*(Credentials can be customized locally in `.env.local` via `AUTH_USERNAME` and `AUTH_PASSWORD`)*

---

## 💡 What is Cartograph?

Modern teams routinely ship code generated across dozens of AI agent sessions. The code works, but accumulates architectural debt and tangled dependencies that no single person holds in memory.

**Cartograph** reads a repository from disk and draws it as an exact, interactive dependency graph.
- Every node and connecting edge comes directly from **real AST parsing** (`import`, `require`, `@Autowired`, injection).
- **The AI explains what the parser discovered — it never guesses what is there.**
- Absent beats approximate: if an import cannot be resolved, it is reported with the exact reason in the coverage report rather than invented.

---

## ⚡ Core Features

### 1. High-Fidelity AST Parsers
- **TypeScript & Angular:** Parsed with `ts-morph`, extracting path aliases, barrel files, and Angular architecture roles (Components, Modules, Services, Guards).
- **Java & Spring Boot:** Parsed with `tree-sitter-java`, extracting Spring components (`@RestController`, `@Service`, `@Repository`, `@Entity`, `@Autowired`).
- **Framework Adapters:** Decoupled from the parser. Framework knowledge lives strictly in adapters.

### 2. Interactive Map & Semantic Canvas
- **Folder Folding Hierarchy:** Automatically collapses deep directories into readable boxes; double-click to expand a folder into its constituent files.
- **Directional Color System:**
  - 🟠 **Amber Edges:** Outgoing fan-out (what this file depends on).
  - 🟢 **Green Edges:** Incoming fan-in (what depends on this file).
  - 🔵 **Blue Edges:** Active hover path.
- **Instant Decluttering:** Selecting any file or directory fades out all unrelated edges to 2% opacity, illuminating only the active sub-network.
- **Dagre Layout Engine:** Top-to-bottom layout computed with deterministic pure functions over the edge list.

### 3. Transitive Blast Radius & Codebase Insights
- **Downstream Impact (Blast Radius):** 2-hop transitive walk showing everything that breaks or requires regression testing if a file changes.
- **Upstream Dependency Chains:** Traces the root dependencies that feed into a selected file.
- **Cycle & Anti-Pattern Detection:** Identifies circular import loops (via Tarjan/DFS) and oversized files.

### 4. REST & Page Route Table
- Extracts public API routes and page controllers across Angular, Next.js, and Spring Boot.
- Method badges (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `PAGE`) with one-click canvas focusing on the implementing controller.

### 5. Content-Hash Cached AI Explanations
- Contextual prose written strictly from a file and its real AST neighbours.
- **SHA-256 Cache:** Explanations are cached by content hash and model version. Repeated queries return in 0ms with zero network or model calls.
- **Clickable File Links:** Paths mentioned in explanations are rendered as interactive links that focus and pan the canvas directly to that file.
- **Staleness Tracking:** Prompts to re-explain if file contents change.

### 6. Autonomous Codebase Agent (Phase 12)
- Built-in chat panel powered by Gemini or Ollama.
- Executes real AST lookup tools (`find_file`, `get_dependencies`, `explain_symbol`, `search_routes`, `calculate_blast_radius`) before formulating an answer.

### 7. Automated Prompt Evals & Benchmark Suite (Phase 11)
- Live invented-path checks: verifies every file path in an AI answer against the actual repository AST.
- Side-by-side prompt version benchmarking (v1 vs v2).

### 8. Full Dark & Light Mode
- Supports **System**, **Light**, and **Dark** themes with zero-flash SSR initialization.
- Styled using Tailwind CSS v4 custom variants (`@custom-variant dark`).

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack, React 19) |
| **Language** | TypeScript (Strict mode, zero `any`) |
| **AST Parsing** | `ts-morph` (TypeScript/Angular), `tree-sitter-java` (Spring Boot) |
| **Graph & Canvas** | `@xyflow/react` (React Flow), `dagre` |
| **Styling** | Vanilla CSS + Tailwind CSS v4 |
| **AI Models** | Google Gemini (Free Tier) / Ollama (Local offline) |
| **Database** | Local SQLite (`better-sqlite3` / node-sqlite) & Supabase |

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 20+ installed
- Git installed on your system

### 1. Clone the repository
```bash
git clone https://github.com/andrewjebarson/Cartograph.git
cd Cartograph
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env.local` file in the root directory:

```env
# AI Provider (Google Gemini Free Tier or Ollama)
GEMINI_API_KEY=your_gemini_api_key_here
AI_MODEL=gemini-2.5-flash

# Local Authentication Credentials
AUTH_USERNAME=admin
AUTH_PASSWORD=admin
AUTH_SECRET=generate_a_random_32_char_secret_string

# Optional: Supabase (if using remote Postgres instead of local SQLite)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📋 Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with Turbopack. |
| `npm run build` | Builds the optimized production application. |
| `npm start` | Runs the production server. |
| `npm run lint` | Runs ESLint across the codebase. |
| `npm run parse` | Standalone CLI script to test AST parsing on any directory. |
| `npm run evals` | Runs the automated prompt eval and path verification suite. |

---

## 🗺️ Architectural Rules

Every line of code follows the strict project principles defined in `AGENTS.md` and `docs/project-doc.md`:
- **The parser is standalone:** It receives a path and outputs data. It never imports React, Next.js, or database clients.
- **No framework branches inside the parser:** Framework intelligence belongs solely in adapters (`lib/adapters/`).
- **Graph calculations are pure functions:** `computeFoldedGraph`, `layoutGraph`, and blast radius calculators are pure functions over file and edge lists.
- **Never guess a link:** Edges exist only if verified by real AST imports.

---

## 📄 License

MIT © [Andrew Jebarson](https://github.com/andrewjebarson)
