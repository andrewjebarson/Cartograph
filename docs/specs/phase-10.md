# Phase 10 — Explain, cached and traced (Free & Local AI)

**Goal.** Contextual code explanations and classification using free or local
AI models (Ollama or Google Gemini), with strict content-hash caching.

## Build

- **Flexible Free/Local AI Client.** A single wrapped AI client interface
  supporting:
  - **Ollama** (`http://localhost:11434/v1` for local models like Qwen 2.5 Coder or Llama 3)
  - **Google Gemini API** (Free Tier via Gemini SDK / OpenAI-compatible endpoint)
- **File Explanation.** Explains a file in the context of its real neighbours
  (the exact files it imports and that import it).
- **Folded Folder Explanation.** Summarizes what a folder contains and why
  other components lean on it.
- **Content-Hash Caching.** Explanations are cached locally by SHA-256 hash of
  the source code + model name. A cache hit returns instantly with 0 model calls.
- **Links in Prose.** File paths mentioned in the AI explanation render as
  clickable links that select and center the file in the canvas.
- **Staleness Detection.** If a file is modified, its content hash changes and
  the UI prompts to re-explain.

## Constraints

- **Zero Cost Requirement.** Runs 100% free with local Ollama or Gemini free tier.
- **AI Never Decides Structure.** The model only explains facts handed to it
  from the real AST parser; it never invents connections.
- **Rendered Markdown Subset.** Inline code, bullets, and bold. No unrendered
  markdown backticks or raw tokens.

## Acceptance check

1. Click **Explain** on a file: A concise explanation describes its role and
   actual neighbours.
2. Click **Explain** again: The explanation returns instantly from local cache
   with zero network/model latency.
3. Paths mentioned in the explanation are clickable and pan the canvas to that file.
4. Modify the file content: The UI detects the hash mismatch and flags the explanation
   as stale.
5. Works completely offline when pointed to an Ollama instance.
