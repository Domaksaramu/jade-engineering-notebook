// Editorial navigation, not an inferred employment/project relationship.
export const journeys = [
  { id:'financial-integration', title:'금융 연동', heading:'금융의 연결을 안정적으로', detail:'전문 송수신 · DB 처리 경계', year:'2018—', summary:'외부기관과 연결되는 흐름에서, 내부의 반복 처리와 저장 경계를 정리한 경험입니다.' },
  { id:'shared-foundation', title:'공통 기반', heading:'팀이 함께 쓰는 기반으로', detail:'인증 · 프레임워크 · 공통파트 PL', year:'2022—', summary:'개발자가 함께 쓰는 환경을 만들고, 운영에서 드러난 인증 객체의 수명을 다시 살핀 경험입니다.' },
  { id:'platform-operations', title:'플랫폼 운영', heading:'배포 이후의 운영까지', detail:'ML 서빙 · 검증 · 관측 자동화', year:'2025—', summary:'배포 명령의 완료를 넘어 서비스 응답과 운영 정보 공유까지 연결한 경험입니다.' }
].map(journey=>({...journey,href:`journey/${journey.id}/`}));

export function validateConnections(docs) {
  const cases=new Map(docs.filter(d=>d.kind==='cases').map(d=>[d.slug,d]));
  for(const doc of docs) for(const slug of doc.relatedCases||[]) {
    const target=cases.get(slug);
    if(!target)throw new Error(`${doc.slug}: 연결할 프로젝트 사례 ${slug}가 없습니다.`);
    if(doc.journey!==target.journey)throw new Error(`${doc.slug}: ${slug}와 경력 흐름이 다릅니다.`);
    if(doc.company!==target.company||doc.project!==target.project)throw new Error(`${doc.slug}: ${slug}와 회사·프로젝트가 다릅니다. 다른 프로젝트는 경력 흐름으로만 연결하세요.`);
  }
}

export function relatedDocuments(doc,docs) {
  const available=docs.filter(d=>!d.draft && !(d.kind===doc.kind && d.slug===doc.slug));
  const project=available.filter(d=>doc.kind==='cases'
    ? d.kind==='notes' && d.relatedCases?.includes(doc.slug)
    : d.kind==='cases' && doc.relatedCases?.includes(d.slug));
  const journey=doc.journey ? available.filter(d=>d.journey===doc.journey && !project.includes(d)) : [];
  return {project,journey};
}
