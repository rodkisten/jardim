import { expect, test } from 'vitest';
import { renderCapsuleCard, cardFormats } from '@rodkisten/jardim-cards';
import type { Capsule } from '@rodkisten/jardim-contracts';
test('card formats have exact dimensions, escaped text and no hidden memory body or remote resources', () => {
  const capsule: Capsule = {
    id: crypto.randomUUID(),
    month: '2026-11',
    title: '<script>alert("x")</script>',
    introduction: 'Uma história & vida',
    memories: [
      {
        id: crypto.randomUUID(),
        title: 'Um momento',
        body: 'PRIVATE_BODY https://private.example',
        tags: [],
        createdAt: new Date().toISOString(),
      },
    ],
  };
  for (const [format, size] of Object.entries(cardFormats)) {
    const svg = renderCapsuleCard(capsule, format as keyof typeof cardFormats);
    expect(svg).toContain(`width="${size.width}" height="${size.height}"`);
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('PRIVATE_BODY');
    expect(svg).not.toContain('https://private.example');
    expect(svg).not.toContain('<foreignObject');
    expect(svg).not.toContain('href=');
  }
});
