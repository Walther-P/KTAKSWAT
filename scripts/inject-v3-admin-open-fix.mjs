import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

const marker = `    const overlay = adminEl('ktakAdminOverlay');\n    if (!overlay || !window.sb && typeof sb === 'undefined') return;\n    overlay.classList.add('open');\n    overlay.setAttribute('aria-hidden', 'false');\n    adminSetStatus('正在檢查管理狀態…');`;

const replacement = `    const overlay = adminEl('ktakAdminOverlay');\n    if (!overlay) return;\n    overlay.classList.add('open');\n    overlay.setAttribute('aria-hidden', 'false');\n    adminSetStatus('正在檢查管理狀態…');\n    if (typeof sb === 'undefined') {\n      adminSetStatus('管理服務尚未初始化，請完全關閉 KTAK 後重新開啟再試', 'bad');\n      return;\n    }`;

if (!html.includes(marker)) throw new Error('Admin open marker not found');
html = html.replace(marker, replacement);
if (!html.includes('管理服務尚未初始化')) throw new Error('Admin open visible-failure patch self-check failed');
fs.writeFileSync(file, html);
console.log('KTAK admin open fix applied: overlay opens before backend availability check.');

