import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, root } from './build.mjs';
import { loadContent, parseDocument } from '../src/content.mjs';
import { documentPath, saveDocument, deleteDocument } from '../src/workspace.mjs';
import { createNote } from './content.mjs';

export function allowedRequest(req,port,{write=false,token}={}) {
  const hosts=[`127.0.0.1:${port}`,`localhost:${port}`];
  if(!hosts.includes(req.headers.host))return false;
  if(req.headers['sec-fetch-site']==='cross-site')return false;
  if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)return false;
  if(write) {
    const supplied=req.headers['x-csrf-token']||'';
    if(!req.headers.origin||req.headers['content-type']!=='application/json'||typeof supplied!=='string'||supplied.length!==token.length)return false;
    if(Buffer.byteLength(supplied)!==Buffer.byteLength(token)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(token)))return false;
  }
  return true;
}
export async function startServer({projectRoot=root,port=Number(process.env.PORT||4321)}={}) {
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT는 1024~65535 정수여야 합니다.');
  const token=randomBytes(32).toString('hex');await build({projectRoot,localPreview:true});let queue=Promise.resolve();
  const rebuild=()=>{queue=queue.catch(()=>{}).then(()=>build({projectRoot,localPreview:true}));return queue;};
  const send=(res,status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type+'; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(type==='application/json'&&!Buffer.isBuffer(body)?JSON.stringify(body):body);};
  const server=http.createServer(async(req,res)=>{
    if(!allowedRequest(req,port))return send(res,403,{error:'로컬 same-origin 요청만 허용합니다.'});
    try {
      const url=new URL(req.url,`http://127.0.0.1:${port}`);
      if(url.pathname.startsWith('/api/')) {
        if(req.method==='GET') {
          if(url.pathname==='/api/session')return send(res,200,{token});
          if(url.pathname==='/api/list')return send(res,200,(await loadContent(projectRoot,{drafts:true})).map(({slug,kind,title,draft})=>({slug,kind,title,draft})));
          if(url.pathname==='/api/document') {const target=await documentPath(projectRoot,url.searchParams.get('kind'),url.searchParams.get('slug'));return send(res,200,{raw:await readFile(target,'utf8')});}
          return send(res,404,{error:'API를 찾을 수 없습니다.'});
        }
        if(req.method!=='POST'||!allowedRequest(req,port,{write:true,token}))return send(res,403,{error:'저장 요청 검증에 실패했습니다.'});
        const chunks=[];let length=0;
        for await (const chunk of req) {length+=chunk.length;if(length>210_000)return send(res,413,{error:'글은 200KB 이내로 작성하세요.'});chunks.push(chunk);}
        let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(res,400,{error:'올바르지 않은 JSON입니다.'});}
        if(!input||typeof input!=='object')return send(res,400,{error:'입력값이 없습니다.'});
        if(url.pathname==='/api/preview') {const doc=parseDocument(input.raw,input.slug,input.kind);return send(res,200,{title:doc.title,html:doc.html});}
        if(url.pathname==='/api/save') {await saveDocument(projectRoot,input.kind,input.slug,input.raw);await rebuild();return send(res,200,{message:'원문을 백업하고 파일을 저장했습니다. 사이트를 새로고침하면 변경을 볼 수 있습니다.'});}
        if(url.pathname==='/api/delete') {
          const published=await loadContent(projectRoot);if(input.kind==='cases'&&published.filter(d=>d.kind==='cases').length===1&&published.some(d=>d.kind==='cases'&&d.slug===input.slug))throw new Error('샘플 홈을 위해 마지막 공개 사례는 삭제할 수 없습니다.');
          const backup=await deleteDocument(projectRoot,input.kind,input.slug);await rebuild();return send(res,200,{message:`.trash/${backup}로 이동했습니다.`});
        }
        if(url.pathname==='/api/new') {await createNote(projectRoot,input.slug);return send(res,201,{message:'초안 생성 완료'});}
        return send(res,404,{error:'API를 찾을 수 없습니다.'});
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,'Method not allowed','text/plain');
      if(url.pathname==='/studio/'||url.pathname==='/studio')return send(res,200,await readFile(path.join(projectRoot,'src/studio.html')),'text/html');
      if(url.pathname==='/studio.js')return send(res,200,await readFile(path.join(projectRoot,'src/studio.js')),'text/javascript');
      // Rebuild on HTML requests so external text-editor changes are also reflected.
      if(url.pathname.endsWith('/')||url.pathname.endsWith('.html'))await rebuild();
      const base=path.join(projectRoot,'dist');let target=path.resolve(base,'.'+decodeURIComponent(url.pathname));
      if(target!==base&&!target.startsWith(base+path.sep))return send(res,403,'Forbidden','text/plain');
      if((await stat(target)).isDirectory())target=path.join(target,'index.html');
      const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain'};
      return send(res,200,await readFile(target),types[path.extname(target)]||'application/octet-stream');
    } catch(error) {if(error.code==='ENOENT')return send(res,404,await readFile(path.join(projectRoot,'dist/404.html')),'text/html');send(res,400,{error:error.message});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  console.log(`Local: http://127.0.0.1:${port}/\nEditor: http://127.0.0.1:${port}/studio/\nLoopback only. No public write API.`);
  return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await startServer();
