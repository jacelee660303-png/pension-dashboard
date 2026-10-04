import {makeReport, reportSnapshot, validatePeriod, kstDay} from './report-core.mjs';

export function initReports(getContext,{toast,storageKey,sandbox=false}) {
  const $=id=>document.getElementById(id),key=storageKey+'.report';
  let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
  let remote=null,busy=false;
  $('report-start-date').value=saved.start||kstDay();
  $('report-end-date').value=saved.end||kstDay(Date.now()+30*86400000);
  $('report-endpoint').value=saved.endpoint||'';
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify({start:$('report-start-date').value,end:$('report-end-date').value,endpoint:$('report-endpoint').value.trim()}));}catch{toast('기간 설정을 저장하지 못했습니다.');}};
  const preview=()=>{$('report-preview').textContent=makeReport({...getContext(),now:Date.now(),snapshotAt:getContext().account.updatedAt});};
  function render(){
    const configured=!!$('report-endpoint').value.trim();
    $('report-status').textContent=remote?(remote.enabled?'자동 발송 예약됨':remote.connected?'카카오 연결됨 · 발송 중지':'카카오 연결 필요'):configured?'서버 상태 미확인':'카카오 미연결 · 자동 발송 꺼짐';
    $('report-status').className='badge '+(remote?.enabled?'':'neutral');
    const account=getContext().account;
    const dirty=remote?.snapshotAt&&account.updatedAt&&account.updatedAt>remote.snapshotAt;
    $('report-sync-status').textContent=remote?.snapshotAt?`보고서용 잔고 동기화: ${new Date(remote.snapshotAt).toLocaleString('ko-KR')} ${dirty?'· 잔고 변경됨 — 다시 동기화하세요.':''}`:'보고서는 시작 버튼을 누를 때 전송한 잔고를 기준으로 계산합니다. 잔고 변경 후 다시 동기화하세요.';
    $('report-last').textContent=remote?.last?`${remote.last.day} · ${remote.last.message}`:'아직 확인된 발송 이력이 없습니다.';
    for(const b of document.querySelectorAll('[data-report-action]'))b.disabled=busy;
  }
  async function api(path,body){
    if(sandbox)throw Error('연습 모드에서는 외부 발송을 연결하지 않습니다. 실제 대시보드에서 연결하세요.');
    let url;try{url=new URL($('report-endpoint').value.trim());}catch{throw Error('먼저 연결 설정을 열고 보고서 서버 주소를 입력하세요.');}
    if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('보고서 서버의 HTTPS 기본 주소를 입력하세요.');
    const token=$('report-admin-key').value.trim();if(token.length<32)throw Error('연결용 관리 키를 입력하세요. 키는 이 화면이 열려 있는 동안만 사용합니다.');
    const response=await fetch(url.origin+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'보고서 서버 연결을 확인하세요.');return result;
  }
  async function action(fn){if(busy)return;busy=true;render();$('report-message').textContent='처리 중…';try{await fn();persist();}catch(error){$('report-message').textContent=error.message;toast(error.message);}finally{busy=false;render();}}
  $('report-preview-button').onclick=()=>{preview();$('report-preview').scrollIntoView({behavior:'smooth',block:'nearest'});};
  $('report-connect').onclick=()=>action(async()=>{const r=await api('/oauth/start',{});const u=new URL(r.url);if(u.origin!=='https://kauth.kakao.com')throw Error('카카오 연결 주소를 확인하지 못했습니다.');$('report-oauth-link').href=r.url;$('report-oauth-link').hidden=false;$('report-message').textContent='아래 ‘카카오 로그인 계속’을 열어 동의한 뒤 연결 상태를 확인하세요.';});
  $('report-check').onclick=()=>action(async()=>{remote=await api('/status');if(remote.start)$('report-start-date').value=remote.start;if(remote.end)$('report-end-date').value=remote.end;$('report-message').textContent=remote.connected?'카카오 연결을 확인했습니다. 기간을 설정하고 자동 발송을 시작할 수 있습니다.':'서버 연결 완료. 카카오 계정을 연결하세요.';});
  $('report-enable').onclick=()=>action(async()=>{const period=validatePeriod($('report-start-date').value,$('report-end-date').value);if(period.end<kstDay())throw Error('종료일이 이미 지났습니다.');remote=await api('/report/start',{...period,account:reportSnapshot(getContext().account)});$('report-message').textContent=`${remote.start} ~ ${remote.end}, 매일 한국시간 12:00 발송을 예약했습니다. 오늘 12시가 지났다면 다음 예약 시각부터 발송합니다.`;});
  $('report-disable').onclick=()=>action(async()=>{remote=await api('/report/stop',{});$('report-message').textContent='자동 발송을 중지했습니다. 이미 전송 중인 보고서는 취소되지 않을 수 있습니다.';});
  $('report-sync').onclick=()=>action(async()=>{remote=await api('/report/sync',{account:reportSnapshot(getContext().account)});$('report-message').textContent='보고서용 잔고를 현재 입력값으로 업데이트했습니다.';});
  for(const id of ['report-start-date','report-end-date'])$(id).onchange=()=>{persist();$('report-message').textContent='변경한 기간은 자동 발송 시작 버튼을 눌러야 서버에 적용됩니다.';};
  $('report-endpoint').onchange=()=>{remote=null;persist();render();};
  window.addEventListener('jace-account-change',render);
  preview();render();
}
