# Driving OpenCode + fastfree_board from a shell

Concrete commands for dispatching and inspecting board work. Model quota is the recurring failure: pick a model with quota before any board call.

## 1. Probe for a working model

Free (`opencode/*`) and Go (`opencode-go/*`) quotas are separate and both reset on their own timers. Probe with a trivial prompt — it costs one cheap call and tells you which pool still has quota.

```bash
for m in opencode-go/beam-free opencode-go/glm-5.3 opencode/longcat-2.5-free; do
  echo "=== $m ==="
  timeout 90 opencode run --auto --format json -m "$m" "Reply with exactly: OK" 2>&1 \
    | grep -oE '"text":"(OK|[^"]{0,120})"' | tail -2
done
```

Use the first model that returns `OK` for every later call in that session.

## 2. Board mutations

The build agent has the `board_*` tools, so a prompt that names the tool and its JSON input is enough:

```bash
opencode run --auto --format json -m <working-model> \
  "Call board_list with {\"label\":\"sdui\"} and reply with only the raw JSON result."
```

Create a card:

```bash
opencode run --auto --format json -m <working-model> \
  "Call board_create with {\"title\":\"...\",\"description\":\"...\",\"labels\":\"sdui,p0\",\"column_id\":\"backlog\"}. Reply with the raw JSON."
```

Start work on a card — the child session inherits the calling model, so this is where the quota check matters:

```bash
opencode run --auto --format json -m <working-model> \
  "Call board_start with {\"task_id\":\"<id>\",\"open\":true}. Reply with the raw JSON."
```

Batch several calls in one prompt only when they are independent; the agent runs them sequentially and returns the last text.

## 3. Inspect sessions

```bash
opencode api GET /api/session            # list sessions (id, model, outcome, directory)
opencode api GET /api/session/<id>/message  # messages; look at the last message type
```

A board card's `links[].id` is the session id; a card in `review` has both a work session and a review session.

## 4. MCP bridge (alternative)

```bash
FASTFREE_BOARD_MODEL=<working-model> \
  sh -c 'printf "%s\n" \
    "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\":\"params\":{}}" \
    "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"fastfree_board_list\",\"arguments\":{}}}" \
    | node plugins/fastfree_board/mcp-server.mjs'
```

The bridge spawns `opencode api`, so it needs the same model quota. `FASTFREE_BOARD_AGENT` selects the agent (default `build`).

## 5. Quota errors

- `provider.free-limit` → free pool exhausted; switch to an `opencode-go/*` model or wait for the daily reset.
- `provider.go-limit` → 5-hour Go window exhausted; switch to a free model with quota or wait.
- Neither is retried automatically: re-issue the command with a different `-m`.
