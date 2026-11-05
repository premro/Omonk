const http = require('http');
const fs = require('fs');
const path = require('path');
const apiHandler = require('./api/index');

const PORT = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, 'client');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.flac': 'audio/flac',
    '.wav': 'audio/wav',
    '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // API Routes (Vercel serverless proxy)
    if (pathname.startsWith('/api/') || pathname.startsWith('/server/music_api/')) {
        return apiHandler(req, res);
    }

    // Serve static client files
    let relPath = pathname === '/' || pathname === '/app' || pathname === '/app/' ? 'index.html' : pathname;
    if (relPath.startsWith('/app/')) relPath = relPath.slice(5);
    if (relPath.startsWith('/client/')) relPath = relPath.slice(8);
    if (relPath.startsWith('/')) relPath = relPath.slice(1);

    const safePath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(CLIENT_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Fallback to index.html for SPA client navigation
            filePath = path.join(CLIENT_DIR, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, content) => {
            if (readErr) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                return res.end('404 Not Found');
            }
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
            });
            res.end(content);
        });
    });
});

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`🎵 OMonk Music Streaming Server running at: http://localhost:${PORT}`);
        console.log(`🚀 Ready for Vercel and GitHub deployment (Zero Catalyst dependency)`);
    });
}

module.exports = server;
