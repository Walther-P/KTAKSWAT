import fs from 'node:fs';

const file = 'dist/owner-admin/index.html';
let html = fs.readFileSync(file, 'utf8');
const external = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';
const local = '<script defer src="./supabase-client.js"></script>';

if (html.includes(external)) {
  html = html.replace(external, local);
  fs.writeFileSync(file, html);
  console.log('Owner admin CDN reference replaced with local bundle.');
} else if (html.includes('./supabase-client.js')) {
  console.log('Owner admin already references the local bundle; no replacement needed.');
} else {
  throw new Error('Owner admin Supabase script marker not found');
}

if (html.includes('cdn.jsdelivr.net/npm/@supabase/supabase-js')) {
  throw new Error('Owner admin still depends on external Supabase CDN');
}

const buildModernAdmin = (version) => {
  let out = html.replace(local, '');

  const oldInvoke = "var data=await request(cfg.SUPABASE_URL+'/functions/v1/ktak-admin',{method:'POST',headers:headers({'x-ktak-admin-token':token}),body:JSON.stringify(body||{})},10000);";
  const newInvoke = "var payload=Object.assign({},body||{},{admin_token:token}); var data=await request(cfg.SUPABASE_URL+'/functions/v1/ktak-admin',{method:'POST',headers:headers(),body:JSON.stringify(payload)},10000);";
  if (!out.includes(oldInvoke)) throw new Error('Owner admin modern invoke marker missing');
  out = out.replace(oldInvoke, newInvoke);

  const oldList = "var data=await invoke({action:'list'}); var rooms=Array.isArray(data&&data.rooms)?data.rooms:[];";
  const newList = "var rows=await rpc('ktak_admin_list_rooms',{p_token:token}); var rooms=Array.isArray(rows)?rows:[];";
  if (!out.includes(oldList)) throw new Error('Owner admin modern list marker missing');
  out = out.replace(oldList, newList);

  out = out.replace('<body>', `<body data-owner-admin-version="${version}">`);

  if (!out.includes('id="setup" class="panel"')) throw new Error('Owner admin setup form is not visible by default');
  if (!out.includes("/rest/v1/rpc/")) throw new Error('Owner admin direct RPC client missing');
  if (!out.includes("ktak_admin_list_rooms',{p_token:token}")) throw new Error('Owner admin direct room listing missing');
  if (!out.includes('admin_token:token')) throw new Error('Owner admin delete token body fallback missing');
  if (out.includes('x-ktak-admin-token')) throw new Error('Owner admin modern page must not rely on custom admin token header');
  if (out.includes('supabase-client.js')) throw new Error('Owner admin modern page must not load the Supabase SDK bundle');
  return out;
};

const v2Dir = 'dist/owner-admin-v2';
fs.mkdirSync(v2Dir, { recursive: true });
fs.writeFileSync(`${v2Dir}/index.html`, buildModernAdmin('v2'));

const v3Dir = 'dist/owner-admin-v3';
fs.mkdirSync(v3Dir, { recursive: true });
fs.writeFileSync(`${v3Dir}/index.html`, buildModernAdmin('v3'));

console.log('Owner admin v2/v3 written with direct room RPC and body-token Edge flow.');

