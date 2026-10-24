#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (process.argv.includes('--check')) {
    const jsFiles = [
        'js/i18n.js',
        'js/systems.js',
        'js/art.js',
        'js/library.js',
        'js/saves.js',
        'js/settings.js',
        'js/player.js',
        'js/app.js',
        'tools/make-roms-json.mjs'
    ];
    for (const rel of jsFiles) {
        execFileSync(process.execPath, ['--check', path.join(ROOT, rel)], { stdio: 'inherit' });
    }
    JSON.parse(fs.readFileSync(path.join(ROOT, 'mypc-app.json'), 'utf8'));
    console.log('Retro9 syntax and manifest checks passed.');
    process.exit(0);
}

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.zip': 'application/zip',
    '.7z': 'application/x-7z-compressed',
    '.bin': 'application/octet-stream'
};

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer((req, res) => {
    try {
        const parsed = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        let reqPath = decodeURIComponent(parsed.pathname);
        if (reqPath.endsWith('/')) reqPath += 'index.html';
        const fullPath = path.resolve(ROOT, '.' + reqPath);
        if (!fullPath.startsWith(ROOT)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        const ext = path.extname(fullPath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        });
        fs.createReadStream(fullPath).pipe(res);
    } catch (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Retro9 dev server listening on http://0.0.0.0:${PORT}`);
});
