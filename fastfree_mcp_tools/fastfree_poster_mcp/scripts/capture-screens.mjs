/**
 * Captures a real screen from each FastFree app.
 *
 * The applications are opened, connected to the backend, and a screen is
 * opened inside them. The window is then cropped out of the viewport, so
 * the capture is the screen itself rather than the desktop around it.
 *
 *   node scripts/capture-screens.mjs
 *
 * The result lands in screens/, and the poster generator uses it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '..', 'screens');

const BACKEND = 'https://backend.fastfree.cloud';

const CHROME = process.env.FASTFREE_CHROME
  || 'C:/Users/FastFree/AppData/Local/CentBrowser/Application/chrome.exe';

const APPS = {
  ledger: 'https://ledger.fastfree.cloud',
  pos: 'https://pos.fastfree.cloud',
  erp: 'https://erp.fastfree.cloud',
  hr: 'https://hr.fastfree.cloud',
};

/**
 * The screen to capture from each application.
 *
 * These are the screens that show the product working: a tree, a table or
 * a dashboard, which is what a reader of the post wants to see.
 */
const TARGETS = [
  { app: 'ledger', group: 'Accounting', key: 'accounting-chart', screen: 'Chart of Accounts' },
  { app: 'ledger', group: 'Inventory', key: 'inventory-products', screen: 'Products' },
  { app: 'pos', group: 'Sales', key: 'sales-customers', screen: 'Customers' },
  { app: 'pos', group: 'Sales', key: 'sales-orders', screen: 'Sales Orders' },
  { app: 'hr', group: 'HR', key: 'hr-employees', screen: 'Employees' },
  { app: 'hr', group: 'HR', key: 'hr-attendance', screen: 'Attendance' },
  { app: 'hr', group: 'CRM', key: 'crm-leads', screen: 'Leads' },
];

/**
 * Connect the app to the backend.
 *
 * The app asks for the server address the first time it runs.
 */
async function connect(page) {
  const input = page.locator('input').first();
  if (!(await input.count())) return;

  await input.fill(BACKEND);
  await page.waitForTimeout(400);

  const connect = page.getByText('CONNECT', { exact: false }).first();
  if (await connect.count()) await connect.click();

  await page.waitForTimeout(9000);
}

/**
 * Open a screen and save the window that contains it.
 *
 * The group panel closes once a screen is opened, so the group is opened
 * again for every screen. The screen is found by its key, which is the
 * stable identifier the lowcode registry uses, rather than by its label.
 */
async function capture(page, target) {
  const group = page.getByText(target.group, { exact: true }).first();
  if (await group.count()) {
    await group.click();
    await page.waitForTimeout(2000);
  }

  // The key is rendered next to the label in the group panel.
  const byKey = page.getByText(target.key, { exact: true }).first();
  const byLabel = page.getByText(target.screen, { exact: true }).first();
  const screen = (await byKey.count()) ? byKey : byLabel;

  if (!(await screen.count())) {
    console.log(`  MISSING "${target.screen}" in ${target.group}`);
    return null;
  }

  await screen.click();
  await page.waitForTimeout(6000);

  const panel = page.locator('.lc-window-panel, [class*="window-panel"]').last();
  const name = `${target.app}-${target.key}.png`;
  const file = path.join(outDir, name);

  if (await panel.count()) {
    await panel.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file });
  }

  console.log(`  saved ${name}`);
  return name;
}

async function main() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox'],
  });

  for (const target of TARGETS) {
    // Each screen gets a fresh page. The group panel closes once a screen is
    // opened and does not reopen, so a new page is simpler than trying to
    // bring it back.
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

    console.log(`\n${target.app} / ${target.screen}:`);

    try {
      await page.goto(APPS[target.app], { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(4000);
      await connect(page);
      await capture(page, target);
    } catch (err) {
      console.log(`  FAILED ${target.screen}: ${err.message.split('\n')[0]}`);
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nscreens written to ${outDir}`);
}

await main();
