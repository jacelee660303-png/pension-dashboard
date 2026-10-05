export const COINS = [
  {id:'BTC',name:'비트코인',en:'Bitcoin',mark:'₿',weight:.65,period:125,color:'#f4b34c'},
  {id:'ETH',name:'이더리움',en:'Ethereum',mark:'Ξ',weight:.20,period:65,color:'#91a7ff'},
  {id:'BNB',name:'비앤비',en:'BNB',mark:'◇',weight:.075,period:75,color:'#ebd05e'},
  {id:'SOL',name:'솔라나',en:'Solana',mark:'≋',weight:.075,period:210,color:'#8be2c1'},
];
// Reference assets can be held and valued, but do not enter strategy targets or backtests.
export const WATCH_COINS = [{id:'XRP',name:'엑스알피',en:'XRP',mark:'×',weight:0,period:235,color:'#b4c9e1',reference:true}];
export const MARKET_COINS = [...COINS,...WATCH_COINS];
export const DAY=86400000;
export const finite = x => typeof x==='number' && Number.isFinite(x);
export function sma(a,n){let sum=0;return a.map((x,i)=>{sum+=x;if(i>=n)sum-=a[i-n];return i>=n-1?sum/n:null;});}
export function ema(a,n){const r=Array(a.length).fill(null);let s=0,count=0,prev=null;for(let i=0;i<a.length;i++){if(!finite(a[i]))continue;if(prev===null){s+=a[i];count++;if(count===n)prev=s/n;}else prev=a[i]*2/(n+1)+prev*(1-2/(n+1));r[i]=prev;}return r;}
export function rsi(a,n=14){const r=Array(a.length).fill(null);let g=0,l=0;for(let i=1;i<a.length;i++){const d=a[i]-a[i-1];if(i<=n){g+=Math.max(0,d)/n;l+=Math.max(0,-d)/n;}else{g=(g*(n-1)+Math.max(0,d))/n;l=(l*(n-1)+Math.max(0,-d))/n;}if(i>=n)r[i]=l===0?(g===0?50:100):100-100/(1+g/l);}return r;}
export function indicators(bars,period){const close=bars.map(x=>x.c),fast=ema(close,12),slow=ema(close,26),macd=close.map((_,i)=>finite(fast[i])&&finite(slow[i])?fast[i]-slow[i]:null),signal=ema(macd,9),mid=sma(close,20),ma=sma(close,period);const upper=mid.map((m,i)=>m===null?null:m+2*Math.sqrt(close.slice(i-19,i+1).reduce((s,x)=>s+(x-m)**2,0)/20)),lower=mid.map((m,i)=>m===null?null:2*m-upper[i]);const tr=bars.map((b,i)=>Math.max(b.h-b.l,i?Math.abs(b.h-bars[i-1].c):0,i?Math.abs(b.l-bars[i-1].c):0));let av=null;const atr=tr.map((v,i)=>{if(i===13)av=tr.slice(0,14).reduce((a,b)=>a+b,0)/14;else if(i>13)av=(av*13+v)/14;return av;});return {ma,ma20:mid,ma50:sma(close,50),ma200:sma(close,200),rsi:rsi(close),macd,signal,hist:macd.map((v,i)=>finite(v)&&finite(signal[i])?v-signal[i]:null),upper,lower,atr};}
export function normalizeKlines(rows){if(!Array.isArray(rows))throw Error('캔들 응답 형식 오류');const bars=rows.map(k=>({t:+k[0],o:+k[1],h:+k[2],l:+k[3],c:+k[4],v:+k[5],end:+k[6]}));if(bars.some((b,i)=>!Object.values(b).every(finite)||b.c<=0||b.o<=0||b.l<=0||b.h<Math.max(b.o,b.c)||b.l>Math.min(b.o,b.c)||b.v<0||b.end!==b.t+DAY-1||(i>0&&b.t!==bars[i-1].t+DAY)))throw Error('캔들 누락 또는 잘못된 시세');return bars;}
export function confirmed(bars,now=Date.now()){return bars.filter(b=>b.end<now);}
export function crossing(prev,previousMA,last,lastMA){if(![prev,previousMA,last,lastMA].every(finite))return 'unknown';return prev<=previousMA&&last>lastMA?'up':prev>=previousMA&&last<lastMA?'down':'none';}
export function signalHistory(bars,period,now=Date.now()){
 const closed=confirmed(bars,now),ma=sma(closed.map(b=>b.c),period),events=[];
 for(let i=period;i<closed.length;i++){
  const type=crossing(closed[i-1].c,ma[i-1],closed[i].c,ma[i]);
  if(type==='up'||type==='down')events.push({t:closed[i].t,type,price:closed[i].c,ma:ma[i],confirmed:true,nextOpenTime:closed[i].end+1});
 }
 return events;
}
export function analyze(bars,period,now=Date.now()){const closed=confirmed(bars,now),ind=indicators(closed,period),i=closed.length-1;if(i<period)return null;const cross=crossing(closed[i-1].c,ind.ma[i-1],closed[i].c,ind.ma[i]);const current=bars.find(b=>b.t<=now&&b.end>=now);const liveMA=current?(closed.slice(-(period-1)).reduce((s,b)=>s+b.c,0)+current.c)/period:null;let recent=null;for(let j=i;j>=period;j--){const c=crossing(closed[j-1].c,ind.ma[j-1],closed[j].c,ind.ma[j]);if(c==='up'||c==='down'){recent={type:c,date:closed[j].t,price:closed[j].c};break;}}const volumeBase=closed.slice(-21,-1).reduce((s,b)=>s+b.v,0)/20;return {closed,ind,cross,recent,above:closed[i].c>ind.ma[i],ma:ind.ma[i],liveMA,closedAt:closed[i].end,close:closed[i].c,rsi:ind.rsi[i],macd:ind.macd[i],hist:ind.hist[i],atr:ind.atr[i],bbPosition:(closed[i].c-ind.lower[i])/(ind.upper[i]-ind.lower[i]||1),volumeRatio:volumeBase?closed[i].v/volumeBase:null,stale:now-closed[i].end>DAY+120000};}
export function breakoutProgress(analysis,currentPrice,priceFresh=true){
 const recent=analysis?.recent,hasBreakout=!!recent&&['up','down'].includes(recent.type)&&finite(recent.date)&&finite(recent.price)&&recent.price>0;
 const lastSignal=hasBreakout?(recent.type==='up'?'BUY':'SELL'):null;
 const signal=lastSignal&&!analysis.stale?lastSignal:'WAIT';
 const change=hasBreakout&&!analysis.stale&&priceFresh&&finite(currentPrice)&&currentPrice>0?currentPrice/recent.price-1:null;
 return {signal,lastSignal,date:hasBreakout?recent.date:null,price:hasBreakout?recent.price:null,change:finite(change)?change:null};
}
export function emptyAccount(){return {version:1,cash:0,cashKRW:0,fx:0,holdings:Object.fromEntries(MARKET_COINS.map(c=>[c.id,{qty:0,avg:0}])),journal:[],snapshots:[],updatedAt:null};}
export function validateAccount(a){if(a&&a.cashKRW!==undefined&&(!finite(a.cashKRW)||a.cashKRW<0))throw Error('원화 잔고를 확인하세요.');if(!a||a.version!==1||!finite(a.cash)||a.cash<0||!finite(a.fx)||a.fx<0||!a.holdings)throw Error('유효하지 않은 잔고 파일입니다.');if(!Object.hasOwn(a.holdings,'XRP'))a={...a,holdings:{...a.holdings,XRP:{qty:0,avg:0}}};for(const c of MARKET_COINS){const h=a.holdings[c.id];if(h?.avgKRW!==undefined&&h.avgKRW!==null&&(!finite(h.avgKRW)||h.avgKRW<0))throw Error('원화 매입가를 확인하세요.');if(!h||![h.qty,h.avg].every(x=>finite(x)&&x>=0&&x<1e15))throw Error(c.id+' 수량/매입가를 확인하세요.');}if(!Array.isArray(a.journal)||a.journal.length>10000||!Array.isArray(a.snapshots)||a.snapshots.length>5000)throw Error('기록 형식을 확인하세요.');for(const j of a.journal)if((j.currency!==undefined&&!['KRW','USDT'].includes(j.currency))||(j.currency==='KRW'&&(!finite(j.fx)||j.fx<=0))||!MARKET_COINS.some(c=>c.id===j.coin)||!['buy','sell'].includes(j.side)||![j.qty,j.price,j.fee].every(x=>finite(x)&&x>=0)||!Number.isFinite(Date.parse(j.date))||typeof j.note!=='string'||j.note.length>1000)throw Error('잘못된 거래 기록입니다.');for(const s of a.snapshots)if(!finite(s.t)||!finite(s.value)||s.value<0)throw Error('잘못된 평가 기록입니다.');return a;}
export function portfolio(a,prices,fx=0){
 const cashKRW=a.cashKRW||0;let value=a.cash+(fx>0?cashKRW/fx:0),cost=0,costKRW=0,missing=cashKRW>0&&!(fx>0),knownCost=true;
 const rows=MARKET_COINS.map(c=>{
  const h=a.holdings[c.id]??{qty:0,avg:0},p=prices[c.id];if(h.qty>0&&!finite(p))missing=true;if(h.qty>0&&h.avg===0)knownCost=false;
  const v=h.qty===0?0:finite(p)?h.qty*p:null,basis=h.qty*h.avg,krwBasis=h.qty*(h.avgKRW>0?h.avgKRW:h.avg*fx),pnl=v===null||h.qty>0&&h.avg===0?null:v-basis;
  cost+=basis;costKRW+=krwBasis;if(v!==null)value+=v;
  const pnlKRW=finite(v)&&fx>0&&finite(pnl)?v*fx-krwBasis:null;
  return {...c,...h,price:p,value:v,cost:basis,costKRW:fx>0?krwBasis:null,pnl,pnlKRW,return:basis>0&&finite(pnl)?pnl/basis:null,returnKRW:krwBasis>0&&finite(pnlKRW)?pnlKRW/krwBasis:null};
 });
 if(missing)return {rows,value:null,valueKRW:null,cost,pnl:null,pnlKRW:null,cash:a.cash,cashKRW,cashTotal:null};
 const strategyValue=value-rows.filter(r=>r.reference).reduce((sum,r)=>sum+r.value,0);
 for(const r of rows){r.actual=value?r.value/value:0;r.target=r.reference?null:strategyValue*r.weight;r.delta=r.reference?null:r.target-r.value;}
 return {rows,value,valueKRW:fx>0?value*fx:null,cost,costKRW:fx>0?costKRW:null,pnl:knownCost?rows.reduce((s,r)=>s+r.pnl,0):null,pnlKRW:knownCost&&fx>0?rows.reduce((s,r)=>s+r.pnlKRW,0):null,cash:a.cash,cashKRW,cashTotal:fx>0?a.cash+cashKRW/fx:cashKRW?null:a.cash};
}

export function manualCost(previous,amount,currency,fx){
 if(!finite(amount)||amount<0||!['KRW','USDT'].includes(currency))throw Error('매입가를 확인하세요.');
 if(amount===0)return {avg:0,avgKRW:null};
 if(currency==='KRW'){if(previous.avgKRW===amount&&previous.avg>0)return {avg:previous.avg,avgKRW:amount};if(!(finite(fx)&&fx>0))throw Error('원화 환산 가격이 필요합니다.');return {avg:amount/fx,avgKRW:amount};}
 return {avg:amount,avgKRW:previous.avg===amount?previous.avgKRW??null:null};
}
export function quantityFromInput(amount,mode,price,fx){if(!finite(amount)||amount<0)throw Error('잔고는 0 이상의 숫자로 입력하세요.');if(mode==='qty'||amount===0)return amount;if(!['KRW','USDT'].includes(mode)||!finite(price)||price<=0)throw Error('금액 입력에는 최신 코인 시세가 필요합니다.');if(mode==='KRW'&&(!finite(fx)||fx<=0))throw Error('원화 환산 가격이 필요합니다.');return amount/(price*(mode==='KRW'?fx:1));}
export function intradaySignal(a,period,price){if(!a||!finite(price)||price<=0||a.closed.length<period)return null;const threshold=a.closed.slice(-(period-1)).reduce((s,b)=>s+b.c,0)/(period-1),ma=(threshold*(period-1)+price)/period;const cross=crossing(a.close,a.ma,price,ma);return {ma,threshold,cross,distance:price/ma-1};}
export function applyTrade(account,trade){const a=structuredClone(validateAccount(account));const {coin,side,qty,price,fee}=trade,currency=trade.currency||'USDT',fx=currency==='KRW'?trade.fx:1;if(!MARKET_COINS.some(c=>c.id===coin)||!['buy','sell'].includes(side)||!['KRW','USDT'].includes(currency)||![qty,price,fx].every(x=>finite(x)&&x>0)||!finite(fee)||fee<0||!Number.isFinite(Date.parse(trade.date)))throw Error('거래 입력값을 확인하세요.');const key=currency==='KRW'?'cashKRW':'cash';a.cashKRW=a.cashKRW||0;const h=a.holdings[coin];if(side==='buy'){const amount=qty*price+fee;if(amount>a[key]+1e-8)throw Error(`${currency} 현금 잔고가 부족합니다. 잔고를 먼저 수정하세요.`);const krwAmount=currency==='KRW'?amount:trade.fx>0?amount*trade.fx:null;h.avgKRW=finite(krwAmount)&&(h.qty===0||h.avgKRW>0)?((h.qty*h.avgKRW||0)+krwAmount)/(h.qty+qty):null;h.avg=h.qty>0&&h.avg===0?0:(h.qty*h.avg+amount/fx)/(h.qty+qty);h.qty+=qty;a[key]=Math.max(0,a[key]-amount);}else{if(qty>h.qty)throw Error('보유 수량보다 많이 매도할 수 없습니다.');if(fee>qty*price)throw Error('수수료가 매도 금액을 초과합니다.');a[key]+=qty*price-fee;h.qty=Math.max(0,h.qty-qty);if(h.qty===0){h.avg=0;h.avgKRW=null;}}a.journal.unshift({...trade,currency,note:String(trade.note||'').slice(0,1000)});a.updatedAt=new Date().toISOString();return validateAccount(a);}
export function backtest(markets,days=365,now=Date.now()){
 const series=COINS.map(c=>{const bars=confirmed(markets[c.id]||[],now);return {c,bars,ma:sma(bars.map(b=>b.c),c.period)};});
 if(series.some(s=>s.bars.length< s.c.period+3))return null;
 const start=Math.max(...series.map(s=>s.bars[s.c.period+1].t)),end=Math.min(...series.map(s=>s.bars.at(-1).t));const from=Math.max(start,end-(days-1)*DAY);if(from>end)return null;
 const sleeves=series.map(s=>({...s,cash:s.c.weight,qty:0,map:new Map(s.bars.map((b,i)=>[b.t,i])),base:null}));let peak=1,mdd=0,trades=0;const points=[],benchmark=[];const buy=(1+.0005)**2,sell=(1-.0005)**2;
 for(let t=from;t<=end;t+=DAY){let value=0,hold=0;for(const s of sleeves){const i=s.map.get(t);if(i===undefined||i<2)return null;const b=s.bars[i],cross=crossing(s.bars[i-2].c,s.ma[i-2],s.bars[i-1].c,s.ma[i-1]);if(s.qty>0&&cross==='down'){s.cash=s.qty*b.o*sell;s.qty=0;trades++;}else if(s.qty===0&&cross==='up'){s.qty=s.cash/(b.o*buy);s.cash=0;trades++;}if(s.base===null)s.base=b.o*buy;if(t===end&&s.qty){s.cash=s.qty*b.c*sell;s.qty=0;trades++;}value+=s.cash+s.qty*b.c;hold+=s.c.weight*b.c/s.base*(t===end?sell:1);}peak=Math.max(peak,value);mdd=Math.min(mdd,value/peak-1);points.push({t,c:value});benchmark.push({t,c:hold});}
 const last=points.at(-1).c;return {points,benchmark,return:last-1,cagr:last**(365.25/points.length)-1,mdd,trades,from,end};
}
