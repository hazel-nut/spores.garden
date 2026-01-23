import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const publicWellKnown = path.join(rootDir, 'public', '.well-known');
const distWellKnown = path.join(rootDir, 'dist', '.well-known');

if (!fs.existsSync(publicWellKnown)) {
    console.warn('No public/.well-known directory found; skipping copy.');
    process.exit(0);
}

fs.mkdirSync(distWellKnown, { recursive: true });

if (fs.cpSync) {
    fs.cpSync(publicWellKnown, distWellKnown, { recursive: true });
} else {
    const copyDir = (src, dest) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) copyDir(srcPath, destPath);
            else fs.copyFileSync(srcPath, destPath);
        }
    };
    copyDir(publicWellKnown, distWellKnown);
}

console.log('Copied public/.well-known to dist/.well-known');
