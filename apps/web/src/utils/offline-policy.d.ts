export function navigation(
  request: Request,
  network: (request: Request) => Promise<Response>,
  readShell: () => Promise<Response | undefined>,
): Promise<Response>;
export function logout(
  request: Request,
  network: (request: Request) => Promise<Response>,
  storage: { keys(): Promise<string[]>; delete(key: string): Promise<boolean> },
  unregister: () => Promise<boolean>,
): Promise<Response>;
