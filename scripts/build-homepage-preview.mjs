/** Review builds reuse only the publishable client settings already shipped publicly.
 * No server keys, database changes, login or deployment configuration changes. */
import { execFileSync, spawnSync } from 'node:child_process';
const origin='https://www.lou-rex.com';
const read=url=>execFileSync('curl',['--fail','--location','--silent','--show-error','--max-time','30',url],{encoding:'utf8',maxBuffer:10*1024*1024});
const html=read(origin+'/');
const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^"\s]+\.js)"/g)].map(m=>m[1]);
let key='';
for(const path of assets){
 const js=read(origin+path);
 const found=js.match(/sb_publishable_[A-Za-z0-9_-]+/);
 if(found){key=found[0];break;}
}
if(!key)throw new Error('Public frontend publishable configuration not found; no preview built.');
const r=spawnSync('npm',['run','build'],{stdio:'inherit',env:{...process.env,VITE_SUPABASE_URL:'https://gxmqchznfolerliorpkz.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:key}});
process.exitCode=r.status??1;
