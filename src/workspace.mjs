import { readFile, writeFile, rename, mkdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { kinds, validSlug, parseDocument } from './content.mjs';

export async function documentPath(root,kind,slug) {
  if(!kinds.includes(kind)||!validSlug(slug)) throw new Error('허용되지 않는 글 경로입니다.');
  const parent=path.join(root,'content',kind);
  for(const directory of [path.join(root,'content'),parent]) if((await lstat(directory)).isSymbolicLink()) throw new Error('심볼릭 링크는 허용하지 않습니다.');
  const target=path.join(parent,`${slug}.md`);
  const stat=await lstat(target).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  if(stat?.isSymbolicLink()) throw new Error('심볼릭 링크는 허용하지 않습니다.');
  return target;
}
export async function backupDocument(root,kind,slug,source) {
  const folder=path.join(root,'.trash');await mkdir(folder,{recursive:true});
  if((await lstat(folder)).isSymbolicLink()) throw new Error('휴지통 경로가 올바르지 않습니다.');
  const backup=path.join(folder,`${Date.now()}-${randomUUID()}-${kind}-${slug}.md`);
  await writeFile(backup,source,{flag:'wx'});return path.basename(backup);
}
export async function saveDocument(root,kind,slug,raw) {
  if(typeof raw!=='string'||Buffer.byteLength(raw)>200_000)throw new Error('글은 UTF-8 기준 200KB 이내여야 합니다.');
  parseDocument(raw,slug,kind);
  const target=await documentPath(root,kind,slug);
  const previous=await readFile(target,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  if(previous!==null)await backupDocument(root,kind,slug,previous);
  const temporary=target+`.${randomUUID()}.tmp`;
  await writeFile(temporary,raw,{flag:'wx'});await rename(temporary,target);
}
export async function deleteDocument(root,kind,slug) {
  const target=await documentPath(root,kind,slug);const raw=await readFile(target,'utf8');
  // Moving rather than unlinking keeps the exact source recoverable.
  const folder=path.join(root,'.trash');await mkdir(folder,{recursive:true});
  if((await lstat(folder)).isSymbolicLink())throw new Error('휴지통 경로가 올바르지 않습니다.');
  const name=`${Date.now()}-${randomUUID()}-${kind}-${slug}.md`;
  await rename(target,path.join(folder,name));return name;
}
