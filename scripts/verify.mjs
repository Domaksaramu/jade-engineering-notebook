import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { root } from './build.mjs';

// No install, git mutation, external network calls, or publication. Stop at the first failing check.
function run(args) {
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
for(const folder of ['src','scripts','tests'])for(const file of (await readdir(path.join(root,folder))).sort())if(/\.(?:js|mjs)$/.test(file))run(['--check',path.join(folder,file)]);
run(['--test']);run(['scripts/build.mjs']);run(['scripts/check.mjs']);
console.log('PASS: syntax → tests → build → static checks. No external publication.');
