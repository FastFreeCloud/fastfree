import asyncio
import json
import websockets

async def call_mcp(command, args=None):
    uri = "ws://127.0.0.1:9223"
    async with websockets.connect(uri) as ws:
        msg = {
            "id": "req-mcp",
            "command": command
        }
        if args is not None:
            msg["args"] = args
        await ws.send(json.dumps(msg))
        resp = await ws.recv()
        return json.loads(resp)

async def main():
    print("=== LIVE TAURI MCP INSPECTION ===")
    js_query = """
        const appCards = Array.from(document.querySelectorAll('.diag-card')).map(card => {
            const title = card.querySelector('.text-subtitle1, .text-h6')?.innerText || '';
            const desc = card.querySelector('.text-caption')?.innerText || '';
            const btn = card.querySelector('button')?.innerText || '';
            const badges = Array.from(card.querySelectorAll('.q-badge')).map(b => b.innerText);
            return { title, desc, badges, btn };
        }).filter(c => c.title);

        return {
            windowTitle: document.title,
            currentUrl: window.location.href,
            totalCards: appCards.length,
            apps: appCards
        };
    """
    res = await call_mcp("execute_js", {"script": js_query, "windowLabel": "main"})
    print("Result via MCP Bridge:")
    print(json.dumps(res.get("data"), ensure_ascii=False, indent=2))

asyncio.run(main())
