import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { root } from './build.mjs';
import { loadContent } from '../src/content.mjs';

const base=path.join(root,'dist');
async function walk(folder) {const result=[];for(const name of await readdir(folder)){const file=path.join(folder,name);if((await stat(file)).isDirectory())result.push(...await walk(file));else result.push(file);}return result;}
const files=await walk(base), pages=files.filter(f=>f.endsWith('.html'));let links=0;
const docs=await loadContent(root,{drafts:true});
for(const page of pages) {
  const html=await readFile(page,'utf8');assert.equal((html.match(/<h1[ >]/g)||[]).length,1,page+': h1');
  assert.match(html,/<html lang="ko">/);assert.match(html,/<title>[^<]+<\/title>/);
  assert(!/undefined|\[object Object\]|TODO|Lorem ipsum/.test(html),page+': placeholder');
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href=match[1];if(/^(https?:|mailto:|data:)/.test(href))continue;
    const [url,fragment]=href.split('#');let file=url.startsWith('/')?path.join(base,url):path.resolve(path.dirname(page),url||'.');
    if(!url)file=page;
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    assert(file.startsWith(base+path.sep),href+': outside dist');
    await stat(file);links++;
    if(fragment && file.endsWith('.html'))assert((await readFile(file,'utf8')).includes(`id="${fragment}"`),href+': missing anchor');
  }
}
for(const doc of docs.filter(d=>d.draft))assert(!files.includes(path.join(base,doc.href,'index.html')),'draft leakage');
assert(!files.some(f=>f.includes('studio')||f.includes('content/cases')||f.includes('.trash')),'private source leakage');
assert.equal(pages.length,docs.filter(d=>!d.draft).length+3);
console.log(`PASS: ${pages.length} pages, ${links} local links/assets, draft exclusion, editor exclusion, Korean metadata.`);
