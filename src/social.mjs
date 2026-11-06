import { createHash } from 'node:crypto';
import { escape as e } from './content.mjs';

export const socialKey=doc=>doc?`${doc.kind}-${doc.slug}`:'notebook';
export function socialCopy(doc) {
  return doc?{title:doc.title,label:`${doc.kind==='cases'?'CASE STUDY':'FIELD NOTE'} / ${doc.category}`,context:doc.company||'경험에서 다음 설계의 기준을 찾습니다.'}:{title:'문제를 좁히고,\n구조를 바꾸고,\n운영으로 확인합니다.',label:'BACKEND / PLATFORM ENGINEER',context:'금융 백엔드에서 MLOps 플랫폼까지'};
}
// Invalidate cached cards when either their displayed copy or design changes.
export const socialFingerprint=doc=>createHash('sha256').update(JSON.stringify({version:2,...socialCopy(doc)})).digest('hex');
export function socialCard(doc) {
  const {title,label,context}=socialCopy(doc);
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><title>공유 이미지</title><style>
*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}body{background:#f7f6f2;color:#242724;font-family:"Apple SD Gothic Neo","Noto Sans KR",sans-serif;padding:52px 72px;display:flex;flex-direction:column;letter-spacing:-.03em}.top{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #bfc5b9;padding-bottom:24px}.brand{font-size:25px;font-weight:650}.brand span{color:#a94124}.label{font-size:14px;letter-spacing:.07em;color:#59634f}h1{font-size:${title.length>44?50:58}px;line-height:1.33;letter-spacing:-.045em;margin:auto 0;font-weight:650;white-space:pre-line;text-wrap:balance;overflow-wrap:anywhere;word-break:keep-all;max-width:1030px;border-left:5px solid #a94124;padding-left:27px}.bottom{border-top:1px solid #bfc5b9;padding-top:22px;display:flex;gap:32px;justify-content:space-between;align-items:center;color:#59634f;font-size:20px}.bottom span:last-child{font-size:14px;letter-spacing:.04em;white-space:nowrap;color:#a94124}
</style><div class="top"><div class="brand">임재원<span> / </span>Engineering Notebook</div><div class="label">${e(label)}</div></div><h1>${e(title)}</h1><div class="bottom"><span>${e(context)}</span><span>EXPERIENCE → ENGINEERING</span></div></html>`;
}
export function assertSocialPng(buffer) {
  if(buffer.length<24||buffer.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||buffer.toString('ascii',12,16)!=='IHDR'||buffer.readUInt32BE(16)!==1200||buffer.readUInt32BE(20)!==630)throw new Error('공유 이미지는 1200×630 PNG여야 합니다. npm run social로 다시 생성하세요.');
}
