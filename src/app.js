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
