import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
const dir = new URL('../apps/web/public/', import.meta.url);
mkdirSync(dir, { recursive: true });
function crc(buffer) {
  let c = 0xffffffff;
  for (const b of buffer) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type),
    len = Buffer.alloc(4),
    sum = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  sum.writeUInt32BE(crc(Buffer.concat([name, data])));
  return Buffer.concat([len, name, data, sum]);
}
for (const size of [180, 192, 512]) {
  const pixels = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / size,
        py = (y + 0.5) / size,
        dx = px - 0.5,
        dy = py - 0.45,
        r = Math.hypot(dx, dy),
        a = Math.atan2(dy, dx);
      const petals = r < 0.2 + 0.075 * Math.cos(a * 8) && r > 0.095;
      const stem = Math.abs(dx) < 0.017 && py > 0.49 && py < 0.81;
      const leaf =
        Math.pow((Math.abs(dx) - 0.1) / 0.12, 2) +
          Math.pow((py - 0.72 + Math.abs(dx) * 0.35) / 0.045, 2) <
        1;
      const color = r < 0.1 ? [73, 55, 26] : petals || stem || leaf ? [255, 203, 50] : [16, 17, 19];
      const offset = y * (size * 3 + 1) + 1 + x * 3;
      pixels.set(color, offset);
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  writeFileSync(
    new URL('icon-' + size + '.png', dir),
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(pixels)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}
