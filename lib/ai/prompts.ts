export interface FileContext {
  path: string;
  content: string;
  role?: string;
  framework?: string;
  imports: string[];
  importedBy: string[];
}

export interface FolderContext {
  directory: string;
  files: { path: string; role?: string }[];
  fanIn: number;
  fanOut: number;
  incomingFiles: string[];
  outgoingFiles: string[];
  framework?: string;
}

export const SYSTEM_PROMPT = `You are a software architecture explainer for Cartograph, a codebase visualizer.
Every fact about imports, dependencies, and file paths provided to you has been verified by an AST parser.
STRICT RULES:
1. ONLY reference files and imports explicitly listed in the prompt. NEVER invent, guess, or hallucinate files or connections.
2. Clearly explain the component's primary architectural responsibility and how it interacts with its listed neighbors.
3. Use inline code (backticks) whenever naming specific files, directories, or symbols (e.g. \`user.controller.js\`).
4. Use bold text for core architectural patterns and roles (e.g. **controller**, **dependency injection**).
5. Do NOT include raw code fences (\`\`\`...) in your response. Keep your explanation in 2 to 3 dense, readable paragraphs.`;

export function buildFileExplainPrompt(ctx: FileContext): string {
  const outgoingList =
    ctx.imports.length > 0
      ? ctx.imports.map((i) => `  - \`${i}\``).join("\n")
      : "  None (leaf module / independent)";

  const incomingList =
    ctx.importedBy.length > 0
      ? ctx.importedBy.map((i) => `  - \`${i}\``).join("\n")
      : "  None (entrypoint or isolated file)";

  // Take the first ~120 lines of code to avoid token overflow while preserving essential context
  const codeLines = ctx.content.split("\n");
  const truncatedCode =
    codeLines.length > 120
      ? codeLines.slice(0, 120).join("\n") + `\n// ... (${codeLines.length - 120} more lines truncated)`
      : ctx.content;

  return `Explain the role of this file within the repository architecture:

FILE: \`${ctx.path}\`
FRAMEWORK: ${ctx.framework || "Generic"}
ARCHITECTURAL ROLE: ${ctx.role || "generic"}

NEIGHBORS IT IMPORTS (Outgoing dependencies):
${outgoingList}

NEIGHBORS THAT IMPORT IT (Incoming dependencies):
${incomingList}

SOURCE CODE EXCERPT:
${truncatedCode}

Write 2 concise paragraphs:
1. The architectural responsibility of \`${ctx.path}\`.
2. How data flows through its exact incoming and outgoing neighbors.`;
}

export function buildFolderExplainPrompt(ctx: FolderContext): string {
  const fileList = ctx.files
    .slice(0, 25)
    .map((f) => `  - \`${f.path}\` [${f.role || "file"}]`)
    .join("\n");

  const incomingList =
    ctx.incomingFiles.length > 0
      ? ctx.incomingFiles.slice(0, 15).map((i) => `  - \`${i}\``).join("\n")
      : "  None";

  const outgoingList =
    ctx.outgoingFiles.length > 0
      ? ctx.outgoingFiles.slice(0, 15).map((o) => `  - \`${o}\``).join("\n")
      : "  None";

  return `Explain the purpose of this directory module:

DIRECTORY: \`${ctx.directory}\`
TOTAL FILES: ${ctx.files.length}
FRAMEWORK: ${ctx.framework || "Generic"}

INTERNAL FILES:
${fileList}
${ctx.files.length > 25 ? `  ... and ${ctx.files.length - 25} more files` : ""}

EXTERNAL DEPENDENTS (Incoming Fan-In: ${ctx.fanIn}):
${incomingList}

EXTERNAL DEPENDENCIES (Outgoing Fan-Out: ${ctx.fanOut}):
${outgoingList}

Write 2 concise paragraphs:
1. What capability or architectural layer this folder encapsulates.
2. Why external components rely on it and how it connects to the broader system.`;
}
