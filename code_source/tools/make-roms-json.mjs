#!/usr/bin/env node
// Writes roms.json for a ROM library folder, so Retro9 can list it from any static host (GitHub Pages lists no folders).
//   node tools/make-roms-json.mjs <library folder>
// Every game file found (by extension, including .zip / .7z / .bin at any depth)
// is listed with its path; a picture with the same name (or in a boxart/, covers/ or images/ folder next to it) becomes its art.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname, basename, dirname } from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: node tools/make-roms-json.mjs <library folder>'); process.exit(1); }

const GAME = ['nes', 'unf', 'unif', 'fds', 'sfc', 'smc', 'gb', 'gbc', 'gba', 'md', 'gen', 'smd', 'sms', 'gg', 'n64', 'z64', 'v64', 'nds', 'zip', '7z'];
const BY_FOLDER = ['bin'];
const IMAGE = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

const files = [];
(function walk(dir) {
    for (const name of readdirSync(dir)) {
        if (name.startsWith('.')) continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else files.push(relative(root, full).split('\\').join('/'));
    }
})(root);

const images = new Map();
for (const f of files) if (IMAGE.includes(extname(f).slice(1).toLowerCase())) images.set(f.slice(0, -extname(f).length).toLowerCase(), f);

const games = [];
for (const f of files) {
    const ext = extname(f).slice(1).toLowerCase();
    if (!GAME.includes(ext) && !(BY_FOLDER.includes(ext) && f.includes('/'))) continue;
    const stem = f.slice(0, -extname(f).length), d = dirname(f) === '.' ? '' : dirname(f) + '/', b = basename(stem).toLowerCase();
    const art = images.get(stem.toLowerCase()) || ['boxart', 'covers', 'images', 'art', 'media'].map(s => images.get((d + s + '/' + b).toLowerCase())).find(Boolean);
    const entry = { file: f, name: basename(stem).replace(/_+/g, ' ').trim() };
    if (art) entry.art = art;
    games.push(entry);
}
games.sort((a, b) => a.file.localeCompare(b.file));
writeFileSync(join(root, 'roms.json'), JSON.stringify({ name: basename(root), games }, null, 1) + '\n');
console.log(`roms.json: ${games.length} games`);
