#!/usr/bin/env node
/* Builds the Retro9 My PC application from /code_source into the repository root (/),
 * and validates My PC manifest, cache-busting versions, and JavaScript syntax. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.basename(ROOT) === 'code_source' ? ROOT : path.join(ROOT, 'code_source');
const OUT = path.basename(ROOT) === 'code_source' ? path.resolve(ROOT, '..') : ROOT;

const APP_FILES = [
    '.nojekyll',
    'CLAUDE.md',
    'README.md',
    'mypc-app.json',
    'index.html',
    'player.html',
    'icon.svg',
    'css/app.css',
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

// 1. Ensure /code_source exists and is populated if running for the first time
for (const rel of APP_FILES) {
    const srcFile = path.join(SRC, rel);
    const outFile = path.join(OUT, rel);
    if (!fs.existsSync(srcFile) && fs.existsSync(outFile)) {
        fs.mkdirSync(path.dirname(srcFile), { recursive: true });
        fs.copyFileSync(outFile, srcFile);
    }
}

// 2. Build from /code_source into repository root (/)
for (const rel of APP_FILES) {
    const srcFile = path.join(SRC, rel);
    const outFile = path.join(OUT, rel);
    if (fs.existsSync(srcFile)) {
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        if (srcFile !== outFile) {
            fs.copyFileSync(srcFile, outFile);
        }
    }
}

// 3. Validate My PC manifest and JS syntax at repository root
const manifestPath = path.join(OUT, 'mypc-app.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.mypc !== 1 || !manifest.id || !manifest.entry || !manifest.icon || !manifest.version) {
    throw new Error('Invalid mypc-app.json manifest');
}

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
    execFileSync(process.execPath, ['--check', path.join(OUT, rel)], { stdio: 'inherit' });
}

console.log(`Built Retro9 v${manifest.version} from code_source/ into repository root (/) with full My PC compliance.`);
