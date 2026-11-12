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
    print("1. Calling 'list_windows' on Tauri MCP Bridge...")
    res = await call_mcp("list_windows")
    print("Windows:", json.dumps(res, indent=2))

    print("\n2. Executing JS in main window via MCP to check current route / DOM...")
    js_code = """
        return {
            title: document.title,
            url: window.location.href,
            bodyHtmlLength: document.body.innerHTML.length,
            stepText: document.querySelector('.step-badge, .brand-text, .sdui-step-host')?.innerText || 'Not found',
            allHeadings: Array.from(document.querySelectorAll('h1, h2, h3, .brand-company-title')).map(el => el.innerText.trim()),
            hasSdui: !!document.querySelector('.sdui-step-host'),
            activeStepNav: document.querySelector('.step-item.active, .step-dot.active')?.innerText || 'Step 1'
        };
    """
    res_js = await call_mcp("execute_js", {"script": js_code, "windowLabel": "main"})
    print("DOM State via MCP:", json.dumps(res_js, indent=2))

asyncio.run(main())
