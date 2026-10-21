/**
 * Captures the panel and the website.
 *
 * The panel is a Quasar SPA with its own pages, and the website is the
 * Next.js marketing site, so neither goes through the lowcode group panel
 * the other applications use.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '..', 'screens');

const CHROME = process.env.FASTFREE_CHROME
  || 'C:/Users/FastFree/AppData/Local/CentBrowser/Application/chrome.exe';

const TARGETS = [
  {
    app: 'panel',
    url: 'https://panel.fastfree.cloud',
    name: 'panel-machines',
    after: async (page) => {
      const link = page.getByText('machines', { exact: false }).first();
      if (await link.count()) {
        await link.click();
        await page.waitForTimeout(5000);
      }
    },
  },
  {
    app: 'website',
    url: 'https://fastfree.cloud/ar',
    name: 'website-home',
    after: async () => {},
  },
];

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox'],
});

for (const target of TARGETS) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  console.log(`\n${target.app}:`);

  try {
    await page.goto(target.url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);
    await target.after(page);
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(outDir, `${target.name}.png`) });
    console.log(`  saved ${target.name}.png`);
  } catch (err) {
    console.log(`  FAILED ${target.name}: ${err.message.split('\n')[0]}`);
  }

  await page.close();
}

await browser.close();
console.log(`\nscreens written to ${outDir}`);
