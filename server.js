import http from 'http';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // CORS & Enhanced Apple Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=()');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse requested URL
  let parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/') {
    pathname = '/index.html';
  }

  let filePath = path.join(__dirname, pathname);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      // Fallback: check inside public directory
      const publicPath = path.join(__dirname, 'public', pathname);
      fs.stat(publicPath, (err2, stats2) => {
        if (!err2 && stats2.isFile()) {
          serveFile(publicPath, res);
        } else {
          // If not found, serve index.html (SPA fallback)
          serveFile(path.join(__dirname, 'index.html'), res);
        }
      });
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`500 Server Error: ${err.message}`);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
}

let currentPort = Number(process.env.PORT) || 3000;

function startServer(port) {
  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 PDFCraft Studio (iLovePDF Clone) is running!`);
    console.log(`🌐 Local URL: http://localhost:${port}`);
    console.log(`🔒 100% Client-Side Privacy: All files processed locally`);
    if (port !== 3000) {
      console.log(`💡 Note: Port 3000 was in use, automatically switched to port ${port}.`);
    }
    console.log(`======================================================\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️  Port ${currentPort} is already in use. Retrying on port ${currentPort + 1}...`);
    currentPort++;
    setTimeout(() => {
      startServer(currentPort);
    }, 150);
  } else {
    console.error('Fatal Server Error:', err);
  }
});

startServer(currentPort);
