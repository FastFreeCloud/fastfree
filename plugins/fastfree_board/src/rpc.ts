import { Rpc } from "@opencode/plugin/rpc"

// This is a transport, not another task store. Desktop retains the global board.
export const BoardBridge = Rpc.define({
  id: "fastfree_board.bridge",
  events: {},
  methods: {
    poll: {
      input: { type: "object", properties: { clientID: { type: "string", minLength: 1 }, toolsEnabled: { type: "boolean" } }, required: ["clientID"], additionalProperties: false },
      output: {
        anyOf: [{ type: "null" }, { type: "object", properties: { cancel: { type: "string" } }, required: ["cancel"], additionalProperties: false }, {
          type: "object",
          properties: {
            id: { type: "string" },
            request: {
              type: "object",
              properties: { operation: { type: "string" }, input: { type: "object" }, sessionID: { type: "string" }, directory: { type: "string" }, model: { type: "object", properties: { id: { type: "string", minLength: 1 }, providerID: { type: "string", minLength: 1 }, variant: { type: "string" } }, required: ["id", "providerID"], additionalProperties: false } },
              required: ["operation", "input", "sessionID"],
              additionalProperties: false,
            },
          },
          required: ["id", "request"],
          additionalProperties: false,
        }],
      },
    },
    complete: { input: { type: "object", properties: { clientID: { type: "string" }, id: { type: "string" }, result: {}, error: { type: "string" } }, required: ["clientID", "id"], additionalProperties: false }, output: { type: "null" } },
    // Liveness: the GUI beats every couple of seconds so agents can tell "Desktop is closed"
    // apart from "Desktop is busy", and fail fast instead of waiting for the full timeout.
    heartbeat: {
      input: { type: "object", properties: { clientID: { type: "string", minLength: 1 } }, required: ["clientID"], additionalProperties: false },
      output: { type: "object", properties: { ok: { type: "boolean" }, clientID: { type: "string" }, lastSeen: { type: "number" }, pending: { type: "number" }, owned: { type: "number" }, completed: { type: "number" } }, required: ["ok"], additionalProperties: false },
    },
    status: {
      input: { type: "object", properties: {}, additionalProperties: false },
      output: { type: "object", properties: { lastSeen: { type: "number" }, pending: { type: "number" }, owned: { type: "number" }, completed: { type: "number" } }, required: ["lastSeen", "pending", "owned", "completed"], additionalProperties: false },
    },
    hindsight_recall: {
      input: { type: "object", properties: { query: { type: "string", minLength: 1 }, max_tokens: { type: "integer", minimum: 64, maximum: 4096 }, endpoint: { type: "string" }, bank: { type: "string", minLength: 1, maxLength: 64 } }, required: ["query"], additionalProperties: false },
      output: { type: "object", properties: { markdown: { type: ["string", "null"] } }, required: ["markdown"], additionalProperties: false },
    },
    hindsight_retain: {
      input: { type: "object", properties: { content: { type: "string", minLength: 1 }, context: { type: "string" }, document_id: { type: "string" }, tags: { type: "array", items: { type: "string" }, maxItems: 16 }, endpoint: { type: "string" }, bank: { type: "string", minLength: 1, maxLength: 64 } }, required: ["content"], additionalProperties: false },
      output: { type: "object", properties: { detail: { type: "string" }, ok: { type: "boolean" } }, required: ["detail", "ok"], additionalProperties: false },
    },
    hindsight_reflect: {
      input: { type: "object", properties: { query: { type: "string", minLength: 1 }, max_tokens: { type: "integer", minimum: 64, maximum: 2000 }, endpoint: { type: "string" }, bank: { type: "string", minLength: 1, maxLength: 64 } }, required: ["query"], additionalProperties: false },
      output: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false },
    },
  },
})
