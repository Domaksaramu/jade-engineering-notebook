document.querySelector('.note-search')?.addEventListener('submit',event=>event.preventDefault());
const search = document.querySelector('#search');
const notes = [...document.querySelectorAll('[data-note]')];
const filterButtons = [...document.querySelectorAll('[data-filter]')];
let category = 'all';
function filterNotes() {
  const query=(search?.value||'').trim().toLocaleLowerCase('ko'); let count=0;
  for(const note of notes) { const visible=(category==='all'||note.dataset.category===category) && note.dataset.search.includes(query); note.hidden=!visible; if(visible) count++; }
  const counter=document.querySelector('#search-count'); if(counter) counter.textContent=`${count}개의 노트`;
  const empty=document.querySelector('#empty-state'); if(empty) empty.hidden=count!==0;
  for(const button of filterButtons)button.setAttribute('aria-pressed',String(button.dataset.filter===category));
}
function saveNoteFilters() {
  if(!search)return;
  const url=new URL(location.href),query=search.value.trim();
  if(query)url.searchParams.set('q',query);else url.searchParams.delete('q');
  if(category!=='all')url.searchParams.set('category',category);else url.searchParams.delete('category');
  if(url.href!==location.href)history.replaceState(history.state,'',url);
}
function restoreNoteFilters() {
  if(!search)return;
  const params=new URLSearchParams(location.search),selected=params.get('category');
  search.value=params.get('q')||'';
  category=filterButtons.some(button=>button.dataset.filter===selected)?selected:'all';
  filterNotes();
}
search?.addEventListener('input',()=>{filterNotes();saveNoteFilters();});
for(const button of filterButtons) button.addEventListener('click',()=>{
  category=button.dataset.filter;
  filterNotes();saveNoteFilters();
});
restoreNoteFilters();
window.addEventListener('popstate',restoreNoteFilters);
window.addEventListener('pageshow',restoreNoteFilters);
for(const nav of document.querySelectorAll('.mobile-nav')) {
  nav.addEventListener('keydown',event=>{if(event.key==='Escape'){nav.open=false;nav.querySelector('summary').focus();}});
  for(const link of nav.querySelectorAll('a')) link.addEventListener('click',()=>{nav.open=false;});
}

for(const toc of document.querySelectorAll('.mobile-toc')) {
  toc.addEventListener('keydown',event=>{if(event.key==='Escape'){toc.open=false;toc.querySelector('summary').focus();}});
  for(const link of toc.querySelectorAll('a')) link.addEventListener('click',()=>{
    toc.open=false;
    const heading=document.getElementById(link.hash.slice(1));
    if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
  });
}
// Native overflow remains usable without JS; keyboard users can focus wide blocks.
for(const block of document.querySelectorAll('.prose pre,.table-wrap')) {
  block.tabIndex=0;
  block.setAttribute('role','region');
  block.setAttribute('aria-label',block.matches('pre')?'코드 또는 개념도. 긴 줄은 가로로 스크롤할 수 있습니다.':'표. 넓은 표는 가로로 스크롤할 수 있습니다.');
}
