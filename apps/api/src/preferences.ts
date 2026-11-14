import { z } from '@rodkisten/jardim-contracts';
export const City = z
  .object({
    label: z.string().min(1).max(180),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .strict();
const Settings = z
  .object({
    city: City.nullable().optional(),
    spotifyClientId: z
      .string()
      .regex(/^[a-fA-F0-9]{32}$/)
      .optional(),
  })
  .strict();
export async function readPreferences(env: Env) {
  const rows = await env.DB.prepare('SELECT key,value FROM app_preferences').all<{
    key: string;
    value: string;
  }>();
  return Object.fromEntries(rows.results.map((row) => [row.key, JSON.parse(row.value)]));
}
export async function preferences(env: Env, text?: string) {
  if (text === undefined) return Response.json(await readPreferences(env));
  let input: z.infer<typeof Settings>;
  try {
    input = Settings.parse(JSON.parse(text));
  } catch {
    return Response.json(
      { error: 'Use uma cidade válida ou o Client ID de 32 caracteres do Spotify.' },
      { status: 400 },
    );
  }
  const statements = Object.entries(input).map(([key, value]) =>
    env.DB.prepare(
      'INSERT INTO app_preferences(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at',
    ).bind(key, JSON.stringify(value), new Date().toISOString()),
  );
  // Switching the OAuth app invalidates pending challenges and credentials tied to the old app.
  if (input.spotifyClientId !== undefined) {
    const previous = await readPreferences(env);
    if (previous.spotifyClientId !== input.spotifyClientId)
      statements.push(
        env.DB.prepare("DELETE FROM integration_tokens WHERE provider='spotify'"),
        env.DB.prepare('DELETE FROM oauth_pending'),
      );
  }
  if (statements.length) await env.DB.batch(statements);
  return Response.json({ ok: true });
}
