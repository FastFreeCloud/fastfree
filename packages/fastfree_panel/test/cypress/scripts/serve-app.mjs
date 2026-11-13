/**
 * E2E static server for the built FastFree Clan Panel SPA.
 *
 * Serves `dist/spa` with SPA history fallback and proxies `/api/*` + `/mcp/*`
 * to the private backend, mirroring the production same-origin reverse proxy.
 * Uses only Node built-ins so it works from a clean install with no extra
 * dependencies.
 *
 * Environment:
 *   E2E_HOST     bind host   (default 127.0.0.1)
 *   E2E_PORT     bind port   (default 9000)
 *   E2E_API_HOST backend host (default 127.0.0.1)
 *   E2E_API_PORT backend port (default 9099)
 */
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
// test/cypress/scripts -> packages/fastfree_panel
const projectRoot = resolve(here, '..', '..', '..');
const distDir = join(projectRoot, 'dist', 'spa');

const host = process.env.E2E_HOST ?? '127.0.0.1';
const port = Number(process.env.E2E_PORT ?? 9000);
const apiHost = process.env.E2E_API_HOST ?? '127.0.0.1';
const apiPort = Number(process.env.E2E_API_PORT ?? 9099);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function proxyToBackend(req, res) {
  const headers = { ...req.headers, host: `${apiHost}:${apiPort}` };
  const upstream = http.request(
    { hostname: apiHost, port: apiPort, path: req.url, method: req.method, headers },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        error: { code: 'E2E_PROXY_UNAVAILABLE', message: `Cannot reach backend at ${apiHost}:${apiPort}: ${err.message}` },
      }),
    );
  });
  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/mcp')) {
    return proxyToBackend(req, res);
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    pathname = url.pathname;
  }

  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(distDir, safe);
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(distDir, 'index.html');
  }

  res.writeHead(200, {
    'content-type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`[e2e-serve] http://${host}:${port} -> ${distDir}`);
  console.log(`[e2e-serve] proxying /api + /mcp -> http://${apiHost}:${apiPort}`);
});
