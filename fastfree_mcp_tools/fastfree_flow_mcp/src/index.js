#!/usr/bin/env node
/**
 * fastfree_flow_mcp
 *
 * Exposes Google Flow (image + video generation) as MCP tools.
 * Talks to an already-running Chromium browser over CDP, so the agent
 * uses the user's own signed-in Google session. No API keys.
 *
 * Start the browser first:  scripts\\launch.cmd
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema, CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config.js';
import * as tools from './tools/index.js';
import {
  brandRead, brandPrompt, brandTokens, brandAddLogo,
} from './tools/brand.js';

const NAME = 'fastfree_flow_mcp';

const TOOL_DEFS = [
  /* ---- brand ---- */
  {
    name: 'flow_brand_read',
    group: 'Brand',
    description:
      'Read the brand kit: company name, colour palette, typography, icon set, logo files, social ratios, imagery and voice. ' +
      'Start here when the user asks "what is our brand" or before generating anything branded.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'flow_brand_prompt',
    group: 'Brand',
    description:
      'Turn a short request into an on-brand generation prompt using brand/BRAND.md. ' +
      'Supports kinds: logo, icon, illustration, post, screenshot. ' +
      'Returns a comma-free prompt ready to pass to flow_generate_image.',
    inputSchema: {
      type: 'object',
      properties: {
        request: { type: 'string', description: 'What you want, e.g. "a logo for FastFree" or "a facebook post about inventory"' },
        kind: { type: 'string', enum: ['logo', 'icon', 'illustration', 'post', 'screenshot'], description: 'What type of visual' },
        ratio: { type: 'string', enum: config.ratios, description: `One of: ${config.ratios.join(' / ')}` },
        exclude: { type: 'array', items: { type: 'string' }, description: 'Things to avoid, e.g. ["gradients","people"]' },
      },
      required: ['request'],
    },
  },
  {
    name: 'flow_brand_tokens',
    group: 'Brand',
    description: 'Get the brand design tokens (colours, typography, icons, imagery, social ratios, logo rules, voice) for building UI or documents - not for image generation.',
    inputSchema: {
      type: 'object',
      properties: {
        group: { type: 'string', description: 'colors | typography | shape | icons | imagery | socialRatios | logo | voice (default: all)' },
      },
    },
  },
  {
    name: 'flow_brand_add_logo',
    group: 'Brand',
    description: 'Promote a generated image to an approved brand asset by copying it into brand/logos/. Use after the user approves a logo.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceFile: { type: 'string', description: 'Absolute path to the approved image' },
        name: { type: 'string', description: 'Asset name, e.g. logo-primary' },
      },
      required: ['sourceFile'],
    },
  },

  /* ---- session ---- */
  {
    name: 'flow_launch',
    group: 'Session',
    description: 'Start the Chromium browser with remote debugging so Flow can be driven. Usually unnecessary - other tools launch it automatically. Use restart=true to relaunch the browser (closes the current one).',
    inputSchema: {
      type: 'object',
      properties: { restart: { type: 'boolean', description: 'Close the running browser first, then relaunch.' } },
    },
  },
  {
    name: 'flow_status',
    group: 'Session',
    description: 'Check the Google Flow browser session: sign-in state, active Google account, available image models, and CDP port.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'flow_screenshot',
    group: 'Session',
    description:
      'Capture a screenshot of the open Google Flow page and save it to the output folder. ' +
      'Navigates to Flow first only if the current tab is somewhere else.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'File name, without the .png extension' } },
    },
  },
  {
    name: 'flow_discover_ui',
    group: 'Session',
    description: 'List the interactive elements (buttons, navigation, inputs) on the current Flow page. Use this if a tool starts failing after a Flow UI update.',
    inputSchema: { type: 'object', properties: {} },
  },

  /* ---- images ---- */
  {
    name: 'flow_generate_image',
    group: 'Images',
    description:
      'Generate images with Google Flow (Nano Banana Pro / Nano Banana 2 / Imagen 4) using the signed-in Google session. ' +
      'IMPORTANT: commas are stripped by the Flow editor - write the prompt with spaces or "and" instead. ' +
      'Consumes Flow credits; the daily free allowance is set by Google and is not read by this tool. ' +
      'ratio is applied to the composer when the control is found; the result reports ratioApplied either way.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'What to create, written without commas.' },
        ratio: {
          type: 'string',
          enum: config.ratios,
          description: `Aspect ratio. One of: ${config.ratios.join(' / ')}`,
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'flow_download_latest',
    group: 'Images',
    description: 'Download the most recently generated image from the open Flow project.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'flow_list_output',
    group: 'Images',
    description: 'List previous generation runs saved locally, grouped by day.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 200, description: 'How many day folders to list (default 20)' },
      },
    },
  },

  /* ---- video ---- */
  {
    name: 'flow_setup_video',
    group: 'Video',
    description:
      'Prepare a video generation in Flow (ratio, duration). The prompt is typed into the composer but NOT submitted, ' +
      'so no credits are spent - you press Generate in the browser yourself. The model is whatever Flow already has selected.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Video description, without commas.' },
        ratio: { type: 'string', enum: config.ratios, description: `One of: ${config.ratios.join(' / ')}` },
        duration: { type: 'string', enum: config.durations, description: `One of: ${config.durations.join(' / ')}` },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'flow_create_scene',
    group: 'Video',
    description: 'Open the Scenes panel in the current Flow project. The prompt is optional guidance, not submitted.',
    inputSchema: {
      type: 'object',
      properties: { prompt: { type: 'string', description: 'Optional scene description to plan around' } },
    },
  },

  /* ---- characters ---- */
  {
    name: 'flow_list_characters',
    group: 'Characters',
    description: 'Open the Characters panel and list the characters in the current Flow project.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'flow_create_character',
    group: 'Characters',
    description: 'Open the Characters panel and its add form, ready to create a named character.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Character name' },
        description: { type: 'string', description: 'Character appearance and personality' },
      },
      required: ['name', 'description'],
    },
  },

  /* ---- tools gallery ---- */
  {
    name: 'flow_open_tools_gallery',
    group: 'Tools',
    description: 'Open the Flow Tools gallery and list its tabs (My Tools, Community, Templates). Creating custom tools requires a paid AI plan.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'flow_use_grid_architect',
    group: 'Tools',
    description: 'Open Grid Architect in Flow for batch shot generation from a theme. Each shot consumes a credit.',
    inputSchema: {
      type: 'object',
      properties: {
        theme: { type: 'string', description: 'Shared theme or visual style for the batch' },
        shots: { type: 'string', description: 'Shot list, one per line' },
      },
      required: ['theme'],
    },
  },
];

const HANDLERS = {
  flow_brand_read: () => brandRead(),
  flow_brand_prompt: (a) => brandPrompt(a),
  flow_brand_tokens: (a) => brandTokens(a),
  flow_brand_add_logo: (a) => brandAddLogo(a),
  flow_launch: (a) => tools.flowLaunch(a),
  flow_status: () => tools.flowStatus(),
  flow_screenshot: (a) => tools.flowScreenshot(a),
  flow_discover_ui: () => tools.flowDiscoverUi(),
  flow_generate_image: (a) => tools.flowGenerateImage(a),
  flow_download_latest: () => tools.flowDownloadLatest(),
  flow_list_output: (a) => tools.flowListOutput(a),
  flow_setup_video: (a) => tools.flowSetupVideo(a),
  flow_create_scene: (a) => tools.flowCreateScene(a),
  flow_list_characters: () => tools.flowListCharacters(),
  flow_create_character: (a) => tools.flowCreateCharacter(a),
  flow_open_tools_gallery: () => tools.flowOpenToolsGallery(),
  flow_use_grid_architect: (a) => tools.flowUseGridArchitect(a),
};

const server = new Server(
  { name: NAME, version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFS.map(({ group, ...rest }) => rest),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const handler = HANDLERS[name];

  if (!handler) {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }

  const started = Date.now();
  let timer;

  try {
    const result = await Promise.race([
      handler(args),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Timed out after ${config.toolTimeoutMs}ms`)),
          config.toolTimeoutMs,
        );
        // Do not hold the event loop open for a timer that will usually be
        // discarded unused.
        if (typeof timer.unref === 'function') timer.unref();
      }),
    ]);

    const elapsed = Date.now() - started;

    // A tool that reached Flow but did nothing reports ok:false. Clients
    // branch on isError, so a plain success body would hide every failure.
    const failed = result?.ok === false;

    return {
      content: [
        {
          type: 'text',
          text:
            `${failed ? 'FAILED' : 'OK'}  (${elapsed}ms)\n\n` + JSON.stringify(result, null, 2),
        },
      ],
      isError: failed,
    };
  } catch (err) {
    // Only point at the browser when the browser is actually the problem.
    const browserIssue = /CDP|browser|ECONNREFUSED|launch\.cmd|context|no open tab/i.test(err.message);

    return {
      content: [
        {
          type: 'text',
          text:
            `${name} failed: ${err.message}` +
            (browserIssue ? '\n\nIf the browser is not reachable, run scripts\\launch.cmd first.' : ''),
        },
      ],
      isError: true,
    };
  } finally {
    clearTimeout(timer);
  }
});

await server.connect(new StdioServerTransport());