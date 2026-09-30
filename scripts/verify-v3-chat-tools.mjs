import fs from 'node:fs';

const html = fs.readFileSync('dist/index.html','utf8');
const required = [
  'chat-tools-v1',
  'id="chatFileInput"',
  'id="chatFileBtn"',
  'id="chatTagBtn"',
  'id="chatReplyBar"',
  'function chatBottom()',
  'className="chatLink"',
  'className="chatMention"',
  'id="clearMapIconsBtn"',
  'refreshCommanderClearMapUi();renderMembers();',
  "x.type==='symbol'||x.type==='shapeSymbol'",
  "'/files/'",
];
for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`KTAK chat-tools verification failed: ${marker}`);
}
console.log('KTAK chat-tools verification passed: autoscroll, Tag, reply, links, files, commander map clear.');

