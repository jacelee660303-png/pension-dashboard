import {MARKET_COINS, emptyAccount, validateAccount, portfolio, analyze, intradaySignal, finite} from './engine.mjs';

export const kstDay = (now = Date.now()) => new Date(now + 9 * 3600000).toISOString().slice(0, 10);
export function validatePeriod(start, end) {
  const valid = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0,10) === x;
  if (!valid(start) || !valid(end) || start > end) throw Error('시작일과 종료일을 확인하세요. 종료일은 시작일 이후여야 합니다.');
  return {start, end};
}
export function inPeriod(config, now = Date.now()) {
  const day = kstDay(now);
  return !!config?.enabled && day >= config.start && day <= config.end;
}
export function reportSnapshot(account) {
  account=validateAccount(account);
  const a = emptyAccount();
  a.cash = account.cash; a.cashKRW = account.cashKRW || 0;
  for (const c of MARKET_COINS) {const h=account.holdings[c.id]; a.holdings[c.id] = {qty:h.qty, avg:h.avg, avgKRW:h.avgKRW ?? null};}
  a.updatedAt = account.updatedAt;
  return a;
}
const num=(v,d=0)=>finite(v)?new Intl.NumberFormat('ko-KR',{maximumFractionDigits:d}).format(v):'확인 중';
const pct=v=>finite(v)?(v>=0?'+':'')+num(v*100,2)+'%':'—';
const signal=x=>x==='up'?'매수 ↑':x==='down'?'매도 ↓':'교차 없음';
export function makeReport({account, prices, markets, fx, now=Date.now(), snapshotAt=null, pricesFresh=null, fxSource='업비트', fxIsFresh=true}) {
  const p=portfolio(account,prices,fx), ret=p.costKRW>0&&finite(p.pnlKRW)?p.pnlKRW/p.costKRW:null;
  const lines=[`JACE 코인 데일리 · ${kstDay(now)}`,`총자산 ${num(p.valueKRW)}원`,`평가손익 ${num(p.pnlKRW)}원 (${pct(ret)})`,`현금 ${num(account.cashKRW||0)}원 · ${num(account.cash,2)} USDT`,`환산 1 USDT = ${num(fx>0?fx:null)}원 · ${fxSource}`,''];
  if(!fxIsFresh||pricesFresh&&MARKET_COINS.some(c=>!pricesFresh[c.id]))lines.push('시세 수신 대기·지연: 마지막 수신값 미리보기');
  for (const c of MARKET_COINS) {const r=p.rows.find(r=>r.id===c.id);lines.push(`${c.id} ${num(r.qty,8)}개 · 평가 ${num(finite(r.value)&&fx>0?r.value*fx:null)}원 / ${pct(r.returnKRW)}`);}
  lines.push('', '이평선 신호 · 확정 / 장중 예고');
  for (const c of MARKET_COINS) {const a=analyze(markets[c.id]||[],c.period,now),live=intradaySignal(a,c.period,prices[c.id]);lines.push(`${c.id}${c.reference?'(참고)':''} ${c.period}일: ${a&&!a.stale?signal(a.cross):'데이터 확인 중'} / ${a&&!a.stale&&live&&(!pricesFresh||pricesFresh[c.id])?signal(live.cross):'확인 중'}`);}
  lines.push('', 'BTC 65 · ETH 20 · BNB/SOL 각 7.5%', '확정: UTC 전일 종가 · 예고: 미확정', '평가손익은 현재 보유분 기준. XRP 잔고 포함·목표 배분 제외.');
  if(snapshotAt)lines.push('잔고 동기화 '+new Date(snapshotAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}));
  if(p.rows.some(r=>r.qty>0&&!r.avgKRW))lines.push('원화 원가 미입력분은 USDT 원가 현재 환산.');
  return lines.join('\n').slice(0,1000);
}
