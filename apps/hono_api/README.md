# Hono API Server for FastFree ERP

## Installation
```bash
cd /c/Users/FastFree/Desktop/fastfree
mkdir -p apps/hono_api && cd apps/hono_api
npm create hono@latest
npm install
```

## Usage
OpenCode generated a complete Hono API server with:
- GET /health
- GET /api/users (with pagination)
- POST /api/users (with validation)
- CORS middleware
- Error handling
- In-memory store (swap for DB)
- TypeScript types

## Run
```bash
npm run dev
curl http://localhost:3000/health
```
