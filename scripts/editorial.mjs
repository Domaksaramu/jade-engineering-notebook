import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { root } from './build.mjs';
import { newNote } from './content.mjs';
import { validSlug, kinds, parseDocument, loadContent } from '../src/content.mjs';
import { documentPath, saveDocument } from '../src/workspace.mjs';
import { validateConnections } from '../src/experience.mjs';

const sources=['private','content'];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
function validateTarget(kind,slug,source) {
  if(!kinds.includes(kind)||!validSlug(slug)||!sources.includes(source))throw new Error('글 종류·slug·source(private/content)를 확인하세요.');
}
async function privateDirectory(projectRoot,parts,{create=false}={}) {
  let folder=projectRoot;
  for(const part of ['_private',...parts]) {
    folder=path.join(folder,part);
    if(create)await mkdir(folder).catch(error=>{if(error.code!=='EEXIST')throw error;});
    const info=await lstat(folder);
    if(info.isSymbolicLink()||!info.isDirectory())throw new Error('비공개 작업 경로에 심볼릭 링크나 일반 파일을 사용할 수 없습니다.');
  }
  return folder;
}
async function regularFile(file) {
  const info=await lstat(file).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  if(info&&(info.isSymbolicLink()||!info.isFile()))throw new Error('글과 검토 리포트는 일반 파일이어야 합니다.');
  return info;
}
async function candidatePath(projectRoot,kind,slug,source,{create=false}={}) {
  validateTarget(kind,slug,source);
  if(source==='content')return documentPath(projectRoot,kind,slug);
  const folder=await privateDirectory(projectRoot,['drafts',kind],{create});
  const file=path.join(folder,`${slug}.md`);await regularFile(file);return file;
}
export async function createPrivateDraft(projectRoot,slug) {
  const file=await candidatePath(projectRoot,'notes',slug,'private',{create:true});
  await writeFile(file,newNote(),{flag:'wx'});return file;
}
const placeholderLines=new Set([
  '실제로 경험한 상황과 본인의 담당 범위를 작성합니다.',
  '확인한 사실과 해석을 구분합니다.',
  '변경과 검증의 범위, 남은 질문을 작성합니다.'
]);
function findings(raw,doc) {
  const blockers=[],warnings=[];
  const add=(list,code,message,line)=>list.push({code,message,...(line?{line}:{})});
  if(doc.title==='새 경험의 제목'||doc.summary==='어떤 문제와 판단을 기록할지 한 문장으로 작성하세요.')add(blockers,'template-metadata','기본 제목·요약을 실제 글에 맞게 작성하세요.');
  const lines=raw.split(/\r?\n/);
  lines.forEach((line,index)=>{
    if(placeholderLines.has(line.trim())||/\bTODO\b|\[작성 필요\]/i.test(line))add(blockers,'placeholder','남아 있는 작성 안내·TODO를 정리하세요.',index+1);
    if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b/.test(line))add(blockers,'credential-pattern','자격증명으로 의심되는 패턴을 제거하세요. 값은 리포트에 기록하지 않습니다.',index+1);
    if(/https?:\/\/(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(line))add(warnings,'internal-address','내부·로컬 주소가 있습니다. 실제 내부 정보인지 공개 가능한 예제인지 직접 확인하세요.',index+1);
    if(/https?:\/\/[^\s/]+:[^\s/]+@/i.test(line))add(blockers,'url-credentials','URL에 포함된 인증 정보를 제거하세요.',index+1);
  });
  if(doc.toc.filter(t=>t.level===2).length<3)add(warnings,'story-structure','상황·판단·변경·검증/한계가 충분히 드러나는지 확인하세요.');
  if(!doc.company||!doc.project||!doc.role)add(warnings,'experience-context','경력 경험 글이라면 회사·프로젝트·본인 역할을 명시하세요. 일반 학습 글에는 선택 사항입니다.');
  return {blockers,warnings};
}
async function reportPath(projectRoot,{kind,slug,source,hash:checksum},{create=false}={}) {
  const folder=await privateDirectory(projectRoot,['reviews'],{create});
  const file=path.join(folder,`${source}-${kind}-${slug}-${checksum}.json`);await regularFile(file);return file;
}
export async function reviewDocument(projectRoot,{kind='notes',slug,source='private',writeReport=false}) {
  const file=await candidatePath(projectRoot,kind,slug,source),raw=await readFile(file,'utf8');
  const report={version:1,kind,slug,source,hash:hash(raw),checksPassed:false,blockers:[],warnings:[],humanReviewRequired:['사실·수치·본인 담당 범위','기밀·개인정보·공개 권한','이번 원문 버전의 공개 승인']};
  try {
    if(Buffer.byteLength(raw)>200_000)throw new Error('글은 UTF-8 기준 200KB 이내여야 합니다.');
    const doc=parseDocument(raw,slug,kind),result=findings(raw,doc);
    report.blockers.push(...result.blockers);report.warnings.push(...result.warnings);
    const docs=(await loadContent(projectRoot,{drafts:true,validate:false})).filter(d=>d.kind!==kind||d.slug!==slug);
    validateConnections([...docs,doc]);
    if(source==='private'&&await regularFile(await documentPath(projectRoot,kind,slug)))report.blockers.push({code:'target-exists',message:'같은 공개 원본이 이미 있습니다. 비공개 초안으로 덮어쓰지 않습니다. 기존 원본은 --source content로 검토·수정하세요.'});
  } catch(error) {report.blockers.push({code:'document-validation',message:error.message});}
  report.checksPassed=report.blockers.length===0;
  if(writeReport) {
    const destination=await reportPath(projectRoot,report,{create:true});
    // Same source bytes produce the same report identity; refresh graph findings on every review.
    await writeFile(destination,JSON.stringify(report,null,2)+'\n');
  }
  return report;
}
function metadata(raw,values) {
  return raw.replace(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/,(_,header)=>{
    let lines=header.split(/\r?\n/);
    for(const [key,value] of Object.entries(values)) {
      lines=lines.filter(line=>!line.startsWith(key+':'));
      if(value!==undefined)lines.push(`${key}: ${JSON.stringify(value)}`);
    }
    return '---\n'+lines.join('\n')+'\n---\n';
  });
}
export async function prepareDocument(projectRoot,{kind='notes',slug,source='private',reviewedHash,date,factsReviewed=false,privacyReviewed=false,publicationApproved=false}) {
  validateTarget(kind,slug,source);
  if(factsReviewed!==true||privacyReviewed!==true||publicationApproved!==true)throw new Error('사실 검토·기밀 검토·이번 원문 공개 승인을 모두 명시해야 합니다. 자동 검사만으로 승인하지 않습니다.');
  if(typeof reviewedHash!=='string'||!(/^[a-f0-9]{64}$/).test(reviewedHash))throw new Error('검토 리포트의 전체 SHA-256 hash를 --review로 지정하세요.');
  const report=await reviewDocument(projectRoot,{kind,slug,source});
  if(report.hash!==reviewedHash)throw new Error('검토 이후 원문이 변경됐습니다. 다시 review한 원문으로 확인하세요.');
  if(!report.checksPassed)throw new Error('검토 차단 항목을 먼저 해결하세요.');
  const receipt=JSON.parse(await readFile(await reportPath(projectRoot,report),'utf8'));
  if(receipt.hash!==reviewedHash||receipt.kind!==kind||receipt.slug!==slug||receipt.source!==source||receipt.checksPassed!==true||receipt.version!==report.version)throw new Error('이 원문에 대한 통과한 검토 리포트가 필요합니다.');
  if(typeof date!=='string')throw new Error('발행·수정 예정일을 --date YYYY-MM-DD로 명시하세요.');
  const raw=await readFile(await candidatePath(projectRoot,kind,slug,source),'utf8');
  if(hash(raw)!==reviewedHash)throw new Error('발행 준비 중 원문이 변경됐습니다. 다시 검토하세요.');
  const doc=parseDocument(raw,slug,kind),publishedAt=source==='content'?doc.publishedAt:undefined;
  if(source==='content'&&date<(doc.updatedAt||publishedAt||date))throw new Error('수정일은 기존 발행·수정일보다 이전으로 지정할 수 없습니다.');
  const prepared=metadata(raw,{draft:false,publishedAt:publishedAt||date,updatedAt:publishedAt?date:undefined});
  parseDocument(prepared,slug,kind);
  await saveDocument(projectRoot,kind,slug,prepared,{createOnly:source==='private'});
  return {file:`content/${kind}/${slug}.md`,href:`${kind}/${slug}/`,status:'prepared-not-deployed',reviewedHash};
}
function argumentsFor(command,target,args) {
  if(!['draft','review','prepare'].includes(command)||!target)throw new Error('사용법: npm run draft|review|content:prepare -- [notes/|cases/]slug [옵션]');
  const parts=target.split('/'),kind=parts.length===1?'notes':parts[0],slug=parts.length===1?parts[0]:parts[1];
  if(parts.length>2)throw new Error('올바른 글 경로를 지정하세요.');
  const allowed=command==='prepare'?['source','review','date','facts-reviewed','privacy-reviewed','publication-approved']:command==='review'?['source']:[];
  const options={kind,slug};
  for(let i=0;i<args.length;i++) {
    const name=args[i].slice(2);
    if(!args[i].startsWith('--')||!allowed.includes(name)||Object.hasOwn(options,name))throw new Error('알 수 없거나 중복된 옵션: '+args[i]);
    if(name.endsWith('-reviewed')||name==='publication-approved')options[name]=true;
    else {if(!args[i+1]||args[i+1].startsWith('--'))throw new Error('옵션 값이 필요합니다: '+name);options[name]=args[++i];}
  }
  validateTarget(kind,slug,options.source||'private');
  return options;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const [command,target,...args]=process.argv.slice(2),options=argumentsFor(command,target,args);
    if(command==='draft') {
      if(options.kind!=='notes')throw new Error('새 초안 생성은 notes만 지원합니다.');
      console.log(await createPrivateDraft(root,options.slug));console.error('로컬 비공개 작업 폴더입니다. Git에 강제로 추가하거나 외부에 공유하지 마세요.');
    } else if(command==='review') {
      const report=await reviewDocument(root,{...options,writeReport:true});console.log(JSON.stringify(report,null,2));
      console.error('자동 검사는 사실·기밀·공개 승인을 대신하지 않습니다.');if(!report.checksPassed)process.exitCode=1;
    } else {
      const result=await prepareDocument(root,{...options,reviewedHash:options.review,factsReviewed:options['facts-reviewed'],privacyReviewed:options['privacy-reviewed'],publicationApproved:options['publication-approved']});
      console.log(JSON.stringify(result,null,2));console.error('공개 원본만 준비했습니다. Git push·외부 배포는 실행하지 않았습니다. npm run verify 후 diff를 검토하세요.');
    }
  } catch(error) {console.error(error.code==='ENOENT'?'초안 또는 검토 리포트가 없습니다. 경로를 확인하고 먼저 draft/review를 실행하세요.':error.message);process.exitCode=1;}
}
