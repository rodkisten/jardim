const blockers = new Set<string>();
export function setUpdateBlocker(key: string, blocked: boolean) {
  if (blocked) blockers.add(key);
  else blockers.delete(key);
}
export function hasUpdateBlockers() {
  return blockers.size > 0;
}

export function hasMarkdownBlockers() {
  return [...blockers].some((key) => key.startsWith('markdown:'));
}
