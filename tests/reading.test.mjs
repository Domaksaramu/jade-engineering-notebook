import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parseDocument, loadContent } from '../src/content.mjs';
import { article } from '../src/pages.mjs';
import { seoTags } from '../src/seo.mjs';
import { socialKey, socialFingerprint, socialCard, assertSocialPng } from '../src/social.mjs';
import { saveDocument } from '../src/workspace.mjs';
import { newNote } from '../scripts/content.mjs';
import { build, root } from '../scripts/build.mjs';

const dated=(fields='publishedAt: "2026-11-06"')=>newNote('날짜 테스트').replace('draft: true',`${fields}\ndraft: false`);
async function fixture(t) {
  const folder=await mkdtemp(path.join(os.tmpdir(),'notebook-reading-'));
  t.after(()=>rm(folder,{recursive:true,force:true}));
  for(const dir of ['src','content'])await cp(path.join(root,dir),path.join(folder,dir),{recursive:true});
  return folder;
}

test('Publication dates are explicit real calendar dates, with ordered optional revisions',()=>{
  assert.equal(parseDocument(newNote(),'undated','notes').publishedAt,undefined);
  assert.equal(parseDocument(dated('publishedAt: "2024-02-29"\nupdatedAt: "2026-11-06"'),'dated','notes').updatedAt,'2026-11-06');
  for(const fields of ['publishedAt: "2026-02-29"','publishedAt: "2026-04-31"','publishedAt: "2026-1-1"','publishedAt: "2026-11-06T09:00:00Z"','publishedAt: 2026','updatedAt: "2026-11-06"','publishedAt: "2026-11-06"\nupdatedAt: "2026-11-05"'])assert.throws(()=>parseDocument(dated(fields),'invalid','notes'),/publishedAt|updatedAt/);
});

test('The editor rejects invalid dates without changing source or creating a backup',async t=>{
  const folder=await fixture(t),file=path.join(folder,'content/notes/date-example.md'),raw=dated();
  await writeFile(file,raw);
  await assert.rejects(saveDocument(folder,'notes','date-example',dated('publishedAt: "2026-02-30"')));
  assert.equal(await readFile(file,'utf8'),raw);
  await assert.rejects(readdir(path.join(folder,'.trash')),/ENOENT/);
});

test('Visible publication metadata is separate from experience, and revisions are not invented',()=>{
  const doc=parseDocument(dated(),'dates','notes'),html=article(doc,[doc]);
  assert.match(html,/<div class="article-dates"><span>발행 <time datetime="2026-11-06">2026\.11\.06<\/time>/);
  assert.match(html,/경험 시기/);assert(!html.includes('<span>수정 '));
  assert(!article({...doc,publishedAt:undefined},[]).includes('class="article-dates"'));
  assert(!article({...doc,updatedAt:doc.publishedAt},[]).includes('<span>수정 '));
  assert.match(article({...doc,updatedAt:'2026-11-07'},[]),/<span>수정 <time datetime="2026-11-07">/);
});

test('Both TOCs use real h2 anchors and ignore headings inside code fences',()=>{
  const doc=parseDocument(dated()+'\n```text\n## fake\n```\n\n### Detail\n\n## Real\n','toc','notes'),html=article(doc,[doc]);
  const mobile=/<details class="mobile-toc">([\s\S]*?)<\/details>/.exec(html)[1];
  assert.match(mobile,/<summary>이 글의 목차/);assert(!mobile.includes('fake'));assert(!mobile.includes('Detail'));
  for(const [,id] of mobile.matchAll(/href="#([^"]+)"/g))assert(html.includes(`id="${id}"`));
  assert.equal((mobile.match(/<a /g)||[]).length,4);
  assert(!article({...doc,toc:[]},[]).includes('class="mobile-toc"'));
});

test('Article structured data cannot escape its JSON script and omits unknown dates',()=>{
  const title='</script><script>alert(1)</script>',html=seoTags({title,description:'"quoted" & text',article:true,canonical:'https://example.com/article/',image:'https://example.com/card.png',imageAlt:'<title>'});
  assert.equal((html.match(/<script/g)||[]).length,1);
  const data=JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
  assert.equal(data.headline,title);assert.equal(data.datePublished,undefined);assert.equal(data.dateModified,undefined);
  assert.match(html,/content="&lt;title&gt;"/);
});

test('Build supplies per-page canonical/PNG metadata, RSS dates and explicit sitemap dates at any base path',async t=>{
  const folder=await fixture(t),file=path.join(folder,'content/notes/object-lifetime.md');
  await writeFile(file,(await readFile(file,'utf8')).replace('draft: false','updatedAt: "2026-11-07"\ndraft: false'));
  const docs=await build({projectRoot:folder,siteUrl:'https://example.com/nested/notebook/'}),base=path.join(folder,'dist');
  const routes=['','writing/','journey/shared-foundation/',...docs.map(d=>d.href)];
  const images=new Set();
  for(const route of routes) {
    const html=await readFile(path.join(base,route,'index.html'),'utf8'),canonical=`https://example.com/nested/notebook/${route}`;
    assert(html.includes(`<link rel="canonical" href="${canonical}">`));assert(html.includes(`property="og:url" content="${canonical}"`));
    const image=/property="og:image" content="([^"]+)"/.exec(html)[1];assert(image.startsWith('https://example.com/nested/notebook/social/'));
    assertSocialPng(await readFile(path.join(base,image.split('/notebook/')[1])));
    if(route.startsWith('notes/')||route.startsWith('cases/')) {
      images.add(image);const data=JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
      assert.equal(data.datePublished,'2026-11-06');assert.equal(data.mainEntityOfPage,canonical);
    }
  }
  assert.equal(images.size,6);
  const xml=await readFile(path.join(base,'sitemap.xml'),'utf8');assert.match(xml,/<loc>https:\/\/example.com\/nested\/notebook\/notes\/object-lifetime\/<\/loc><lastmod>2026-11-07<\/lastmod>/);
  assert.equal((xml.match(/<lastmod>/g)||[]).length,6);
  assert.equal(((await readFile(path.join(base,'feed.xml'),'utf8')).match(/<pubDate>Fri, 06 Nov 2026 00:00:00 GMT<\/pubDate>/g)||[]).length,3);
  const missing=await readFile(path.join(base,'404.html'),'utf8');assert(!missing.includes('rel="canonical"'));assert(!missing.includes('property="og:image"'));assert.match(missing,/noindex,nofollow/);
});

test('Changed/new titles fall back to the generic image, while private draft cards never ship',async t=>{
  const folder=await fixture(t),file=path.join(folder,'content/notes/object-lifetime.md');
  await writeFile(file,(await readFile(file,'utf8')).replace(/title: .+/, 'title: "새로운 제목"'));
  const privateDoc=parseDocument(newNote('PRIVATE-CARD-SECRET'),'private-card','notes');
  await writeFile(path.join(folder,'content/notes/private-card.md'),newNote('PRIVATE-CARD-SECRET'));
  const manifestPath=path.join(folder,'src/social/manifest.json'),manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  manifest[socialKey(privateDoc)]=socialFingerprint(privateDoc);await writeFile(manifestPath,JSON.stringify(manifest));
  await cp(path.join(folder,'src/social/notebook.png'),path.join(folder,'src/social/notes-private-card.png'));
  await build({projectRoot:folder});
  const html=await readFile(path.join(folder,'dist/notes/object-lifetime/index.html'),'utf8');
  assert.match(html,/property="og:image" content="[^"]+\/notebook-[a-f0-9]+\.png"/);assert.match(html,/<title>새로운 제목/);
  const files=await readdir(path.join(folder,'dist/social'));assert(!files.some(f=>f.includes('private-card')||f.includes('object-lifetime')));
  for(const route of ['content-index.json','sitemap.xml','feed.xml'])assert(!(await readFile(path.join(folder,'dist',route),'utf8')).includes('PRIVATE-CARD-SECRET'));
});

test('Social rendering escapes source text; invalid PNGs fail before removing a good build',async t=>{
  assert(!socialCard({title:'<script>bad</script>',category:'<img>',kind:'notes'}).includes('<script>'));
  assert.throws(()=>assertSocialPng(Buffer.from('not a PNG')));
  const folder=await fixture(t);await build({projectRoot:folder});
  const before=await readFile(path.join(folder,'dist/index.html'),'utf8');
  await writeFile(path.join(folder,'src/social/notebook.png'),'invalid');
  await assert.rejects(build({projectRoot:folder}),/1200×630/);
  assert.equal(await readFile(path.join(folder,'dist/index.html'),'utf8'),before);
});
