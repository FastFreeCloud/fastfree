#!/usr/bin/env node
/**
 * fastfree_social_mcp
 *
 * Creates publish-ready FastFree social media images.
 *
 * Every poster is built as a real vector SVG with live Arabic text, the
 * brand logo and a contact strip, then exported as a JPEG that Meta and
 * LinkedIn accept for direct upload.
 *
 * Nothing here needs a network connection, an API key or a browser: the
 * drawing is done locally by the resvg renderer.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  CATALOGUE_TOOL,
  SCREEN_POST_TOOL,
  SCREENS_TOOL,
  TOOL_DEFINITIONS,
  appKeyForTool,
  cataloguePayload,
} from './tools.js';
import { createPoster, createScreenPoster, screensCatalogue } from './handlers.js';

const NAME = 'fastfree_social_mcp';
const VERSION = '1.0.0';

const server = new Server(
  { name: NAME, version: VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  if (name === CATALOGUE_TOOL) {
    return {
      content: [{ type: 'text', text: JSON.stringify(cataloguePayload(), null, 2) }],
    };
  }

  if (name === SCREENS_TOOL) {
    try {
      const catalogue = screensCatalogue(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(catalogue, null, 2) }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `${name} failed: ${err && err.message ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === SCREEN_POST_TOOL) {
    const screenResult = await createScreenPoster(args);
    if (!screenResult.ok) {
      return {
        content: [
          {
            type: 'text',
            text: `FAILED\n\n${JSON.stringify(screenResult, null, 2)}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: `OK\n\n${JSON.stringify(screenResult, null, 2)}`,
        },
      ],
    };
  }

  const appKey = appKeyForTool(name);
  if (!appKey) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const result = await createPoster(appKey, args);

    // A tool that failed reports ok:false. Clients branch on isError, so a
    // plain success body would hide the failure.
    if (!result.ok) {
      return {
        content: [
          {
            type: 'text',
            text: `FAILED\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `OK\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: `${name} failed: ${err && err.message ? err.message : String(err)}`,
        },
      ],
      isError: true,
    };
  }
});

await server.connect(new StdioServerTransport());
