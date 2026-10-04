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

전일 종가 ≤ 전일 SMA이고 최근 확정 종가 > 해당일 SMA이면 상향 돌파입니다. 하향 돌파는 부등호를 반대로 적용합니다. 확정 신호 다음 일봉 시가에 해당 종목 자금을 전액 진입/청산하는 기존 연구 규칙을 사용합니다. 종목별 자금을 독립 운용하며, 종목 간 자금 이동과 자동 리밸런싱은 하지 않습니다. 가격이 이미 이평선 위에 있을 때 신규 돌파 없이 진입하지 않습니다.

실시간 예고는 직전 확정 일봉과 현재가를 비교합니다. 현재 일봉을 포함한 N일 SMA의 돌파 기준가격은 직전 N−1일 종가 평균입니다. 장중 예고는 종가 확정 신호와 구분합니다. 앱은 주문을 실행하지 않습니다.

## 잔고와 통화

- 원화 현금과 USDT 현금을 각각 입력합니다.
- 코인은 수량, 원화 평가금액, USDT 평가금액 중 선택합니다. 금액은 저장 시점의 시세로 수량으로 환산합니다.
- 평균 매입가는 USDT 또는 원화로 입력합니다. 0이면 미입력으로 취급하고 알 수 없는 손익은 표시하지 않습니다.
- 원화 총자산 = 원화 현금 + (USDT 현금 + 코인 USDT 평가금액) × USDT/KRW 가격.
- 자동 환산은 업비트 KRW-USDT 시장가격입니다. 은행 USD/KRW 환율이 아니며 국내 USDT 프리미엄을 포함할 수 있습니다. 수동 가격을 설정하면 이를 우선합니다.
- 원화/USDT 거래를 기록하면 선택한 통화의 현금 잔고를 차감·증가시키고 수량과 평균원가를 반영합니다. 수수료도 선택한 결제 통화 기준입니다. 코인으로 부과된 수수료는 결제 통화로 환산하여 기록해야 합니다.
- 평균원가는 USDT로 보관합니다. 원화 매입가는 입력/기록 시 환산 가격으로 변환합니다. 손익을 원화로 표시할 때는 현재 환산 가격을 적용하므로 실제 원화 원가 대비 수익과 다를 수 있습니다. 과거 거래의 환산 가격이 필요하면 잔고 입력에서 수동 가격을 사용하고 이후 0으로 되돌립니다.
- 원화 가격 차트는 과거 USDT 가격 전체에 **현재** 환산 가격을 적용합니다. 과거 원화 시장가격이나 과거 환율을 복원한 차트가 아닙니다. 신호는 항상 Binance USDT 기준입니다.

## 데이터와 업데이트

- Binance public market data REST + WebSocket: BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT. UTC 일봉 마감은 한국 오전 9시입니다.
- 공개 티커와 환산 가격은 스트림 + 30초 폴링, 일봉 1,000개는 초기 및 5분마다 갱신합니다. 탭을 다시 열면 재조회합니다.
- 2분 이상 지연된 티커는 실시간 판정을 보류하고 마지막 수신값임을 표시합니다. 일봉이 누락된 경우 확정 신호를 경고합니다.
- 기술지표: Wilder RSI14, EMA MACD(12,26,9), SMA20 ± 2σ 볼린저 밴드, Wilder ATR14, 이전 20일 평균 대비 거래량, BTC 관측 365일 고점 대비 낙폭, ETH/BTC 비율, Alternative.me 공포·탐욕 지수.
- 시뮬레이션은 65/20/7.5/7.5 초기 배분, 신규 돌파 대기, 다음 시가 체결, 수수료 0.05%와 슬리피지 0.05% 각각 적용, 마지막 종가 청산입니다. 같은 비중 단순 보유에도 같은 비용을 적용합니다. 세금·현금 이자는 제외합니다. 과거 성과는 미래 수익을 보장하지 않습니다.
- 기존 분석은 USD 자료였으므로 Binance USDT 자료와 가격/신호가 다를 수 있습니다.
- API 접속 제한 또는 서비스 장애 시 데이터를 만들어 보여주지 않습니다. 오류 상태와 마지막 수신값을 표시합니다. 앱이 열려 있을 때만 갱신하며 닫힌 상태의 알림이나 주문 기능은 없습니다.

## 개인정보와 보관

잔고·거래 기록은 브라우저 localStorage에만 저장됩니다. 서버나 GitHub에 보내지 않습니다. 같은 브라우저·같은 사이트에서 유지되며, 다른 기기로 이동할 때 JSON 백업을 내보내고 가져옵니다. 브라우저 데이터를 삭제하면 잔고도 삭제됩니다. 백업에는 금융 정보가 포함되므로 개인적으로 보관하세요. 공개 저장소에는 코드만 포함되며 실제 잔고와 연구 원본 파일은 포함하지 않습니다.

## 실행 / 검증

외부 JavaScript 라이브러리 또는 빌드 설치가 필요 없는 정적 웹 앱입니다. Node.js 22 이상에서:

```sh
node server.mjs
node --test engine.test.mjs
```

`http://127.0.0.1:4173`에서 열 수 있습니다. 배포는 `index.html`, `style.css`, `app.mjs`, `engine.mjs`, `charts.mjs`, `icon.svg`를 함께 제공하면 됩니다. GitHub Pages는 `main` 루트의 `crypto/` 하위 디렉터리를 그대로 제공합니다.

## 공식 자료

- [Binance 공개 시장 데이터](https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md)
- [Binance WebSocket](https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md)
- [Upbit 현재가](https://docs.upbit.com/kr/reference/list-tickers)
- [Upbit WebSocket 현재가](https://docs.upbit.com/kr/reference/websocket-ticker)
- [Alternative.me Crypto Fear & Greed](https://alternative.me/crypto/fear-and-greed-index/)
