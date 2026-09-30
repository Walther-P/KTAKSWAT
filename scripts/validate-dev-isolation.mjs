// KTAK dev CI safety guard: never allow production Supabase configuration into dev.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const forbiddenRef = process.env.KTAK_PROD_SUPABASE_REF;

if (!forbiddenRef) {
  console.error('KTAK_PROD_SUPABASE_REF is required.');
  process.exit(2);
}

const roots = [
  'src',
  'supabase',
  'index.html',
  'capacitor.config.ts',
  'capacitor.config.js',
  '.env.example',
];

const forbidden = [
  forbiddenRef,
  `https://${forbiddenRef}.supabase.co`,
];

const hits = [];

function inspect(path) {
  if (!existsSync(path)) return;
  const stat = statSync(path);

  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) {
      inspect(join(path, name));
    }
    return;
  }

  if (!stat.isFile()) return;

  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }

  if (forbidden.some((value) => text.includes(value))) {
    hits.push(relative(process.cwd(), path));
  }
}

for (const root of roots) inspect(root);

if (hits.length) {
  console.error('DEV ISOLATION FAILED: production Supabase reference found in:');
  for (const hit of hits) console.error(`- ${hit}`);
  process.exit(1);
}

console.log('DEV isolation check passed: no production Supabase reference found.');

