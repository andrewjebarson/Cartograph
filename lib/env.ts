// Optional environment configuration for local Cartograph.
const REQUIRED: readonly string[] = [];

type EnvKey = string;

export function assertEnv(): void {
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables (set them in .env.local):\n  ${missing.join("\n  ")}`,
    );
  }
}

export function env(key: EnvKey): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Missing environment variable ${key}`);
  return value;
}
