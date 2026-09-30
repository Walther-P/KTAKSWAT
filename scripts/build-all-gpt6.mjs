import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const env={...JSON.parse(fs.readFileSync('config/build-public.json','utf8')),...process.env};
if(fs.existsSync('.env'))for(const line of fs.readFileSync('.env','utf8').split('\n')){const i=line.indexOf('=');if(i>0&&!line.startsWith('#'))env[line.slice(0,i)]=line.slice(i+1).trim();}
if(env.VITE_SUPABASE_URL!=='https://pvkbdmpwfrojmftncxmy.supabase.co')throw Error('Refusing to build against any non-test backend');
if(/^(YOUR_|DISABLED_)|^$/.test(env.VITE_GOOGLE_MAPS_API_KEY||''))env.VITE_GOOGLE_MAPS_API_KEY='';
execFileSync('npm',['run','build:native'],{env,stdio:'inherit'});
// The legacy packaging script expects this variable; its YOUR_ sentinel never
// enables an API request and is normalized to an empty key in the final config.
if(!env.VITE_GOOGLE_MAPS_API_KEY)env.VITE_GOOGLE_MAPS_API_KEY='YOUR_GPT6_GOOGLE_DEMO_KEY';
execFileSync('bash',['scripts/prepare-v356-preview.sh'],{env,stdio:'inherit'});
execFileSync('node',['scripts/build-gpt6.mjs'],{env,stdio:'inherit'});
