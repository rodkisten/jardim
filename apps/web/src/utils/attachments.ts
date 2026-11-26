export function attachmentIds(body: string): string[] {
  return [
    ...new Set(Array.from(body.matchAll(/\[anexo:([a-f0-9-]{36})\]/gi), (match) => match[1])),
  ];
}
