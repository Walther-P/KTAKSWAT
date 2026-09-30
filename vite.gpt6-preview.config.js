import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
export default defineConfig({root:'dist',server:{host:'0.0.0.0',port:4173,allowedHosts:['terminal.local']},plugins:[{name:'local-ui-qa',configureServer(server){server.middlewares.use((req,res,next)=>{const match=req.url?.split('?')[0].match(/^\/__qa__\/(fixture|mobile|landscape|desktop)\.html$/);if(!match)return next();const file=path.resolve('.qa-ui',match[1]+'.html');if(!fs.existsSync(file)){res.statusCode=404;return res.end('Run the UI fixture preparation script.')}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(file))})}}]});
