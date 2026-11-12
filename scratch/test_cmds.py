import asyncio
import json
import websockets

async def test_cmd(cmd_name, payload=None):
    uri = "ws://127.0.0.1:9223"
    async with websockets.connect(uri) as ws:
        msg = {"id": "1", "command": cmd_name}
        if payload:
            msg.update(payload)
        await ws.send(json.dumps(msg))
        resp = await ws.recv()
        print(f"Command '{cmd_name}' -> {resp}")

async def main():
    commands = [
        "help",
        "get_tools",
        "list_tools",
        "get_elements",
        "dump_tree",
        "screenshot",
        "take_screenshot",
        "get_state",
        "eval",
        "click"
    ]
    for c in commands:
        try:
            await test_cmd(c)
        except Exception as e:
            print(f"Err on {c}: {e}")

asyncio.run(main())
