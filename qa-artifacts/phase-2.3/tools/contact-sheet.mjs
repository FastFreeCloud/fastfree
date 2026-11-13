import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shotDir = path.resolve(__dirname, '..', 'screenshots');
const reportDir = path.resolve(__dirname, '..', 'reports');
const out = path.join(reportDir, 'contact-sheet.png');

const themes = ['dark', 'light', 'oled-black'];
const ress = ['1024x768', '1280x800', '1920x1080'];
const steps = [1, 2, 3, 4, 5, 6];
const cols = themes.length * ress.length;

const tw = 296, th = 196, pad = 6, topH = 30, leftW = 56, statusH = 14;
const width = leftW + cols * (tw + pad) + pad;
const height = topH + steps.length * (th + statusH + pad) + pad + 22;

const report = JSON.parse(fs.readFileSync(path.join(reportDir, 'audit-report.json'), 'utf8'));
const statusBy = new Map();
for (const r of report.results) statusBy.set(r.step + '|' + r.theme + '|' + r.resolution, r.status);

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#0b1120';
ctx.fillRect(0, 0, width, height);

ctx.fillStyle = '#e2e8f0';
ctx.font = 'bold 15px sans-serif';
ctx.fillText('Phase 2.3 - FastFree Installer visual audit contact sheet (54 checkpoints: 3 themes x 3 resolutions x 6 steps)', 8, 18);

let x = leftW;
for (const theme of themes) {
  for (const res of ress) {
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(theme, x + 2, topH - 14);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px sans-serif';
    ctx.fillText(res, x + 2, topH - 3);
    x += tw + pad;
  }
}

let y = topH;
for (const step of steps) {
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('Step ' + step, 6, y + th / 2);
  let cx = leftW;
  for (const theme of themes) {
    for (const res of ress) {
      const file = path.join(shotDir, 'step' + step + '-' + theme + '-' + res + '.png');
      const status = statusBy.get(step + '|' + theme + '|' + res) || 'missing';
      if (fs.existsSync(file)) {
        try {
          const img = await loadImage(file);
          ctx.drawImage(img, cx, y, tw, th);
        } catch {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx, y, tw, th);
        }
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx, y, tw, th);
      }
      ctx.strokeStyle = status === 'fail' ? '#ef4444' : status === 'warn' ? '#f59e0b' : '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + 1, y + 1, tw - 2, th - 2);
      ctx.fillStyle = status === 'fail' ? '#fca5a5' : status === 'warn' ? '#fcd34d' : '#86efac';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(status.toUpperCase(), cx + 3, y + th + 11);
      cx += tw + pad;
    }
  }
  y += th + statusH + pad;
}

ctx.fillStyle = '#64748b';
ctx.font = '10px sans-serif';
ctx.fillText('Border colour: green = pass, amber = warn, red = fail. Source: reports/audit-report.json', 8, height - 6);

fs.writeFileSync(out, canvas.toBuffer('image/png'));
console.log('contact sheet written:', out, width + 'x' + height, fs.statSync(out).size, 'bytes');
