// Serves the static export (out/) under /bank, the way GitHub Pages and
// thorsteingames.com/bank do. Usage: node e2e/serve.mjs [port]
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve(process.cwd(), "out");
const BASE = "/bank";
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

if (!existsSync(join(ROOT, "index.html"))) {
  console.error("out/index.html is missing. Run `npm run build` first.");
  process.exit(1);
}

function send(res, status, file) {
  res.writeHead(status, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  if (pathname === BASE) {
    res.writeHead(301, { location: `${BASE}/` });
    return res.end();
  }
  if (!pathname.startsWith(`${BASE}/`)) {
    res.writeHead(404);
    return res.end("Not under /bank");
  }

  const relative = normalize(decodeURIComponent(pathname.slice(BASE.length)));
  let file = join(ROOT, relative);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end();
  }
  if (existsSync(file) && statSync(file).isDirectory()) {
    file = join(file, "index.html");
  }
  if (existsSync(file) && statSync(file).isFile()) {
    return send(res, 200, file);
  }
  return send(res, 404, join(ROOT, "404.html"));
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Serving out/ at http://127.0.0.1:${PORT}${BASE}/`);
});
