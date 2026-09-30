import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

function replaceOnce(marker, replacement, label) {
  if (!html.includes(marker)) throw new Error(`Mobile UX marker missing: ${label}`);
  html = html.replace(marker, replacement);
}

const landscapeCss = `
/* KTAK V3 — compact tactical chat in phone landscape */
@media (orientation:landscape) and (max-height:600px) and (max-width:1000px){
  header{min-height:40px;padding:calc(3px + var(--safeTop)) 8px 3px}
  .logo{width:29px;height:29px;border-radius:8px}.brandText b{font-size:12px}.brandText small{display:none}.roomStatus{font-size:9px}
  nav{padding:3px 6px;gap:4px}nav button{padding:6px 4px;font-size:10px}
  .chatShell{max-width:none;padding:4px 7px;gap:4px;grid-template-rows:auto minmax(0,1fr) auto!important}
  .chatInfo{min-height:22px;align-items:center}.chatInfo>div:first-child .muted{display:none}.chatInfo b{font-size:12px}
  .memberList{max-width:58%;max-height:24px;overflow:auto;flex-wrap:nowrap;white-space:nowrap}
  .memberList>*{flex:0 0 auto}
  .pushCard{display:none!important}
  #chatLog{min-height:0;padding:5px 7px;border-radius:8px;overscroll-behavior:contain}
  .chatMsg{max-width:76%;padding:4px 7px;margin-bottom:3px;border-radius:8px;font-size:11px;line-height:1.25}
  .chatMsg .meta{font-size:8px;margin-bottom:1px}.chatMsg .deleteChat{padding:1px 4px;font-size:8px}
  .chatPhotoPreview{max-height:40px;overflow:hidden;margin-bottom:2px}
  .chatInput{grid-template-columns:auto minmax(0,1fr) auto;gap:4px}.chatInput button{padding:5px 8px}.chatInput input{padding:5px 7px;min-height:30px}
}
`;
replaceOnce('</style>', landscapeCss + '\n</style>', 'landscape chat css');

replaceOnce(
  '<input id="createPassword" type="password" minlength="8" maxlength="72" placeholder="房間密碼（至少 8 碼）">',
  '<input id="createPassword" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="4" autocomplete="new-password" placeholder="房間密碼（4 位數字）">',
  'create 4 digit pin input',
);
replaceOnce(
  '<input id="joinPassword" type="password" placeholder="房間密碼">',
  '<input id="joinPassword" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="4" autocomplete="current-password" placeholder="房間密碼（4 位數字）">',
  'join 4 digit pin input',
);
replaceOnce(
  '<input id="recoverCode" type="password" placeholder="指揮官恢復金鑰"><input id="recoverNick" placeholder="恢復後顯示的暱稱"><div class="muted">恢復成功後舊金鑰會立即失效，系統會產生一組新金鑰。</div>',
  '<input id="recoverCode" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="4" autocomplete="one-time-code" placeholder="指揮官恢復 PIN（4 位數字）"><div class="muted">只需房號與 4 位數指揮官 PIN；恢復後會沿用第一次建立房間時的暱稱，並產生新的 4 位數 PIN。</div>',
  'commander recovery pin ui',
);

replaceOnce(
  'if(pass.length<8||pass.length>72){toast("安全版房間密碼需 8～72 碼");return}',
  'if(!/^\\d{4}$/.test(pass)){toast("房間密碼請輸入 4 位數字");return}',
  'create pin validation',
);
replaceOnce(
  'if(!r||!nick||!pass){toast("請輸入房號、密碼與暱稱");return}',
  'if(!r||!nick||!pass){toast("請輸入房號、4 位數密碼與暱稱");return}if(!/^\\d{4}$/.test(pass)){toast("房間密碼請輸入 4 位數字");return}',
  'join pin validation',
);
replaceOnce(
  'if(row.recovery_code)showRecoveryCode(row.recovery_code,"請保存指揮官恢復金鑰");',
  'if(row.recovery_code)showRecoveryCode(row.recovery_code,"請保存 4 位數指揮官恢復 PIN");',
  'create recovery pin message',
);

const oldRecover = `$("recoverRoomBtn").onclick=async()=>{
  const r=$("recoverRoom").value.trim().toUpperCase(),code=$("recoverCode").value.trim(),nick=$("recoverNick").value.trim();
  if(!r||!code||!nick){toast("請輸入房號、恢復金鑰與暱稱");return}
  try{
    $("recoverRoomBtn").disabled=true;await ensureAuth();
    const {data,error}=await sb.rpc("ktak_recover_commander",{p_code:r,p_recovery_code:code,p_nick:nick});
    if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    if(!row||row.status!=="OK"){toast(row?.status==="RATE_LIMITED"?"恢復嘗試過多，請稍後再試":"房號或恢復金鑰錯誤");return}
    if(row.recovery_code)showRecoveryCode(row.recovery_code,"恢復成功：請保存新的恢復金鑰");
    await loadOnlineRoom(row.room_id);await enterRoom()
  }catch(e){console.error(e);toast("恢復失敗："+String(e.message||"未知錯誤"))}
  finally{$("recoverRoomBtn").disabled=false;initTurnstile()}
};`;
const newRecover = `$("recoverRoomBtn").onclick=async()=>{
  const r=$("recoverRoom").value.trim().toUpperCase(),code=$("recoverCode").value.trim();
  if(!r||!code){toast("請輸入房號與 4 位數指揮官 PIN");return}
  if(!/^\\d{4}$/.test(code)){toast("指揮官 PIN 請輸入 4 位數字");return}
  try{
    $("recoverRoomBtn").disabled=true;await ensureAuth();
    const {data,error}=await sb.rpc("ktak_recover_commander_v3",{p_code:r,p_recovery_code:code,p_device_key:window.__ktakEnhance.deviceKey()});
    if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    if(!row||row.status!=="OK"){toast(row?.status==="RATE_LIMITED"?"恢復嘗試過多，請稍後再試":"房號或指揮官 PIN 錯誤");return}
    if(row.recovery_code)showRecoveryCode(row.recovery_code,"恢復成功：請保存新的 4 位數指揮官 PIN");
    await loadOnlineRoom(row.room_id);await enterRoom();toast("已恢復指揮官："+(row.commander_nick||"指揮官"))
  }catch(e){console.error(e);toast("恢復失敗："+String(e.message||"未知錯誤"))}
  finally{$("recoverRoomBtn").disabled=false;initTurnstile()}
};`;
replaceOnce(oldRecover, newRecover, 'commander recovery handler');

if (!html.includes('ktak_recover_commander_v3') || !html.includes('房間密碼（4 位數字）') || html.includes('id="recoverNick"') || !html.includes('orientation:landscape')) {
  throw new Error('Mobile UX self-check failed');
}

fs.writeFileSync(file, html);
console.log('Integrated 4-digit room PINs, 4-digit commander recovery, sticky commander nickname, and compact landscape chat.');

