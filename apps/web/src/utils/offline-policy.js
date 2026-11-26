export async function navigation(request, network, readShell) {
  try {
    return await network(request);
  } catch {
    return (
      (await readShell()) ||
      new Response('Conecte-se para preparar o Jardim offline.', { status: 503 })
    );
  }
}
export async function logout(request, network, storage, unregister) {
  const response = await network(request);
  if (response.ok || response.status === 303) {
    await Promise.all(
      (await storage.keys())
        .filter((key) => key.startsWith('workbox-precache') || key.startsWith('jardim-shell-'))
        .map((key) => storage.delete(key)),
    );
    await unregister();
  }
  return response;
}
