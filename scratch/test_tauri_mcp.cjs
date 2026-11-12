const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:9223');

ws.on('open', () => {
    console.log('Connected to Tauri MCP Bridge on port 9223');
    // Send JSON-RPC initialize
    const initReq = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'fastfree-agent', version: '1.0' }
        }
    };
    ws.send(JSON.stringify(initReq));
});

ws.on('message', (data) => {
    console.log('Received:', data.toString());
    const msg = JSON.parse(data.toString());
    if (msg.id === 1) {
        // Send tools/list
        const toolsReq = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
        };
        ws.send(JSON.stringify(toolsReq));
    } else if (msg.id === 2) {
        console.log('=== AVAILABLE TOOLS IN TAURI MCP BRIDGE ===');
        console.log(JSON.stringify(msg.result, null, 2));
        ws.close();
    }
});

ws.on('error', (err) => {
    console.error('WS Error:', err.message);
});
