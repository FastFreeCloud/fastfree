import fs from 'node:fs';
import { PNG } from 'pngjs';

const file = process.argv[2];
const x1 = Number(process.argv[3]), y1 = Number(process.argv[4]), x2 = Number(process.argv[5]), y2 = Number(process.argv[6]);
const png = PNG.sync.read(fs.readFileSync(file));
console.log('image:', png.width + 'x' + png.height, 'region:', `${x1},${y1} -> ${x2},${y2}`);

const counts = new Map();
for (let y = Math.max(0, y1); y < Math.min(png.height, y2); y++) {
  for (let x = Math.max(0, x1); x < Math.min(png.width, x2); x++) {
    const i = (png.width * y + x) << 2;
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2], a = png.data[i + 3];
    const key = `${r},${g},${b}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
}
const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
console.log('top colors (r,g,b -> count):');
for (const [c, n] of sorted.slice(0, 12)) console.log('  ', c, '->', n);

// brightest and darkest pixels
let brightest = null, darkest = null;
for (const c of counts.keys()) {
  const [r, g, b] = c.split(',').map(Number);
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (!brightest || l > brightest.l) brightest = { c, l };
  if (!darkest || l < darkest.l) darkest = { c, l };
}
console.log('brightest:', brightest.c, 'lum', brightest.l.toFixed(1));
console.log('darkest:', darkest.c, 'lum', darkest.l.toFixed(1));
