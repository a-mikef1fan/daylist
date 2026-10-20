/** Connection string from the environment (DATABASE_URL, falling back to POSTGRES_URL). */
export function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}
