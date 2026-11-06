import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { root, siteLocation } from './build.mjs';
import { loadContent } from '../src/content.mjs';
import { journeys } from '../src/experience.mjs';
import { assertSocialPng } from '../src/social.mjs';

const base=path.join(root,'dist');
const { prefix, address } = siteLocation();
async function walk(folder) {const result=[];for(const name of await readdir(folder)){const file=path.join(folder,name);if((await stat(file)).isDirectory())result.push(...await walk(file));else result.push(file);}return result;}
const files=await walk(base), pages=files.filter(f=>f.endsWith('.html'));let links=0;
const docs=await loadContent(root,{drafts:true});
for(const page of pages) {
  const html=await readFile(page,'utf8');assert.equal((html.match(/<h1[ >]/g)||[]).length,1,page+': h1');
  assert.match(html,/<html lang="ko">/);assert.match(html,/<title>[^<]+<\/title>/);
  assert(!/undefined|\[object Object\]|TODO|Lorem ipsum/.test(html),page+': placeholder');
  const canonical=/<link rel="canonical" href="([^"]+)">/.exec(html)?.[1];
  if(page===path.join(base,'404.html'))assert(!canonical,page+': 404 must not be canonical');
  else {
    const route=path.relative(base,path.dirname(page)).split(path.sep).filter(Boolean).join('/');
    assert.equal(canonical,`${address}/${route?route+'/':''}`,page+': canonical');
    assert(html.includes(`property="og:url" content="${canonical}"`),page+': sharing URL');
    const image=/<meta property="og:image" content="([^"]+)">/.exec(html)?.[1];
    assert(image?.startsWith(`${address}/social/`),page+': sharing image under site base');
    assertSocialPng(await readFile(path.join(base,image.slice(address.length+1))));
    const data=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1];
    if(data)assert.equal(JSON.parse(data).mainEntityOfPage,canonical,page+': structured article URL');
  }
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href=match[1];if(/^(https?:|mailto:|data:)/.test(href))continue;
    const [url,fragment]=href.split('#');
    if(url.startsWith('/'))assert(url.startsWith(prefix),href+': outside site prefix');
    let file=url.startsWith('/')?path.join(base,url.slice(prefix.length)):path.resolve(path.dirname(page),url||'.');
    if(!url)file=page;
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    assert(file.startsWith(base+path.sep),href+': outside dist');
    await stat(file);links++;
    if(fragment && file.endsWith('.html'))assert((await readFile(file,'utf8')).includes(`id="${fragment}"`),href+': missing anchor');
  }
}
for(const doc of docs.filter(d=>d.draft))assert(!files.includes(path.join(base,doc.href,'index.html')),'draft leakage');
assert(!files.some(f=>f.includes('studio')||f.includes('content/cases')||f.includes('.trash')),'private source leakage');
assert.equal(pages.length,docs.filter(d=>!d.draft).length+3+journeys.length);
console.log(`PASS: ${pages.length} pages, ${links} local links/assets, canonical/PNG/JSON-LD, draft exclusion, editor exclusion, Korean metadata.`);
