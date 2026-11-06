import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, rm, readFile, writeFile, readdir, lstat, symlink, mkdir, realpath } from 'node:fs/promises';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { root, build } from '../scripts/build.mjs';
import { newNote } from '../scripts/content.mjs';
import { createPrivateDraft, reviewDocument, prepareDocument } from '../scripts/editorial.mjs';
import { loadContent } from '../src/content.mjs';
import { saveDocument } from '../src/workspace.mjs';

const run=promisify(execFile);
const complete=()=>newNote('검토 가능한 글').replace('어떤 문제와 판단을 기록할지 한 문장으로 작성하세요.','확인한 실행 경로와 검증의 범위를 기록합니다.').replace('실제로 경험한 상황과 본인의 담당 범위를 작성합니다.','공개 가능한 예제를 직접 작성한 상황입니다.').replace('확인한 사실과 해석을 구분합니다.','입력과 출력의 흐름을 비교해 반복 경로를 확인했습니다.').replace('변경과 검증의 범위, 남은 질문을 작성합니다.','예제에서 중복 경로를 줄였습니다. 실제 운영 성능을 검증한 사례는 아닙니다.');
const approved={factsReviewed:true,privacyReviewed:true,publicationApproved:true,date:'2026-11-06'};
const body=raw=>raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)/)[1];
async function fixture(t) {
 const folder=await realpath(await mkdtemp(path.join(os.tmpdir(),'notebook-editorial-')));
 t.after(()=>rm(folder,{recursive:true,force:true}));
 for(const dir of ['src','content','scripts'])await cp(path.join(root,dir),path.join(folder,dir),{recursive:true});
 return folder;
}
async function candidate(folder,slug='review-example') {
 const file=await createPrivateDraft(folder,slug);await writeFile(file,complete());return file;
}
async function review(folder,slug='review-example',source='private') {return reviewDocument(folder,{slug,source,writeReport:true});}

test('Private drafts are created exclusively outside public content and never built',async t=>{
 const folder=await fixture(t),file=await createPrivateDraft(folder,'private-example');
 assert.equal(file,path.join(folder,'_private/drafts/notes/private-example.md'));
 const raw=await readFile(file,'utf8');assert.match(raw,/draft: true/);
 await assert.rejects(createPrivateDraft(folder,'private-example'),/EEXIST/);
 assert.equal(await readFile(file,'utf8'),raw);
 assert(!(await loadContent(folder,{drafts:true})).some(d=>d.slug==='private-example'));
 await build({projectRoot:folder});
 await assert.rejects(lstat(path.join(folder,'dist/notes/private-example/index.html')),/ENOENT/);
 assert(!(await readFile(path.join(folder,'dist/content-index.json'),'utf8')).includes('private-example'));
 assert.match(await readFile(path.join(root,'.gitignore'),'utf8'),/^_private\/$/m);
});

test('Review reports block templates, explain limitations, and never change the draft',async t=>{
 const folder=await fixture(t),file=await createPrivateDraft(folder,'template'),before=await readFile(file,'utf8');
 const result=await review(folder,'template');
 assert(!result.checksPassed);assert(result.blockers.some(b=>b.code==='template-metadata'));assert(result.blockers.some(b=>b.code==='placeholder'));
 assert.equal(result.humanReviewRequired.length,3);assert.match(result.hash,/^[a-f0-9]{64}$/);
 assert.equal(await readFile(file,'utf8'),before);assert.equal((await readdir(path.join(folder,'_private/reviews'))).length,1);
 await assert.rejects(prepareDocument(folder,{slug:'template',reviewedHash:result.hash,...approved}),/차단/);
});

test('All human checks, a passing report, and the exact source hash are required',async t=>{
 const folder=await fixture(t),file=await candidate(folder),result=await review(folder);
 assert(result.checksPassed);assert(result.warnings.some(w=>w.code==='experience-context'));
 for(const flag of ['factsReviewed','privacyReviewed','publicationApproved'])await assert.rejects(prepareDocument(folder,{slug:'review-example',reviewedHash:result.hash,...approved,[flag]:false}),/명시/);
 await assert.rejects(prepareDocument(folder,{slug:'review-example',...approved}),/SHA-256/);
 await writeFile(file,complete()+'\n원문 변경\n');
 await assert.rejects(prepareDocument(folder,{slug:'review-example',reviewedHash:result.hash,...approved}),/변경/);
 await assert.rejects(lstat(path.join(folder,'content/notes/review-example.md')),/ENOENT/);
 const fresh=await reviewDocument(folder,{slug:'review-example'});
 await assert.rejects(prepareDocument(folder,{slug:'review-example',reviewedHash:fresh.hash,...approved}),/ENOENT/);
});

test('Preparation copies reviewed text, sets an explicit date, and leaves the private original intact',async t=>{
 const folder=await fixture(t),file=await candidate(folder),original=await readFile(file,'utf8'),result=await review(folder);
 await assert.rejects(prepareDocument(folder,{slug:'review-example',reviewedHash:result.hash,...approved,date:'2026-02-30'}),/publishedAt/);
 const prepared=await prepareDocument(folder,{slug:'review-example',reviewedHash:result.hash,...approved});
 assert.equal(prepared.status,'prepared-not-deployed');
 const raw=await readFile(path.join(folder,prepared.file),'utf8');
 assert.equal(body(raw),body(original));assert.match(raw,/draft: false/);assert.match(raw,/publishedAt: "2026-11-06"/);assert(!raw.includes('updatedAt:'));
 assert.equal(await readFile(file,'utf8'),original);
 assert((await loadContent(folder)).some(d=>d.slug==='review-example'));
 await assert.rejects(lstat(path.join(folder,'dist')),/ENOENT/);
 await assert.rejects(lstat(path.join(folder,'.git')),/ENOENT/);
 await assert.rejects(lstat(path.join(folder,'.trash')),/ENOENT/);
});

test('Existing public content cannot be overwritten by a private draft, even after a prior review',async t=>{
 const folder=await fixture(t);await candidate(folder);const result=await review(folder);
 const target=path.join(folder,'content/notes/review-example.md'),raw=complete().replace('검토 가능한 글','기존 원본');await writeFile(target,raw);
 await assert.rejects(prepareDocument(folder,{slug:'review-example',reviewedHash:result.hash,...approved}),/차단/);
 assert.equal(await readFile(target,'utf8'),raw);await assert.rejects(lstat(path.join(folder,'.trash')),/ENOENT/);
 await assert.rejects(saveDocument(folder,'notes','review-example',complete(),{createOnly:true}),/이미/);
 assert.equal(await readFile(target,'utf8'),raw);
});

test('Two create-only writers cannot overwrite each other or leave temporary files',async t=>{
 const folder=await fixture(t),a=complete(),b=complete().replace('검토 가능한 글','두 번째 원본');
 const results=await Promise.allSettled([saveDocument(folder,'notes','competing',a,{createOnly:true}),saveDocument(folder,'notes','competing',b,{createOnly:true})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert([a,b].includes(await readFile(path.join(folder,'content/notes/competing.md'),'utf8')));
 assert(!(await readdir(path.join(folder,'content/notes'))).some(f=>f.endsWith('.tmp')));
});

test('Existing article revisions preserve first publication and back up the source',async t=>{
 const folder=await fixture(t),file=path.join(folder,'content/notes/object-lifetime.md'),original=await readFile(file,'utf8');
 const result=await review(folder,'object-lifetime','content');assert(result.checksPassed);
 await assert.rejects(prepareDocument(folder,{slug:'object-lifetime',source:'content',reviewedHash:result.hash,...approved,date:'2026-11-05'}),/이전/);
 await prepareDocument(folder,{slug:'object-lifetime',source:'content',reviewedHash:result.hash,...approved,date:'2026-11-07'});
 const changed=await readFile(file,'utf8');assert.match(changed,/publishedAt: "2026-11-06"/);assert.match(changed,/updatedAt: "2026-11-07"/);assert.equal(body(changed),body(original));
 const backups=await readdir(path.join(folder,'.trash'));assert.equal(backups.length,1);assert.equal(await readFile(path.join(folder,'.trash',backups[0]),'utf8'),original);
});

test('Credential heuristics block known patterns without echoing values; local examples are warnings',async t=>{
 const folder=await fixture(t),file=await candidate(folder),secret='AKIA'+'A'.repeat(16);
 await writeFile(file,complete()+'\n'+secret+'\nhttp://user:secret@example.com/path\nhttp://127.0.0.1:4321/\n');
 const result=await review(folder);assert(!result.checksPassed);assert(result.blockers.some(b=>b.code==='credential-pattern'));assert(result.blockers.some(b=>b.code==='url-credentials'));assert(result.warnings.some(w=>w.code==='internal-address'));
 const serialized=JSON.stringify(result);assert(!serialized.includes(secret));assert(!serialized.includes('user:secret'));
});

test('Traversal and symlinked private directories/files/reports are rejected',async t=>{
 const folder=await fixture(t);await assert.rejects(createPrivateDraft(folder,'../escape'));
 await assert.rejects(reviewDocument(folder,{slug:'safe',source:'../outside'}));
 const file=await candidate(folder),outside=path.join(folder,'outside.md');await writeFile(outside,complete());
 await rm(file);await symlink(outside,file);await assert.rejects(review(folder),/일반/);
 await rm(file);await writeFile(file,complete());
 const result=await review(folder),reportFolder=path.join(folder,'_private/reviews'),[report]=await readdir(reportFolder);
 await rm(path.join(reportFolder,report));await symlink(outside,path.join(reportFolder,report));
 await assert.rejects(prepareDocument(folder,{slug:'review-example',reviewedHash:result.hash,...approved}),/일반/);
 await rm(path.join(folder,'_private'),{recursive:true});await mkdir(path.join(folder,'outside-directory'));await symlink(path.join(folder,'outside-directory'),path.join(folder,'_private'));
 await assert.rejects(createPrivateDraft(folder,'escape'),/심볼릭/);
 assert.deepEqual(await readdir(path.join(folder,'outside-directory')),[]);
});

test('CLI keeps nonzero failure status and rejects unknown or duplicated flags without writes',async t=>{
 const folder=await fixture(t),script=path.join(folder,'scripts/editorial.mjs');
 for(const args of [['draft','../bad'],['review','safe','--source','private','--source','content'],['prepare','safe','--auto-push'],['draft','cases/safe']])await assert.rejects(run(process.execPath,[script,...args]));
 await run(process.execPath,[script,'draft','cli-example']);
 await assert.rejects(run(process.execPath,[script,'review','cli-example']),error=>{assert.equal(error.code,1);assert.equal(JSON.parse(error.stdout).checksPassed,false);return true;});
 await assert.rejects(lstat(path.join(folder,'content/notes/cli-example.md')),/ENOENT/);
});

test('Preparation revalidates project connections even when the candidate hash is unchanged',async t=>{
 const folder=await fixture(t),file=await candidate(folder),docs=await loadContent(folder),target=docs.find(d=>d.slug==='auth-cache');
 const meta={company:target.company,project:target.project,role:'검토용 예제',journey:target.journey,relatedCases:[target.slug]};
 await writeFile(file,complete().replace('draft: true',Object.entries(meta).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join('\n')+'\ndraft: true'));
 const result=await review(folder);assert(result.checksPassed);
 const publicCase=path.join(folder,'content/cases/auth-cache.md');await writeFile(publicCase,(await readFile(publicCase,'utf8')).replace(/^project: .+$/m,'project: "변경된 프로젝트"'));
 await assert.rejects(prepareDocument(folder,{slug:'review-example',reviewedHash:result.hash,...approved}),/차단/);
 await assert.rejects(lstat(path.join(folder,'content/notes/review-example.md')),/ENOENT/);
});

test('The verify command stops on syntax failure before tests or build mutation',async t=>{
 const folder=await fixture(t);await writeFile(path.join(folder,'src/app.js'),'function {');
 await assert.rejects(run(process.execPath,[path.join(folder,'scripts/verify.mjs')]),error=>{assert.notEqual(error.code,0);assert.match(error.stderr,/SyntaxError/);return true;});
 await assert.rejects(lstat(path.join(folder,'dist')),/ENOENT/);
});

test('CLI JSON review and explicit preparation work end to end without git or deployment',async t=>{
 const folder=await fixture(t),script=path.join(folder,'scripts/editorial.mjs');
 await candidate(folder,'cli-complete');
 const {stdout}=await run(process.execPath,[script,'review','cli-complete']),report=JSON.parse(stdout);assert(report.checksPassed);
 const prepared=await run(process.execPath,[script,'prepare','cli-complete','--review',report.hash,'--date','2026-11-06','--facts-reviewed','--privacy-reviewed','--publication-approved']);
 assert.equal(JSON.parse(prepared.stdout).status,'prepared-not-deployed');
 assert.match(await readFile(path.join(folder,'content/notes/cli-complete.md'),'utf8'),/publishedAt: "2026-11-06"/);
 await assert.rejects(lstat(path.join(folder,'.git')),/ENOENT/);await assert.rejects(lstat(path.join(folder,'dist')),/ENOENT/);
});
