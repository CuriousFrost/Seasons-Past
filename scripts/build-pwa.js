// PWA Build Script
// Copies necessary files to pwa-dist folder for deployment

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'pwa-dist');

// Files to copy for PWA
const filesToCopy = [
    'index.html',
    'renderer.js',
    'storage-adapter.js',
    'pwa-storage.js',
    'firebase-sync.js',
    'firebase-config.js',
    'service-worker.js',
    'manifest.json'
];

// Directories to copy
const directoriesToCopy = [
    'icons'
];

// Files/directories to exclude (Electron-specific)
const excludePatterns = [
    'main.js',
    'scryfall.js',
    'electron-storage.js',
    'preload.js',
    'node_modules',
    'dist',
    'pwa-dist',
    '.git',
    'myDecks.json',
    'games.json',
    'commanders.json',
    'build',
    'scripts',
    'package.json',
    'package-lock.json'
];

function ensureDir(dir) {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
}

function copyDirectory(src, dest) {
    ensureDir(dest);

    const entries = readdirSync(src);

    for (const entry of entries) {
        const srcPath = join(src, entry);
        const destPath = join(dest, entry);
        const stat = statSync(srcPath);

        if (stat.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            copyFileSync(srcPath, destPath);
            console.log(`Copied: ${entry}`);
        }
    }
}

function build() {
    console.log('Building PWA...\n');

    // Create dist directory
    ensureDir(distDir);

    // Copy individual files
    console.log('Copying files...');
    for (const file of filesToCopy) {
        const srcPath = join(rootDir, file);
        const destPath = join(distDir, file);

        if (existsSync(srcPath)) {
            copyFileSync(srcPath, destPath);
            console.log(`Copied: ${file}`);
        } else {
            console.warn(`Warning: ${file} not found`);
        }
    }

    // Copy directories
    console.log('\nCopying directories...');
    for (const dir of directoriesToCopy) {
        const srcPath = join(rootDir, dir);
        const destPath = join(distDir, dir);

        if (existsSync(srcPath)) {
            copyDirectory(srcPath, destPath);
            console.log(`Copied directory: ${dir}`);
        } else {
            console.warn(`Warning: ${dir} not found`);
        }
    }

    console.log('\n========================================');
    console.log('PWA build complete!');
    console.log(`Output: ${distDir}`);
    console.log('\nTo serve locally:');
    console.log('  npm run serve:pwa');
    console.log('\nOr use any static file server:');
    console.log('  npx serve pwa-dist');
    console.log('  python -m http.server -d pwa-dist 3000');
    console.log('========================================\n');
}

build();
