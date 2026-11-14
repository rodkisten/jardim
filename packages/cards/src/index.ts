import type { Capsule } from '@rodkisten/jardim-contracts';
export const cardFormats = {
  og: { width: 1200, height: 630 },
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  feed: { width: 1080, height: 1350 },
} as const;
export type CardFormat = keyof typeof cardFormats;
const xml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!,
  );
function lines(value: string, width: number, limit: number) {
  const chars = Array.from(value.replace(/\s+/g, ' ').trim());
  const result: string[] = [];
  while (chars.length && result.length < limit) result.push(chars.splice(0, width).join(''));
  if (chars.length) result[result.length - 1] = result.at(-1)!.slice(0, -1) + '…';
  return result;
}
/** Pure SVG renderer: escape every user string and never embed HTML, scripts, network URLs or private media. */
export function renderCapsuleCard(capsule: Capsule, format: CardFormat = 'og') {
  const { width, height } = cardFormats[format],
    padding = width * 0.07,
    titleSize = width * 0.052,
    start = height > 1200 ? height * 0.3 : height * 0.27;
  const title = lines(capsule.title, 30, 3),
    description = lines(
      capsule.introduction ||
        capsule.memories
          .slice(0, 3)
          .map((memory) => memory.title)
          .join(' · '),
      48,
      height > 1000 ? 7 : 3,
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${xml(capsule.title)}</title><rect width="100%" height="100%" fill="#f4f1e9"/><circle cx="${width * 0.94}" cy="${height * 0.1}" r="${width * 0.2}" fill="#dce4c9"/><path d="M${width * 0.9} ${height * 0.86}q-${width * 0.12} -${height * 0.1} -${width * 0.05} -${height * 0.2}" fill="none" stroke="#99ac82" stroke-width="6"/><text x="${padding}" y="${height * 0.12}" fill="#31543e" font-family="sans-serif" font-size="${width * 0.021}" letter-spacing="4">JARDIM · CÁPSULA DO MÊS</text>${title.map((line, index) => `<text x="${padding}" y="${start + index * titleSize * 1.2}" fill="#293c30" font-family="Georgia,serif" font-size="${titleSize}">${xml(line)}</text>`).join('')}${description.map((line, index) => `<text x="${padding}" y="${start + title.length * titleSize * 1.2 + width * 0.035 + index * width * 0.031}" fill="#59664f" font-family="sans-serif" font-size="${width * 0.023}">${xml(line)}</text>`).join('')}<text x="${padding}" y="${height * 0.91}" fill="#31543e" font-family="sans-serif" font-size="${width * 0.022}">${xml(capsule.month)} · ${capsule.memories.length} MEMÓRIAS · VERSÃO SELADA</text></svg>`;
}
