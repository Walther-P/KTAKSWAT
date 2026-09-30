import fs from 'node:fs';

const path='scripts/patch-v35-field-feedback-v7.mjs';
let s=fs.readFileSync(path,'utf8');
const replacements=[
  [
    String.raw`/function renderAssignments\(\)\{[\s\S]*?\n\}\nasync function createAssignment/`,
    String.raw`/function renderAssignments\(\)\{[\s\S]*?\}\s*async function createAssignment/`,
  ],
  [
    String.raw`/function renderSectors\(\)\{[\s\S]*?\n\}\nasync function updateSector/`,
    String.raw`/function renderSectors\(\)\{[\s\S]*?\}\s*async function updateSector/`,
  ],
  [
    String.raw`.filter(Boolean).join('\n');if(d&&!d.value)d.value=summary`,
    String.raw`.filter(Boolean).join('\\n');if(d&&!d.value)d.value=summary`,
  ],
];
let changed=0;
for(const [from,to] of replacements){
  if(s.includes(from)){s=s.replace(from,to);changed++}
  else if(!s.includes(to))throw new Error('V3.5 v7 normalization target missing: '+from);
}
fs.writeFileSync(path,s);
console.log(`Normalized ${changed} V3.5 feedback-v7 marker/escape(s).`);

