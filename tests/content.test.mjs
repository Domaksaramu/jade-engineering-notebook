import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseDocument, markdown, inline, validSlug, loadContent } from '../src/content.mjs';
import { saveDocument, deleteDocument, documentPath } from '../src/workspace.mjs';
import { newNote, createNote } from '../scripts/content.mjs';
import { allowedRequest } from '../scripts/dev.mjs';

test('Markdown headings, lists, table and literal code remain readable',()=>{
  const html=markdown('## 제목\n\n**핵심**과 `code`\n\n- 첫째\n- 둘째\n\n| 범위 | 결과 |\n|---|---|\n| 개발 | 통과 |\n\n```text\n<script>x</script>\n```');
  assert.match(html,/<h2 id="section-0">제목/);assert.match(html,/<strong>핵심/);assert.match(html,/<ul><li>첫째/);assert.match(html,/<table>/);assert.match(html,/&lt;script&gt;/);assert(!html.includes('<script>'));
});
test('Unsafe HTML and URL schemes never become executable',()=>{
  for(const source of ['<img src=x onerror=alert(1)>','[x](javascript:alert)','[x](data:text/html,test)','[x](//evil.test)','[x](https://a.test/"onclick="x)']) {
    const html=inline(source);assert(!html.includes('<img'));assert(!html.includes('href="javascript:'));assert(!html.includes('href="data:'));assert(!html.includes('href="//'));assert(!html.includes('"onclick="'));
  }
});
test('Metadata is explicit; unknown paths and duplicate keys are rejected',()=>{
  const raw=newNote('테스트');assert.equal(parseDocument(raw,'test-note','notes').draft,true);
  assert.throws(()=>parseDocument(raw,'../escape','notes'));assert.throws(()=>parseDocument(raw,'valid','bad'));
  assert.throws(()=>parseDocument(raw.replace('draft: true','draft: "true"'),'test','notes'));
  assert.throws(()=>parseDocument(raw.replace('draft: true','draft: true\ndraft: false'),'test','notes'));
  assert(!validSlug('x/y'));assert(!validSlug('..'));assert(validSlug('my-story-2'));
});
async function fixture(t) {const root=await mkdtemp(path.join(os.tmpdir(),'portfolio-test-'));t.after(()=>rm(root,{recursive:true,force:true}));for(const kind of ['cases','notes'])await mkdir(path.join(root,'content',kind),{recursive:true});return root;}
test('Create, edit, backup, delete and draft exclusion operate on real files',async t=>{
  const root=await fixture(t);await createNote(root,'sample');
  assert.equal((await loadContent(root)).length,0);assert.equal((await loadContent(root,{drafts:true})).length,1);
  const changed=newNote('수정된 제목').replace('draft: true','draft: false');await saveDocument(root,'notes','sample',changed);
  assert.equal((await loadContent(root))[0].title,'수정된 제목');
  const backups=await readdir(path.join(root,'.trash'));assert.equal(backups.length,1);assert.match(await readFile(path.join(root,'.trash',backups[0]),'utf8'),/새 경험의 제목/);
  const trash=await deleteDocument(root,'notes','sample');assert.equal(await readFile(path.join(root,'.trash',trash),'utf8'),changed);assert.equal((await loadContent(root)).length,0);
});
test('Invalid edit does not overwrite the previous source',async t=>{
  const root=await fixture(t);await createNote(root,'sample');const file=await documentPath(root,'notes','sample');const previous=await readFile(file,'utf8');
  await assert.rejects(saveDocument(root,'notes','sample','bad markdown'));assert.equal(await readFile(file,'utf8'),previous);
  await assert.rejects(saveDocument(root,'notes','sample','x'.repeat(200_001)));
  await assert.rejects(createNote(root,'sample'));
});
test('Traversal and symbolic link targets are rejected',async t=>{
  const root=await fixture(t);await assert.rejects(documentPath(root,'notes','../outside'));
  const outside=path.join(root,'outside.md');await writeFile(outside,'original');await symlink(outside,path.join(root,'content/notes/link.md'));
  await assert.rejects(saveDocument(root,'notes','link',newNote()));assert.equal(await readFile(outside,'utf8'),'original');
});
test('Local write access requires matching Host, Origin, JSON and CSRF token',()=>{
  const token='a'.repeat(64),port=4321,headers={host:'127.0.0.1:4321',origin:'http://127.0.0.1:4321','content-type':'application/json','x-csrf-token':token};
  const allowed=(h)=>allowedRequest({headers:h},port,{write:true,token});assert(allowed(headers));
  for(const patch of [{host:'evil.test'},{origin:'https://evil.test'},{origin:'http://localhost:4321'},{origin:undefined},{'sec-fetch-site':'cross-site'},{'content-type':'text/plain'},{'x-csrf-token':'b'.repeat(64)}]) assert(!allowed({...headers,...patch}));
});
