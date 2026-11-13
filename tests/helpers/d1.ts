import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

/** Exercise the real D1 adapter against SQLite, rather than mocking Prisma's results. */
export function createTestDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync('infra/cloudflare/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sqlite.exec(readFileSync('infra/cloudflare/migrations/' + file, 'utf8'));
  const meta = {
    duration: 0,
    size_after: 0,
    rows_read: 0,
    rows_written: 0,
    last_row_id: 0,
    changed_db: false,
    changes: 0,
  };
  function prepare(sql: string, params: SQLInputValue[] = []): D1PreparedStatement {
    function raw<T = unknown[]>(options: { columnNames: true }): Promise<[string[], ...T[]]>;
    function raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>;
    async function raw<T = unknown[]>(options?: {
      columnNames?: boolean;
    }): Promise<T[] | [string[], ...T[]]> {
      const statement = sqlite.prepare(sql);
      const columns = statement.columns().map((column) => column.name);
      const rows = statement
        .all(...params)
        .map((row) => columns.map((column) => row[column])) as T[];
      return options?.columnNames ? [columns, ...rows] : rows;
    }
    return {
      raw,
      bind: (...values: SQLInputValue[]) => prepare(sql, values),
      run: async () => {
        const result = sqlite.prepare(sql).run(...params);
        return {
          success: true,
          results: [],
          meta: { ...meta, changes: Number(result.changes), changed_db: true },
        };
      },
      first: async () => sqlite.prepare(sql).get(...params) || null,
      all: async () => ({ success: true, results: sqlite.prepare(sql).all(...params), meta }),
    } as D1PreparedStatement;
  }
  const binding = {
    prepare,
    batch: async (statements: D1PreparedStatement[]) => {
      sqlite.exec('BEGIN');
      try {
        const results = await Promise.all(statements.map((statement) => statement.run()));
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  } as D1Database;
  return { binding, sqlite, close: () => sqlite.close() };
}
