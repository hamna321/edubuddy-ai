import pg from "pg";

const { Pool } = pg;

export function getPool() {
  if (!globalThis.__edubuddyPgPool) {
    globalThis.__edubuddyPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  return globalThis.__edubuddyPgPool;
}