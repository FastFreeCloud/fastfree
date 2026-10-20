/**
 * MCP tool definitions.
 *
 * One tool per FastFree application, so a caller picks the tool whose name
 * says which app it is publishing for and never has to pass an app key
 * that could be wrong.
 */
import { APPS, APP_KEYS, RATIOS } from './brand.js';
import { catalogue } from './poster.js';

/**
 * The input schema shared by every poster tool.
 *
 * `title` is the only required field: everything else has a sensible
 * default so a caller can produce a usable poster with one argument.
 */
const POSTER_INPUT_PROPERTIES = {
  title: {
    type: 'string',
    description: 'The Arabic headline of the post.',
  },
  subtitle: {
    type: 'string',
    description: 'Short label shown above the headline. Defaults to the app name in Arabic.',
  },
  ctaText: {
    type: 'string',
    description: 'Call to action button label, for example "Start free now".',
  },
  ctaUrl: {
    type: 'string',
    description: 'Link shown under the button. Defaults to the app URL.',
  },
  ratio: {
    type: 'string',
    enum: Object.keys(RATIOS),
    description: 'Output size. 1:1 and 4:5 fit every feed uncropped; 1.91:1 is for link previews.',
  },
  logo: {
    type: 'boolean',
    description: 'Draw the FastFree logo in the top corner. Defaults to true.',
  },
  contact: {
    type: 'boolean',
    description: 'Draw the contact strip along the bottom. Defaults to true.',
  },
  caption: {
    type: 'string',
    description: 'Optional caption to publish with the image. Returned as-is so it can be pasted into Facebook or LinkedIn.',
  },
  png: {
    type: 'boolean',
    description: 'Also write a PNG next to the JPEG. Defaults to false.',
  },
};

/**
 * Build the tool definition for one app.
 */
function buildToolDefinition(appKey) {
  const app = APPS[appKey];
  return {
    name: `${appKey}_social_post`,
    title: `FastFree ${app.name} social post`,
    description: `Create a publish-ready social media image for FastFree ${app.name} (${app.tagline}). `
      + 'Produces a real vector SVG with live Arabic text, the FastFree logo and a contact strip, '
      + 'plus a JPEG that Meta and LinkedIn accept for direct upload.',
    inputSchema: {
      type: 'object',
      properties: POSTER_INPUT_PROPERTIES,
      required: ['title'],
    },
    annotations: {
      title: `Create a ${app.name} social post`,
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  };
}

/**
 * Every tool this server exposes.
 */
export const TOOL_DEFINITIONS = [
  ...APP_KEYS.map(buildToolDefinition),
  {
    name: 'social_post_catalogue',
    title: 'List the social post catalogue',
    description: 'List the available apps, their brand colours, the output ratios with the platforms '
      + 'each one fits, and the contact details used in the contact strip.',
    inputSchema: { type: 'object', properties: {} },
    annotations: {
      title: 'List the social post catalogue',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

/**
 * The tool that lists the catalogue, and the app key each other tool
 * belongs to.
 */
export const CATALOGUE_TOOL = 'social_post_catalogue';

/**
 * Map a tool name back to its app key.
 */
export function appKeyForTool(toolName) {
  for (const appKey of APP_KEYS) {
    if (toolName === `${appKey}_social_post`) return appKey;
  }
  return null;
}

/**
 * The catalogue payload.
 */
export function cataloguePayload() {
  return catalogue();
}
