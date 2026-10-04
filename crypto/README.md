# JACE · Crypto Observatory

실시간 시세와 이동평균 매매 신호, 원화·USDT·코인 잔고를 함께 보는 개인 대시보드.

## 온라인 앱

https://jacelee660303-png.github.io/pension-dashboard/crypto/

기존 연금 대시보드와 독립된 `crypto/` 경로입니다. 원래 홈페이지는 변경하지 않습니다.

## 투자 규칙

| 종목 | 초기 목표 비중 | 일봉 단순이동평균 |
|---|---:|---:|
| BTC | 65% | 125일 |
| ETH | 20% | 65일 |
| BNB | 7.5% | 75일 |
| SOL | 7.5% | 210일 |
| XRP | 참고 보유 · 목표 배분 없음 | 235일 |

전일 종가 ≤ 전일 SMA이고 최근 확정 종가 > 해당일 SMA이면 상향 돌파입니다. 하향 돌파는 부등호를 반대로 적용합니다. 확정 신호 다음 일봉 시가에 해당 종목 자금을 전액 진입/청산하는 기존 연구 규칙을 사용합니다. 종목별 자금을 독립 운용하며, 종목 간 자금 이동과 자동 리밸런싱은 하지 않습니다. 가격이 이미 이평선 위에 있을 때 신규 돌파 없이 진입하지 않습니다.

실시간 예고는 직전 확정 일봉과 현재가를 비교합니다. 현재 일봉을 포함한 N일 SMA의 돌파 기준가격은 직전 N−1일 종가 평균입니다. 장중 예고는 종가 확정 신호와 구분합니다. 앱은 주문을 실행하지 않습니다.

## 잔고와 통화

- 원화 현금과 USDT 현금을 각각 입력합니다.
- 코인은 수량, 원화 평가금액, USDT 평가금액 중 선택합니다. 금액은 저장 시점의 시세로 수량으로 환산합니다.
- 평균 매입가는 USDT 또는 원화로 입력합니다. 0이면 미입력으로 취급하고 알 수 없는 손익은 표시하지 않습니다.
- 원화 총자산 = 원화 현금 + (USDT 현금 + 코인 USDT 평가금액) × USDT/KRW 가격.
- 자동 환산은 업비트 KRW-USDT 시장가격입니다. 은행 USD/KRW 환율이 아니며 국내 USDT 프리미엄을 포함할 수 있습니다. 수동 가격을 설정하면 이를 우선합니다.
- 원화/USDT 거래를 기록하면 선택한 통화의 현금 잔고를 차감·증가시키고 수량과 평균원가를 반영합니다. 수수료도 선택한 결제 통화 기준입니다. 코인으로 부과된 수수료는 결제 통화로 환산하여 기록해야 합니다.
- 원화 매입가는 원화 원가와 입력 당시 USDT 환산 원가를 함께 보관합니다. 원화 손익은 현재 원화 평가액에서 저장된 원화 원가를 차감합니다. 기존 USDT 원가만 있는 종목은 현재 환산값을 사용하며 이를 표시합니다. 현금만 수정하거나 같은 매입가를 다시 저장할 때 기존 원가는 유지됩니다. 과거 거래의 환산 가격이 필요하면 잔고 입력에서 수동 가격을 사용하고 이후 0으로 되돌립니다.
- 원화 가격 차트는 과거 USDT 가격 전체에 **현재** 환산 가격을 적용합니다. 과거 원화 시장가격이나 과거 환율을 복원한 차트가 아닙니다. 신호는 항상 Binance USDT 기준입니다.

## 데이터와 업데이트

- Binance public market data REST + WebSocket: BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT, XRPUSDT. XRP는 수량·원화/USDT 금액·매입가 입력, 거래 기록, 총자산·손익·실제 배분·보고서에 포함합니다. 기존 4종목 목표 비중과 전략 성과는 유지하며, 목표 금액 계산의 기준 자금에서 XRP 평가액을 제외합니다. XRP 자체의 목표/차액은 제시하지 않습니다. 기존 4종목 백업은 XRP 0으로 호환됩니다. 차트의 B/S는 과거 확정 교차, 점선 B?/S?는 장중 예고입니다. UTC 일봉 마감은 한국 오전 9시입니다.
- 공개 티커와 환산 가격은 스트림 + 30초 폴링, 일봉 1,000개는 초기 및 5분마다 갱신합니다. 탭을 다시 열면 재조회합니다.
- 2분 이상 지연된 티커는 실시간 판정을 보류하고 마지막 수신값임을 표시합니다. 일봉이 누락된 경우 확정 신호를 경고합니다.
- 기술지표: Wilder RSI14, EMA MACD(12,26,9), SMA20 ± 2σ 볼린저 밴드, Wilder ATR14, 이전 20일 평균 대비 거래량, BTC 관측 365일 고점 대비 낙폭, ETH/BTC 비율, Alternative.me 공포·탐욕 지수.
- 시뮬레이션은 65/20/7.5/7.5 초기 배분, 신규 돌파 대기, 다음 시가 체결, 수수료 0.05%와 슬리피지 0.05% 각각 적용, 마지막 종가 청산입니다. 같은 비중 단순 보유에도 같은 비용을 적용합니다. 세금·현금 이자는 제외합니다. 과거 성과는 미래 수익을 보장하지 않습니다.
- 기존 분석은 USD 자료였으므로 Binance USDT 자료와 가격/신호가 다를 수 있습니다.
- API 접속 제한 또는 서비스 장애 시 데이터를 만들어 보여주지 않습니다. 오류 상태와 마지막 수신값을 표시합니다. 화면 시세는 앱이 열려 있을 때 갱신합니다. 주문 실행 기능은 없습니다. 카카오 보고서는 별도 서버 연결 후 브라우저가 닫혀도 예약 실행됩니다.

## 개인정보와 보관

기본 잔고·거래 기록은 브라우저 localStorage에 저장됩니다. 카카오 발송 시작/잔고 동기화 버튼을 누르면 수량·매입가·현금만 본인의 비공개 보고서 서버로 전송합니다. 거래 일지·메모는 전송하지 않습니다. 공개 GitHub에는 실제 잔고를 올리지 않습니다. 같은 브라우저·같은 사이트에서 유지되며, 다른 기기로 이동할 때 JSON 백업을 내보내고 가져옵니다. 브라우저 데이터를 삭제하면 잔고도 삭제됩니다. 백업에는 금융 정보가 포함되므로 개인적으로 보관하세요. 공개 저장소에는 코드만 포함되며 실제 잔고와 연구 원본 파일은 포함하지 않습니다.

## 실행 / 검증

외부 JavaScript 라이브러리 또는 빌드 설치가 필요 없는 정적 웹 앱입니다. Node.js 22 이상에서:

```sh
node server.mjs
node --test engine.test.mjs report.test.mjs
```

`http://127.0.0.1:4173`에서 열 수 있습니다. 배포는 `index.html`, `style.css`, `app.mjs`, `engine.mjs`, `charts.mjs`, `reports.mjs`, `report-core.mjs`, `kakao-setup.html`, `icon.svg`를 함께 제공하면 됩니다. GitHub Pages는 `main` 루트의 `crypto/` 하위 디렉터리를 그대로 제공합니다.

## 공식 자료

- [Binance 공개 시장 데이터](https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md)
- [Binance WebSocket](https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md)
- [Upbit 현재가](https://docs.upbit.com/kr/reference/list-tickers)
- [Upbit WebSocket 현재가](https://docs.upbit.com/kr/reference/websocket-ticker)
- [Alternative.me Crypto Fear & Greed](https://alternative.me/crypto/fear-and-greed-index/)

## 카카오 데일리 리포트

수신자는 본인 카카오톡 나와의 채팅입니다. [연결 안내](kakao-setup.html)에 카카오 앱 생성부터 서버 설치까지 정리했습니다. **카카오 앱/서버 미연결 상태에서는 실제 자동 발송이 시작되지 않습니다.**

- `kakao-worker/worker.mjs` + `wrangler.jsonc`: Cloudflare Worker/Durable Object 단일 사용자 예약 서버. 매일 UTC 03:00 = KST 12:00.
- REST API 키와 클라이언트 시크릿, 32자 이상 무작위 관리 키는 Worker secrets에만 설정합니다. 관리 키는 브라우저 저장소/백업에 저장하지 않습니다.
- 카카오 OAuth state 만료/일회성 검증, 토큰 자동 갱신 및 회전 저장, 허용 Origin·관리 키 검증, 외부 cron 경로 차단을 적용합니다.
- 시작일/종료일을 KST로 비교하고 양 끝을 포함합니다. 실제 서버 응답 후 활성 상태를 표시하며, 새로고침 후에는 연결 상태 확인이 필요합니다. 기간을 바꾸면 시작 버튼으로 재적용합니다.
- 시작 시 잔고 스냅샷을 업로드합니다. 잔고 변경 후 별도 동기화가 필요하며 서버는 매번 최신 시세/환산 가격을 조회합니다. 서버 보고서는 수동 환산 가격 대신 Upbit 현재 가격을 씁니다.
- 같은 날짜의 발송 시도를 저장해 중복을 차단합니다. 전송 결과가 불명확하면 같은 날 재시도하지 않습니다. 오래된 시세/인증 오류 시 발송을 보류합니다.
- 초기 서버 배포·실계정 OAuth·실제 메시지 발송은 계정 설정 이후 확인해야 합니다. 제공 테스트는 시세·카카오 API를 대체한 검증이며 실제 발송을 뜻하지 않습니다.
- 검증: 계산/서버 로직 및 XRP 잔고 호환 테스트 통과, 데스크톱·375px 모바일 화면 확인. 로컬 Wrangler 배포 전 검증은 PC 패키지 도구의 의존성 누락으로 실행되지 않아 실제 Cloudflare 배포 검증은 남아 있습니다.

공식 자료: [카카오 나에게 메시지](https://developers.kakao.com/docs/ko/kakaotalk-message/rest-api), [카카오 로그인](https://developers.kakao.com/docs/ko/kakaologin/rest-api), [Cloudflare Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
