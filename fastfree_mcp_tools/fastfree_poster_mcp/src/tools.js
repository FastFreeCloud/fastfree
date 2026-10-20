/**
 * MCP tool definitions.
 *
 * One tool per FastFree application, so a caller picks the tool whose name
 * says which app it is publishing for and never has to pass an app key
 * that could be wrong.
 */
import { APP_KEYS, APPS, RATIOS, SCREENS, getApp } from './brand.js';
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
  const app = getApp(appKey);
  return {
    name: `${appKey}_social_post`,
    title: `FastFree ${app.name} social post`,
    description: `Create a publish-ready social media image for FastFree ${app.name} (${app.taglineAr}). `
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
  {
    name: 'app_screens',
    title: 'List the FastFree app screens',
    description: 'List every screen in the FastFree apps, with its Arabic and English label, the '
      + 'package that owns it, the component that renders it and the apps that ship it. '
      + 'Call this before creating a screen poster.',
    inputSchema: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          enum: APP_KEYS,
          description: 'Only the screens this app ships. Omit for the whole catalogue.',
        },
        package: {
          type: 'string',
          enum: [...new Set(SCREENS.map((screen) => screen.package))],
          description: 'Only the screens owned by this package. Omit for all.',
        },
        includeComponents: {
          type: 'boolean',
          description: 'Include the repository path of each screen component. Defaults to true.',
        },
      },
      required: [],
    },
    annotations: {
      title: 'List the FastFree app screens',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'screen_social_post',
    title: 'Create a social post about one FastFree screen',
    description: 'Create a publish-ready social image for a specific screen inside a FastFree app, '
      + 'using that screen\'s Arabic label as the headline. Call app_screens first to get a valid '
      + 'app and screen pair.',
    inputSchema: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          enum: APP_KEYS,
          description: 'The app that ships the screen.',
        },
        screen: {
          type: 'string',
          description: 'Screen key from app_screens, for example "sales-invoices".',
        },
        title: {
          type: 'string',
          description: 'Arabic headline. Defaults to the screen label in Arabic.',
        },
        subtitle: {
          type: 'string',
          description: 'Short label above the headline. Defaults to the app name in Arabic.',
        },
        body: {
          type: 'string',
          description: 'Line under the headline. Defaults to the app tagline.',
        },
        ctaText: { type: 'string', description: 'Call to action button label.' },
        ctaUrl: { type: 'string', description: 'Link under the button. Defaults to the app URL.' },
        ratio: { type: 'string', enum: Object.keys(RATIOS), description: 'Output size.' },
        logo: { type: 'boolean', description: 'Draw the FastFree logo. Defaults to true.' },
        contact: { type: 'boolean', description: 'Draw the contact strip. Defaults to true.' },
        caption: { type: 'string', description: 'Optional caption to publish with the image.' },
        png: { type: 'boolean', description: 'Also write a PNG next to the JPEG. Defaults to false.' },
      },
      required: ['app', 'screen'],
    },
    annotations: {
      title: 'Create a screen social post',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
];

/**
 * The tool that lists the catalogue, and the app key each other tool
 * belongs to.
 */
export const CATALOGUE_TOOL = 'social_post_catalogue';

/** The tool that lists the screens. */
export const SCREENS_TOOL = 'app_screens';

/** The tool that builds a poster about one screen. */
export const SCREEN_POST_TOOL = 'screen_social_post';

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
