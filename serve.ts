// A tiny static file server for playing Emberfall Duel locally:
//   node serve.ts
//   open http://localhost:8080/game/index.html
// Serves the repository directory; / redirects to the game page. Node's
// standard library only, no dependencies, no build step.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT ?? 8080);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/') {
      res.writeHead(302, { Location: '/game/index.html' });
      res.end();
      return;
    }
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
    if (rel.startsWith('..')) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const file = join(ROOT, rel);
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(PORT, () => {
  console.log(`Emberfall Duel at http://localhost:${PORT}/game/index.html`);
});
