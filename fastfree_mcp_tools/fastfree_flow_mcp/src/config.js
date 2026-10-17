/**
 * Runtime configuration.
 *
 * Every value can come from an environment variable, so a path or an
 * account check can be changed without editing any file.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const env = process.env;

export const config = {
  // Browser binary
  browser: env.FLOW_BROWSER
    || 'C:/Users/FastFree/AppData/Local/CentBrowser/Application/chrome.exe',

  // Chromium user-data root (contains Default / Profile N)
  userDataDir: env.FLOW_USER_DATA
    || 'C:/Users/FastFree/AppData/Local/CentBrowser/User Data',

  // Profile directory name inside userDataDir
  profile: env.FLOW_PROFILE || 'Default',

  // When true, the server launches the browser itself before connecting.
  // Useful when the agent runs without a terminal.
  autoLaunch: env.FLOW_AUTO_LAUNCH !== '0',

  cdpPort: Number(env.FLOW_CDP_PORT || 9222),

  flowUrl: env.FLOW_URL || 'https://flow.google.com',

  // Optional: lock to a specific Flow project. If set, openFlow/navigation will
  // verify the current page URL contains this project ID. Empty = no restriction.
  projectId: env.FLOW_PROJECT_ID || '',

  // If set, flow_status warns when a different account is signed in.
  expectedAccount: env.FLOW_ACCOUNT || '',

  // Output goes to a folder next to the project, on the Desktop.
  outputDir: env.FLOW_OUTPUT_DIR || path.resolve(root, 'output'),

  pollIntervalMs: Number(env.FLOW_POLL_MS || 4000),
  maxPolls: Number(env.FLOW_MAX_POLLS || 45),
  settleRounds: 3,
  typeDelayMs: 25,
  launchTimeoutMs: 20000,

  // Hard ceiling for a single tool call, so a wedged page cannot hold the
  // request open past what MCP clients normally wait.
  toolTimeoutMs: Number(env.FLOW_TOOL_TIMEOUT_MS || 420000),

  models: {
    image: ['Nano Banana Pro', 'Nano Banana 2', 'Imagen 4'],
    video: ['Omni Flash', 'Veo 3.1 - Lite', 'Veo 3.1 - Fast', 'Veo 3.1 - Quality'],
  },
  // Kept in step with RATIOS in brand/brand.js. flow_brand_prompt advertises
  // these, so flow_generate_image must accept every one of them.
  ratios: ['16:9', '1.91:1', '4:3', '1:1', '3:4', '9:16'],
  durations: ['4s', '6s', '8s', '10s'],

  // Single source of truth for media matching. browser.js counts with these,
  // files.js harvests with these, so the two can never drift apart.
  mediaPatterns: {
    image: 'flow-content\\.google/image/',
    video: 'flow-content\\.google/video/',
  },

  // Small images on the page are thumbnails, not the generated asset.
  minMediaPixels: 256,
  maxMediaPerRun: 4,
};

export const slugify = (s, n = 6) =>
  s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, n)
    .join('-') || 'image';