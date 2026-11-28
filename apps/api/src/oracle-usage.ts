export const ORACLE_DAILY_LIMIT = 20;
export async function reserveOracleRequest(db: D1Database) {
  const day = new Date().toISOString().slice(0, 10);
  const row = await db
    .prepare(
      'INSERT INTO oracle_usage(day,requests) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET requests=requests+1 WHERE requests < ? RETURNING requests',
    )
    .bind(day, ORACLE_DAILY_LIMIT)
    .first<{ requests: number }>();
  return row !== null;
}
export async function oracleUsage(db: D1Database) {
  const day = new Date().toISOString().slice(0, 10);
  const row = await db
    .prepare('SELECT requests FROM oracle_usage WHERE day=?')
    .bind(day)
    .first<{ requests: number }>();
  return { day, used: row?.requests ?? 0, limit: ORACLE_DAILY_LIMIT };
}
