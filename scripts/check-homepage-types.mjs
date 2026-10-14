import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const base = '208ee5c296f023380a39198dc55aff6ff335fddc';
const dir = mkdtempSync(join(tmpdir(),'lourex-types-'));
try {
 const archive = execFileSync('git',['archive',base],{maxBuffer:100*1024*1024});
 const unpack = spawnSync('tar',['-x','-C',dir],{input:archive});
 if(unpack.status)throw new Error('Unable to prepare baseline');
 symlinkSync(resolve('node_modules'),join(dir,'node_modules'),'dir');
 const check = cwd => {
  const r=spawnSync(process.execPath,[resolve('node_modules/typescript/bin/tsc'),'--noEmit','-p','tsconfig.app.json','--pretty','false'],{cwd,encoding:'utf8',maxBuffer:10*1024*1024});
  if(r.error)throw r.error;
  return r.stdout+r.stderr;
 };
 const baseline=check(dir), current=check(process.cwd());
 writeFileSync('homepage-types-baseline.txt',baseline);
 writeFileSync('homepage-types-current.txt',current);
 const diagnostics=s=>s.split('\n').filter(l=>/error TS\d+/.test(l));
 const before=new Set(diagnostics(baseline));
 const added=diagnostics(current).filter(l=>!before.has(l));
 console.log(`Baseline: ${before.size} existing TypeScript diagnostics; branch: ${diagnostics(current).length}; new: ${added.length}`);
 if(added.length){console.error(added.join('\n'));process.exitCode=1;}
} finally {rmSync(dir,{recursive:true,force:true});}
