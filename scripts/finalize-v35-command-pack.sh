#!/usr/bin/env bash
set -euo pipefail

test -f dist/index.html || { echo 'dist/index.html missing'; exit 1; }

node --check scripts/inject-v35-command-pack.mjs
node scripts/inject-v35-command-pack.mjs
node --check scripts/inject-v35-usability.mjs
node scripts/inject-v35-usability.mjs

cp public/ktak-v35-command.js dist/ktak-v35-command.js
cp public/ktak-v35-usability.js dist/ktak-v35-usability.js

node --check dist/ktak-v35-command.js
node --check dist/ktak-v35-usability.js

grep -q 'ktak35-command-pack-v1' dist/index.html
grep -q 'ktak-v35-usability-v1' dist/index.html
grep -q 'id="commandPage"' dist/index.html
grep -q 'id="v35Compass"' dist/index.html
grep -q 'id="v35GridToggle"' dist/index.html
grep -q 'id="v35SosHold"' dist/index.html
grep -q 'ktak-v35-command.js' dist/index.html
grep -q 'ktak-v35-usability.js' dist/index.html
grep -q '<textarea id="chatInput"' dist/index.html
test -s dist/ktak-v35-command.js
test -s dist/ktak-v35-usability.js

echo 'KTAK V3.5 command pack finalized and verified.'

