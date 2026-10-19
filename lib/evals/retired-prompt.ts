/**
 * Retired Prompt Definition (Phase 11)
 *
 * Constraint: "The retired prompt lives with the evals, not in the application.
 * Shipping a dead prompt so a test can reach it is the test shaping the product."
 *
 * Prompt v1 was a naive, ungrounded explanation prompt that lacked AST neighbor injection
 * and explicit anti-hallucination constraints.
 */

export const RETIRED_PROMPT_NAME = "v1-naive-ungrounded";
export const CURRENT_PROMPT_NAME = "v2-ast-grounded";

export function buildRetiredExplanationPrompt(filePath: string, code: string): string {
  const truncated = code.split("\n").slice(0, 100).join("\n");
  return `Explain the purpose and function of this file in the application:

FILE: \`${filePath}\`

SOURCE CODE:
\`\`\`
${truncated}
\`\`\`

Write a general summary explaining what this file does, how it works, and what components it connects to.`;
}
