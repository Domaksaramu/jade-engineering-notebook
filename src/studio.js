let token='',current=null,dirty=false,list=[];
const editor=document.querySelector('#editor'), status=document.querySelector('#status');
const say=message=>{status.textContent=message;};
async function api(route,data) {
  const response=await fetch('/api/'+route,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json','X-CSRF-Token':token}:{},body:data?JSON.stringify(data):undefined});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'작업에 실패했습니다.');return result;
}
async function refreshList() {
  list=await api('list');const parent=document.querySelector('#documents');parent.replaceChildren();
  for(const doc of list) {const button=document.createElement('button');button.type='button';button.textContent=`${doc.draft?'[초안] ':''}${doc.title}`;button.setAttribute('aria-pressed',String(current?.slug===doc.slug&&current?.kind===doc.kind));button.addEventListener('click',()=>openDocument(doc).catch(error=>say(error.message)));parent.append(button);}
}
async function preview() { if(!current)return; const result=await api('preview',{...current,raw:editor.value});document.querySelector('#preview-title').textContent=result.title;document.querySelector('#preview-body').innerHTML=result.html; }
async function openDocument(doc) {
  if(dirty&&!confirm('저장하지 않은 변경이 있습니다. 다른 글을 여시겠어요?'))return;
  const result=await api(`document?kind=${encodeURIComponent(doc.kind)}&slug=${encodeURIComponent(doc.slug)}`);current={kind:doc.kind,slug:doc.slug};editor.value=result.raw;dirty=false;document.querySelector('#selected').textContent=`content/${doc.kind}/${doc.slug}.md`;await preview();await refreshList();say('파일을 불러왔습니다.');
}
editor.addEventListener('input',()=>{dirty=true;say('저장하지 않은 변경이 있습니다. 미리보기는 갱신 버튼으로 확인하세요.');});
document.querySelector('#preview-button').addEventListener('click',()=>preview().then(()=>say('본문 미리보기를 갱신했습니다.')).catch(error=>say(error.message)));
document.querySelector('#save').addEventListener('click',async event=>{if(!current)return;event.target.disabled=true;try{const result=await api('save',{...current,raw:editor.value});dirty=false;await preview();await refreshList();say(result.message);}catch(error){say(error.message);}finally{event.target.disabled=false;}});
document.querySelector('#delete').addEventListener('click',async()=>{if(!current||!confirm(`${current.slug}.md를 휴지통으로 이동할까요? 저장하지 않은 변경은 보존되지 않습니다.`))return;try{const result=await api('delete',current);current=null;dirty=false;editor.value='';document.querySelector('#preview-body').replaceChildren();document.querySelector('#preview-title').textContent='';await refreshList();say(result.message);if(list[0])await openDocument(list[0]);}catch(error){say(error.message);}});
const dialog=document.querySelector('#new-dialog');document.querySelector('#new').addEventListener('click',()=>dialog.showModal());document.querySelector('#cancel-new').addEventListener('click',()=>dialog.close());
document.querySelector('#new-form').addEventListener('submit',async event=>{event.preventDefault();if(dirty&&!confirm('저장하지 않은 변경을 닫고 새 노트를 만드시겠어요?'))return;try{const slug=document.querySelector('#new-slug').value;await api('new',{slug});dirty=false;dialog.close();await openDocument({kind:'notes',slug});say('초안 파일을 만들었습니다. draft: true이므로 공개 빌드에 포함되지 않습니다.');}catch(error){say(error.message);}});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
try{({token}=await api('session'));await refreshList();if(list[0])await openDocument(list[0]);}catch(error){say(error.message);}
