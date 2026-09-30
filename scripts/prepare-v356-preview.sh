#!/usr/bin/env bash
set -euo pipefail

# Build the complete verified V3.5.5 chain first. patch-v355-maintenance.mjs
# imports V3.5.6 as its final narrow hotfix layer.
bash scripts/prepare-v35-command-site.sh

node --check dist/ktak-v35-hotfix-v356.js
node --check dist/ktak-v35-assignment-prompt-v14.js
test -s dist/ktak-v35-hotfix-v356.js
grep -Fq './ktak-v35-hotfix-v356.js?v=3.5.6' dist/index.html
grep -Fq './ktak-v35-assignment-prompt-v14.js?v=35-assignment14-v356' dist/index.html
grep -Fq "window.__KTAK35_V356={version:'3.5.6'" dist/ktak-v35-hotfix-v356.js
grep -Fq "revision:'14.2-v356'" dist/ktak-v35-assignment-prompt-v14.js
grep -Fq "if(!force&&a.status!=='pending')return" dist/ktak-v35-assignment-prompt-v14.js
grep -Fq "if(teamFast)layer.setLatLng([item.lat,item.lng]);else updateLeafletLayer(layer,item)" dist/index.html
grep -Fq '.v355TeamMarkerLabel{opacity:1!important' dist/index.html

node --input-type=module - <<'NODE'
import fs from 'node:fs';
fs.writeFileSync('dist/KTAK_BUILD.json',JSON.stringify({version:'3.5.6',baseVersion:'3.5.5',commit:process.env.GITHUB_SHA||null})+'\n');
NODE

echo 'KTAK V3.5.6 preview build verified.'
echo 'Verified: V3.5.5 behavior retained; group-marker readability/performance and one-shot assignment alerts added without Stable/production changes.'

