import {MARKET_COINS, normalizeKlines, analyze} from '../engine.mjs';
import {kstDay, validatePeriod, inPeriod, reportSnapshot, makeReport} from '../report-core.mjs';

const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function authorized(request,env) {
  const secret=env.REPORT_ADMIN_KEY;
  if(!secret||secret.length<32)return false;
  const raw=request.headers.get('Authorization')||'';
  if(!raw.startsWith('Bearer ')||raw.length>512)return false;
  const hash=async x=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)));
  const [a,b]=await Promise.all([hash(raw.slice(7)),hash(secret)]);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url),origin=request.headers.get('Origin'),allowed=new URL(env.DASHBOARD_URL).origin;
    if(origin&&origin!==allowed)return json({error:'허용되지 않은 앱 주소입니다.'},403);
    const headers={'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(url.pathname!=='/oauth/callback'&&!(await authorized(request,env)))return new Response(JSON.stringify({error:'연결용 관리 키를 확인하세요.'}),{status:401,headers:{...headers,'Content-Type':'application/json'}});
    if(url.pathname==='/tick')return json({error:'예약 전용 경로입니다.'},404);
    if(Number(request.headers.get('Content-Length'))>20000)return json({error:'요청이 너무 큽니다.'},413);
    try {
      const stub=env.REPORT.get(env.REPORT.idFromName('jace-personal-report'));
      const result=await stub.fetch(request);
      return new Response(result.body,{status:result.status,headers:{...Object.fromEntries(result.headers),...headers}});
    }catch{return json({error:'보고서 서버에 연결하지 못했습니다. 잠시 후 상태를 확인하세요.'},503);}
  },
  async scheduled(event,env,ctx) {
    const stub=env.REPORT.get(env.REPORT.idFromName('jace-personal-report'));
    ctx.waitUntil(stub.fetch('https://internal/tick',{method:'POST',body:JSON.stringify({scheduledTime:event.scheduledTime})}));
  }
};

export class ReportStore {
  constructor(ctx,env){this.storage=ctx.storage;this.env=env;this.queue=Promise.resolve();}
  fetch(request){const run=this.queue.then(()=>this.route(request));this.queue=run.catch(()=>{});return run;}
  async readBody(request){const raw=await request.text();if(raw.length>20000)throw Error('요청이 너무 큽니다.');return JSON.parse(raw);}
  async status(){const c=await this.storage.get('config'),tokens=await this.storage.get('tokens');return {configured:!!this.env.KAKAO_REST_API_KEY,connected:!!tokens,enabled:!!c?.enabled&&kstDay()<=c.end,start:c?.start,end:c?.end,snapshotAt:c?.snapshotAt,last:await this.storage.get('last')||null};}
  async route(request){
    const url=new URL(request.url),path=url.pathname;
    try {
      if(path==='/status'&&request.method==='GET')return json(await this.status());
      if(path==='/oauth/start'&&request.method==='POST'){
        if(!this.env.KAKAO_REST_API_KEY)throw Error('서버에 카카오 앱 키를 먼저 설정하세요.');
        const state=crypto.randomUUID()+crypto.randomUUID();
        const redirect=url.origin+'/oauth/callback';
        await this.storage.put('oauth',{state,redirect,expires:Date.now()+600000});
        const params=new URLSearchParams({client_id:this.env.KAKAO_REST_API_KEY,redirect_uri:redirect,response_type:'code',scope:'talk_message',state});
        return json({url:'https://kauth.kakao.com/oauth/authorize?'+params});
      }
      if(path==='/oauth/callback'&&request.method==='GET'){
        const pending=await this.storage.get('oauth');
        if(!pending||pending.expires<Date.now()||pending.state!==url.searchParams.get('state'))throw Error('연결 요청이 만료되었습니다. 앱에서 카카오 연결을 다시 시작하세요.');
        await this.storage.delete('oauth');
        if(url.searchParams.has('error')||!url.searchParams.get('code'))throw Error('카카오 연결 동의가 완료되지 않았습니다.');
        const tokens=await this.tokenRequest({grant_type:'authorization_code',redirect_uri:pending.redirect,code:url.searchParams.get('code')});
        await this.saveTokens(tokens);
        return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>JACE 카카오 연결 완료</title><style>body{background:#111c17;color:#eef5eb;font:18px system-ui;padding:60px;line-height:1.8}h1{color:#d2f99a}</style><h1>카카오 연결 완료</h1><p>이 창을 닫고 대시보드에서 ‘연결 상태 확인’을 누르세요.<br>발송 기간을 확인한 다음 ‘자동 발송 시작’을 눌러야 예약됩니다.</p>',{headers:{'Content-Type':'text/html;charset=UTF-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"}});
      }
      if(path==='/report/start'&&request.method==='POST'){
        if(!(await this.storage.get('tokens')))throw Error('카카오 계정을 먼저 연결하세요.');
        const b=await this.readBody(request),period=validatePeriod(b.start,b.end);
        if(period.end<kstDay())throw Error('종료일이 이미 지났습니다.');
        const account=reportSnapshot(b.account);
        await this.storage.put('config',{...period,enabled:true,account,snapshotAt:new Date().toISOString()});
        return json(await this.status());
      }
      if(path==='/report/stop'&&request.method==='POST'){
        const c=await this.storage.get('config');if(c)await this.storage.put('config',{...c,enabled:false});return json(await this.status());
      }
      if(path==='/report/sync'&&request.method==='POST'){
        const c=await this.storage.get('config');if(!c)throw Error('발송 예약을 먼저 설정하세요.');
        const b=await this.readBody(request);await this.storage.put('config',{...c,account:reportSnapshot(b.account),snapshotAt:new Date().toISOString()});return json(await this.status());
      }
      if(path==='/tick'&&request.method==='POST')return json(await this.sendDaily((await this.readBody(request)).scheduledTime));
      return json({error:'지원하지 않는 요청입니다.'},404);
    }catch(error){return json({error:error.message||'요청을 처리하지 못했습니다.'},400);}
  }
  async tokenRequest(values){
    const body=new URLSearchParams({...values,client_id:this.env.KAKAO_REST_API_KEY});
    if(this.env.KAKAO_CLIENT_SECRET)body.set('client_secret',this.env.KAKAO_CLIENT_SECRET);
    const response=await fetch('https://kauth.kakao.com/oauth/token',{method:'POST',body,signal:AbortSignal.timeout(15000)});
    const data=await response.json();if(!response.ok||!data.access_token)throw Error('카카오 인증에 실패했습니다. 앱 키·동의 항목을 확인하고 다시 연결하세요.');return data;
  }
  async saveTokens(data,old={}){const tokens={access_token:data.access_token,refresh_token:data.refresh_token||old.refresh_token,expires:Date.now()+data.expires_in*1000};if(!tokens.refresh_token)throw Error('카카오 갱신 토큰이 없습니다. 다시 연결하세요.');await this.storage.put('tokens',tokens);return tokens;}
  async accessToken(){let t=await this.storage.get('tokens');if(!t)throw Error('카카오 재연결이 필요합니다.');if(t.expires<Date.now()+120000)t=await this.saveTokens(await this.tokenRequest({grant_type:'refresh_token',refresh_token:t.refresh_token}),t);return t.access_token;}
  async sendDaily(scheduledTime){
    const now=Date.now(),day=kstDay(now),c=await this.storage.get('config');
    if(!Number.isFinite(scheduledTime)||kstDay(scheduledTime)!==day||Math.abs(now-scheduledTime)>3600000)return {skipped:'예약 시각 만료'};
    if(!inPeriod(c,now)){if(c?.enabled&&day>c.end)await this.storage.put('config',{...c,enabled:false});return {skipped:'기간 외 또는 중지'};}
    if((await this.storage.get('attemptDay'))===day)return {skipped:'오늘 발송 시도 완료'};
    try {
      const data=await loadMarket(now),token=await this.accessToken();
      const text=makeReport({...data,account:c.account,now,snapshotAt:c.snapshotAt});
      // Claim before sending: a timeout can mean Kakao accepted it. Never retry an ambiguous send.
      await this.storage.put('attemptDay',day);
      await this.storage.put('last',{day,state:'sending',message:'발송 결과 확인 중'});
      const template={object_type:'text',text,link:{web_url:this.env.DASHBOARD_URL,mobile_web_url:this.env.DASHBOARD_URL},button_title:'대시보드 열기'};
      const response=await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send',{method:'POST',headers:{Authorization:'Bearer '+token},body:new URLSearchParams({template_object:JSON.stringify(template)}),signal:AbortSignal.timeout(15000)});
      const result=await response.json();if(!response.ok||result.result_code!==0)throw Error('카카오 발송 실패: 연결·메시지 권한을 확인하세요.');
      const last={day,state:'sent',message:'발송 완료',at:new Date().toISOString()};await this.storage.put('last',last);return last;
    }catch(error){const attempted=(await this.storage.get('attemptDay'))===day;const last={day,state:'error',message:attempted?'발송 실패 또는 응답 미확인. 중복 방지를 위해 오늘은 재발송하지 않습니다.':'시세 또는 카카오 인증을 확인하지 못해 발송을 보류했습니다.',at:new Date().toISOString()};await this.storage.put('last',last);return last;}
  }
}

export async function loadMarket(now=Date.now()) {
  const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('시세 수신 실패');return r.json();};
  const [assets,fxRows]=await Promise.all([Promise.all(MARKET_COINS.map(async c=>{
    const base='https://data-api.binance.vision/api/v3',symbol=c.id+'USDT';
    const [raw,t]=await Promise.all([get(`${base}/klines?symbol=${symbol}&interval=1d&limit=300`),get(`${base}/ticker/24hr?symbol=${symbol}`)]);
    const bars=normalizeKlines(raw),a=analyze(bars,c.period,now),price=+t.lastPrice;
    if(!a||a.stale||!Number.isFinite(price)||price<=0||Math.abs(now-(+t.closeTime))>120000)throw Error('시세 지연');
    return {id:c.id,bars,price};
  })),get('https://api.upbit.com/v1/ticker?markets=KRW-USDT')]);
  const fx=+fxRows?.[0]?.trade_price;if(!(fx>0)||Math.abs(now-(+fxRows[0].timestamp))>120000)throw Error('환산 시세 지연');
  return {prices:Object.fromEntries(assets.map(x=>[x.id,x.price])),markets:Object.fromEntries(assets.map(x=>[x.id,x.bars])),fx};
}
