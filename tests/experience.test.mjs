import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, cp, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseDocument, loadContent } from '../src/content.mjs';
import { journeys, relatedDocuments } from '../src/experience.mjs';
import { article, writing, journeyPage, home } from '../src/pages.mjs';
import { build, root } from '../scripts/build.mjs';
import { newNote } from '../scripts/content.mjs';
import { saveDocument, deleteDocument } from '../src/workspace.mjs';

const context='company: "다우기술"\nproject: "공통 기반 프로젝트"\nrole: "공통파트 PL"\njourney: "shared-foundation"\n';
const noteRaw=(extra='')=>newNote('기술 글').replace('draft: true',context+extra+'draft: false');
const caseRaw=()=>noteRaw('result: "구조 개선"\nscope: "담당 범위"\n');
async function fixture(t) {
  const folder=await mkdtemp(path.join(os.tmpdir(),'notebook-experience-'));
  t.after(()=>rm(folder,{recursive:true,force:true}));
  for(const kind of ['cases','notes'])await mkdir(path.join(folder,'content',kind),{recursive:true});
  return folder;
}

test('Career metadata is optional for general notes, but typed and complete when connected',()=>{
  assert.equal(parseDocument(newNote(),'general','notes').journey,undefined);
  assert.equal(parseDocument(noteRaw(),'connected','notes').project,'공통 기반 프로젝트');
  for(const raw of [noteRaw().replace('shared-foundation','unknown'),noteRaw().replace('project: "공통 기반 프로젝트"\n',''),noteRaw().replace('role: "공통파트 PL"','role: 42'),noteRaw('relatedCases: "sample"\n'),noteRaw('relatedCases: ["../escape"]\n'),noteRaw('relatedCases: ["same", "same"]\n')])assert.throws(()=>parseDocument(raw,'invalid','notes'));
  assert.throws(()=>parseDocument(caseRaw().replace('draft: false','relatedCases: ["sample"]\ndraft: false'),'case','cases'));
});

test('Explicit project links are reciprocal; broader journey links are separate; drafts never leak',()=>{
  const example=parseDocument(caseRaw(),'example','cases');
  const note=parseDocument(noteRaw('relatedCases: ["example"]\n'),'reflection','notes');
  const another=parseDocument(noteRaw().replace('공통 기반 프로젝트','다른 프로젝트'),'another','notes');
  const draft={...another,slug:'private',title:'비공개 제목',draft:true};
  const docs=[example,note,another,draft];
  assert.deepEqual(relatedDocuments(example,docs).project.map(d=>d.slug),['reflection']);
  assert.deepEqual(relatedDocuments(note,docs).project.map(d=>d.slug),['example']);
  assert.deepEqual(relatedDocuments(example,docs).journey.map(d=>d.slug),['another']);
  const html=article(example,docs);
  assert.match(html,/이 프로젝트의 기술 글/);assert.match(html,/같은 경력 흐름의 다른 글/);
  assert.match(html,/href="\.\.\/\.\.\/notes\/reflection\/"/);assert(!html.includes('비공개 제목'));
  const noteHtml=article(note,docs);assert.match(noteHtml,/이 글의 프로젝트 사례/);assert.match(noteHtml,/담당 범위/);
  assert.match(noteHtml,/공통파트 PL/);assert.match(noteHtml,/프로젝트<\/span>/);
});

test('Dangling, cross-journey and different-project links fail before publication',async t=>{
  const folder=await fixture(t);
  const target=path.join(folder,'content/cases/example.md');
  const note=path.join(folder,'content/notes/reflection.md');
  await writeFile(note,noteRaw('relatedCases: ["example"]\n'));
  await assert.rejects(loadContent(folder),/example/);
  await writeFile(target,caseRaw().replace('shared-foundation','financial-integration'));
  await assert.rejects(loadContent(folder),/경력 흐름/);
  await writeFile(target,caseRaw().replace('공통 기반 프로젝트','다른 프로젝트'));
  await assert.rejects(loadContent(folder),/프로젝트/);
  await writeFile(target,caseRaw().replace('다우기술','다른 회사'));
  await assert.rejects(loadContent(folder),/회사/);
  await writeFile(target,caseRaw());assert.equal((await loadContent(folder)).length,2);
  await writeFile(target,caseRaw().replace('draft: false','draft: true'));
  const docs=await loadContent(folder);assert.equal(docs.length,1);
  assert.deepEqual(relatedDocuments(docs[0],docs).project,[]);
});

test('Real career content keeps 2020 integration distinct from the 2022 renewal',async()=>{
  const docs=await loadContent(root);
  const note=docs.find(d=>d.slug==='local-financial-integration');
  assert.equal(note.journey,'shared-foundation');assert.equal(note.project,'차세대 소비자금융 리뉴얼');
  assert.deepEqual(relatedDocuments(note,docs).project,[]);
  assert(!relatedDocuments(note,docs).journey.some(d=>d.slug==='financial-integration'));
  assert.deepEqual(relatedDocuments(docs.find(d=>d.slug==='auth-cache'),docs).project.map(d=>d.slug),['object-lifetime']);
  assert.deepEqual(relatedDocuments(docs.find(d=>d.slug==='platform-operations'),docs).project.map(d=>d.slug),['after-deployment']);
});

test('Editor rejects changes that break project links before touching sources or backups',async t=>{
  const folder=await fixture(t),target=path.join(folder,'content/cases/example.md');
  await writeFile(target,caseRaw());
  const raw=noteRaw('relatedCases: ["example"]\n');
  await writeFile(path.join(folder,'content/notes/reflection.md'),raw);
  await assert.rejects(saveDocument(folder,'cases','example',caseRaw().replace('공통 기반 프로젝트','다른 프로젝트')),/프로젝트/);
  assert.equal(await readFile(target,'utf8'),caseRaw());
  await assert.rejects(deleteDocument(folder,'cases','example'),/example/);
  assert.equal(await readFile(target,'utf8'),caseRaw());
  await assert.rejects(stat(path.join(folder,'.trash')),{code:'ENOENT'});
  // A bad reference introduced by an external text editor can still be repaired.
  await writeFile(path.join(folder,'content/notes/reflection.md'),raw.replace('["example"]','["missing"]'));
  await saveDocument(folder,'notes','reflection',raw);
  assert.equal((await loadContent(folder)).length,2);
});

test('Career journey navigation is static, searchable by context, escaped and has an empty state',async()=>{
  const docs=await loadContent(root);const html=writing(docs);
  for(const journey of journeys){assert(html.includes(`href="../${journey.href}"`));assert(home(docs).includes(`href="${journey.href}"`));}
  assert.match(html,/data-search="[^"]*차세대 소비자금융 리뉴얼/);
  assert.match(html,/class="note-project"/);
  const unsafe={...docs.find(d=>d.kind==='notes'),company:'<img src=x>',project:'<script>test</script>'};
  const rendered=article(unsafe,[unsafe]);assert(!rendered.includes('<img src=x>'));assert(rendered.includes('&lt;script&gt;test&lt;/script&gt;'));
  const empty=journeyPage(journeys[0],[]);assert.match(empty,/아직 공개된/);assert.match(empty,/다른 경력 흐름/);
  const withDraft=journeyPage(journeys[0],[{...unsafe,journey:journeys[0].id,draft:true,title:'숨겨야 할 제목'}]);assert(!withDraft.includes('숨겨야 할 제목'));
});

test('Build publishes journey pages and sitemap without leaking draft context',async t=>{
  const folder=await fixture(t);
  for(const dir of ['src','content'])await cp(path.join(root,dir),path.join(folder,dir),{recursive:true});
  await writeFile(path.join(folder,'content/notes/private.md'),noteRaw().replace('기술 글','숨겨야 할 제목').replace('공통 기반 프로젝트','비공개 프로젝트').replace('draft: false','draft: true'));
  await build({projectRoot:folder,siteUrl:'https://example.github.io/notebook'});
  const sitemap=await readFile(path.join(folder,'dist/sitemap.xml'),'utf8');
  for(const journey of journeys){
    const html=await readFile(path.join(folder,'dist',journey.href,'index.html'),'utf8');
    assert.equal((html.match(/<h1[ >]/g)||[]).length,1);assert(html.includes(journey.title));
    assert(!html.includes('숨겨야 할 제목'));assert(!html.includes('비공개 프로젝트'));
    assert(sitemap.includes(`https://example.github.io/notebook/${journey.href}`));
  }
});
