import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, mkdtemp, cp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import * as content from '../src/content.mjs';
import { home, writing, journeyPage } from '../src/pages.mjs';
import { journeys } from '../src/experience.mjs';
import { build, root } from '../scripts/build.mjs';
import { newNote } from '../scripts/content.mjs';

const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
function browser(url='https://example.test/blogs/writing/',withSearch=true) {
  let current=new URL(url),writes=0;
  const node=(extra={})=>({listeners:{},attributes:{},hidden:false,addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(name,value){this.attributes[name]=value;},fire(name){this.listeners[name]?.({preventDefault(){}});},...extra});
  const search=node({value:''}),counter=node(),empty=node({hidden:true});
  const rows=[node({dataset:{category:'성능과 연동',search:'트랜잭션 db 금융'}}),node({dataset:{category:'장애에서 배운 것',search:'cpu heap 캐시'}})];
  const buttons=['all','성능과 연동','장애에서 배운 것'].map(filter=>node({dataset:{filter}}));
  const events={},state={preserved:true};
  const location={get href(){return current.href;},get search(){return current.search;}};
  const document={querySelector:s=>({'#search':withSearch?search:null,'#search-count':counter,'#empty-state':empty})[s]||null,querySelectorAll:s=>s==='[data-note]'?rows:s==='[data-filter]'?buttons:[]};
  const history={state,replaceState(value,unused,url){assert.equal(value,state);writes++;current=new URL(url,current);}};
  vm.runInNewContext(app,{document,window:{addEventListener(name,fn){events[name]=fn;}},location,history,URL,URLSearchParams});
  return {search,counter,empty,rows,buttons,events,get url(){return current;},get writes(){return writes;},navigate(url){current=new URL(url,current);},visible:()=>rows.filter(r=>!r.hidden)};
}

test('Published notes sort by publication, not revisions; ties and unknown dates stay deterministic',()=>{
  const note=(slug,extra={})=>({kind:'notes',slug,draft:false,...extra});
  const input=[note('old',{publishedAt:'2026-11-06',updatedAt:'2026-12-01',order:1}),note('undated',{order:0}),note('new',{publishedAt:'2026-11-07',order:99}),note('tie-b',{publishedAt:'2026-11-06',order:2}),note('tie-a',{publishedAt:'2026-11-06',order:2}),note('private',{draft:true,publishedAt:'2027-01-01'}),{kind:'cases',slug:'case',draft:false}];
  const original=[...input];
  assert.deepEqual(content.publishedNotes(input).map(d=>d.slug),['new','old','tie-a','tie-b','undated']);
  assert.deepEqual(input,original);
});

test('Home, note list, career journey and RSS put the same latest note first without changing featured cases',async t=>{
  const folder=await mkdtemp(path.join(os.tmpdir(),'notebook-discovery-'));t.after(()=>rm(folder,{recursive:true,force:true}));
  for(const dir of ['src','content'])await cp(path.join(root,dir),path.join(folder,dir),{recursive:true});
  await writeFile(path.join(folder,'content/notes/latest-example.md'),newNote('Latest publication example').replace(/^order: .+\n/m,'').replace('draft: true','publishedAt: "2026-12-01"\norder: 99\ndraft: false'));
  const docs=await build({projectRoot:folder});
  const newest=docs.find(d=>d.slug==='latest-example'),other=docs.find(d=>d.kind==='notes'&&d.slug!=='latest-example');
  for(const html of [home(docs),writing(docs),journeyPage(journeys[0],[{...newest,journey:journeys[0].id},{...other,journey:journeys[0].id}])]) {
    const links=[...html.matchAll(/<article class="note-row"[\s\S]*?<h3><a href="([^"]+)"/g)].map(m=>m[1]);
    assert(links[0].includes('latest-example'),links[0]);
  }
  const feed=await readFile(path.join(folder,'dist/feed.xml'),'utf8');assert.match(feed,/<item><title>Latest publication example<\/title>/);
  assert(feed.indexOf('Latest publication example')<feed.indexOf(`<item><title>${content.escape(other.title)}</title>`));
  const featured=/<article class="featured-case">[\s\S]*?<h3><a href="([^"]+)"/.exec(home(docs))[1];assert.equal(featured,'cases/auth-cache/');
});

test('Shared Korean search/category URLs restore rows, result count and accessible button state',()=>{
  const b=browser('https://example.test/blogs/writing/?q=트랜잭션&category=성능과%20연동');
  assert.equal(b.search.value,'트랜잭션');assert.equal(b.visible().length,1);assert.equal(b.counter.textContent,'1개의 노트');
  assert.equal(b.buttons[1].attributes['aria-pressed'],'true');assert.equal(b.buttons[0].attributes['aria-pressed'],'false');assert.equal(b.writes,0);
});

test('Search edits preserve unrelated URL state, remove empty/default filters and do not add history entries',()=>{
  const b=browser('https://example.test/blogs/writing/?utm_source=share#notes');
  b.search.value='트랜잭션';b.search.fire('input');assert.equal(b.url.searchParams.get('q'),'트랜잭션');
  b.buttons[1].fire('click');assert.equal(b.url.searchParams.get('category'),'성능과 연동');
  b.search.value='';b.search.fire('input');assert(!b.url.searchParams.has('q'));assert.equal(b.visible().length,1);
  b.buttons[0].fire('click');assert(!b.url.searchParams.has('category'));assert.equal(b.visible().length,2);
  assert.equal(b.url.searchParams.get('utm_source'),'share');assert.equal(b.url.hash,'#notes');
});

test('Back/forward and bfcache restores read current URL; unknown categories and literal text are safe',()=>{
  const b=browser();
  b.navigate('?q=cpu&category=unknown');b.events.popstate();assert.equal(b.search.value,'cpu');assert.equal(b.visible().length,1);assert.equal(b.buttons[0].attributes['aria-pressed'],'true');
  b.navigate('?q=%3Cimg%20onerror%3Dx%3E');b.events.pageshow();assert.equal(b.search.value,'<img onerror=x>');assert.equal(b.visible().length,0);assert.equal(b.empty.hidden,false);
  b.navigate('?category=성능과%20연동');b.events.pageshow();assert.equal(b.search.value,'');assert.equal(b.visible().length,1);assert.equal(b.empty.hidden,true);
  assert.doesNotThrow(()=>browser('https://example.test/blogs/',false));
});
