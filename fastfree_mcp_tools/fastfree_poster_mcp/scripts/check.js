/**
 * Self check for the poster server.
 *
 * Starts the server in-process, lists its tools, runs one tool and reports
 * whether the poster was produced. This is what `npm run check` does.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(here, '..', 'src', 'index.js');

function line(label, ok, detail = '') {
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
  return ok;
}

let failures = 0;
const assert = (label, ok, detail) => {
  if (!line(label, ok, detail)) failures += 1;
};

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  stderr: 'ignore',
});

const client = new Client({ name: 'fastfree-social-check', version: '1.0.0' });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`server : ${serverPath}`);
console.log(`tools  : ${tools.length}`);
for (const tool of tools) console.log(`  - ${tool.name}`);

assert('exposes the six app tools',
  ['pos', 'erp', 'ledger', 'panel', 'hr', 'website']
    .every((key) => tools.some((tool) => tool.name === `${key}_social_post`)),
  `${tools.length} tools`);

assert('exposes the catalogue tool',
  tools.some((tool) => tool.name === 'social_post_catalogue'));

// The catalogue must describe the apps, the ratios and the contact details.
const catalogue = await client.callTool({ name: 'social_post_catalogue', arguments: {} });
const catalogueText = catalogue.content?.[0]?.text || '{}';
const catalogueData = JSON.parse(catalogueText);
assert('catalogue lists six apps', catalogueData.apps?.length === 6);
assert('catalogue lists the ratios', catalogueData.ratios?.length > 0);
assert('catalogue carries the contact details', Boolean(catalogueData.contact?.phone));

// A real poster must come out of the tool.
const result = await client.callTool({
  name: 'pos_social_post',
  arguments: {
    title: 'نظام نقاط البيع fastfree',
    subtitle: 'فاست فري نقطة البيع',
    ctaText: 'ابدأ الآن مجاناً',
    ratio: '1:1',
    png: true,
  },
});

const payload = JSON.parse((result.content?.[0]?.text || '').replace(/^OK\s*/s, ''));
assert('the tool returns ok', payload.ok === true, payload.reason || '');
assert('the svg exists', Boolean(payload.svgFile) && fs.existsSync(payload.svgFile));
assert('the jpeg exists', Boolean(payload.jpegFile) && fs.existsSync(payload.jpegFile));
assert('the png exists', Boolean(payload.pngFile) && fs.existsSync(payload.pngFile));
assert('the jpeg is a real jpeg',
  fs.readFileSync(payload.jpegFile).slice(0, 3).toString('hex') === 'ffd8ff');
assert('the svg is small', payload.svgBytes < 100000, `${payload.svgBytes} bytes`);
assert('a caption is provided', Boolean(payload.caption));

await client.close();

console.log(`\n${failures === 0 ? 'OK - poster server is working' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
