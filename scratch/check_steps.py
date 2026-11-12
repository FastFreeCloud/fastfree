import asyncio
import json
import websockets

async def call_mcp(command, args=None):
    uri = "ws://127.0.0.1:9223"
    async with websockets.connect(uri) as ws:
        msg = {
            "id": "req-1",
            "command": command
        }
        if args is not None:
            msg["args"] = args
        await ws.send(json.dumps(msg))
        resp = await ws.recv()
        return json.loads(resp)

async def main():
    print("Inspecting Step navigation buttons via MCP...")
    js_inspect = """
        const steps = Array.from(document.querySelectorAll('.step-progress-item, .step-item, .step-indicator, button, [data-step]')).map(el => ({
            tag: el.tagName,
            class: el.className,
            text: el.innerText.trim(),
            dataset: Object.assign({}, el.dataset)
        }));
        return steps.slice(0, 20);
    """
    res = await call_mcp("execute_js", {"script": js_inspect, "windowLabel": "main"})
    print("Nav elements:", json.dumps(res.get("data"), indent=2))

asyncio.run(main())
