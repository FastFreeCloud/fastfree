import asyncio
import json
import websockets

async def main():
    uri = "ws://127.0.0.1:9223"
    print(f"Connecting to Tauri MCP Bridge at {uri}...")
    try:
        async with websockets.connect(uri) as ws:
            print("Connected! Initializing...")
            init_req = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "fastfree-agent", "version": "1.0"}
                }
            }
            await ws.send(json.dumps(init_req))
            resp = await ws.recv()
            print("Init response:", resp)

            tools_req = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/list",
                "params": {}
            }
            await ws.send(json.dumps(tools_req))
            resp2 = await ws.recv()
            data = json.loads(resp2)
            tools = data.get("result", {}).get("tools", [])
            print(f"\n=== FOUND {len(tools)} TOOLS IN TAURI MCP BRIDGE ===")
            for t in tools:
                print(f"- {t.get('name')}: {t.get('description')}")
    except Exception as e:
        print("Error connecting to MCP Bridge:", e)

asyncio.run(main())
