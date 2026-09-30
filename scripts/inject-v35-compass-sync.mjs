import fs from 'node:fs';

const htmlPath = 'dist/index.html';
const compassPath = 'dist/ktak-v35-compass-sync.js';

if (!fs.existsSync(htmlPath)) throw new Error('KTAK V3.5 dist/index.html is missing');
if (!fs.existsSync(compassPath) || fs.statSync(compassPath).size < 100) {
  throw new Error('KTAK V3.5 compass runtime is missing from dist');
}

let html = fs.readFileSync(htmlPath, 'utf8');
if (html.includes('ktak-v35-compass-sync.js')) {
  console.log('KTAK V3.5 compass sync already injected');
  process.exit(0);
}

const marker = '<script src="./ktak-v35-command.js"></script>';
if (!html.includes(marker)) throw new Error('KTAK V3.5 command runtime marker is missing');

html = html.replace(
  marker,
  `${marker}\n<script src="./ktak-v35-compass-sync.js"></script>`,
);

if (!html.includes('ktak-v35-compass-sync.js')) {
  throw new Error('KTAK V3.5 compass sync injection failed');
}

fs.writeFileSync(htmlPath, html);
console.log('KTAK V3.5 dynamic north compass sync injected.');

