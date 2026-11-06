document.querySelector('.note-search')?.addEventListener('submit',event=>event.preventDefault());
const search = document.querySelector('#search');
const notes = [...document.querySelectorAll('[data-note]')];
let category = 'all';
function filterNotes() {
  const query=(search?.value||'').trim().toLocaleLowerCase('ko'); let count=0;
  for(const note of notes) { const visible=(category==='all'||note.dataset.category===category) && note.dataset.search.includes(query); note.hidden=!visible; if(visible) count++; }
  const counter=document.querySelector('#search-count'); if(counter) counter.textContent=`${count}개의 노트`;
  const empty=document.querySelector('#empty-state'); if(empty) empty.hidden=count!==0;
}
search?.addEventListener('input',filterNotes);
for(const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click',()=>{
  category=button.dataset.filter;
  for(const other of document.querySelectorAll('[data-filter]')) other.setAttribute('aria-pressed',String(other===button));
  filterNotes();
});
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
