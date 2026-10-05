import test from 'node:test';
import assert from 'node:assert/strict';
import {formatAmountInput,storedAmountInput,parseAmountInput,koreanAmount} from './amount-input.mjs';

test('세 자리 구분과 소수 자릿수 보존, 붙여넣기와 입력 중 소수점',()=>{
  assert.equal(formatAmountInput('1234567.89000001'),'1,234,567.89000001');
  assert.equal(formatAmountInput('1,234,567.89000001'),'1,234,567.89000001');
  assert.equal(formatAmountInput('0.00000001'),'0.00000001');
  assert.equal(formatAmountInput('1234.'),'1,234.');
  assert.equal(formatAmountInput('.05'),'0.05');
  assert.equal(formatAmountInput('0001200'),'1,200');
  assert.equal(formatAmountInput(''),'');
});
test('금융 입력의 잘못된 문자/음수/중복 소수점은 다른 금액으로 바꾸지 않음',()=>{
  for(const value of ['-100','1e6','100원','1.2.3','Infinity','NaN',''])assert.ok(Number.isNaN(parseAmountInput(value)));
  for(const value of ['-100','1e6','1.2.3'])assert.equal(formatAmountInput(value),value);
  assert.equal(parseAmountInput('1,234,567.89'),1234567.89);
  assert.equal(parseAmountInput('0.00000001'),.00000001);
});
test('저장된 작은 코인 수량을 지수 표기나 반올림 없이 다시 입력',()=>{
  assert.equal(storedAmountInput(1e-8),'0.00000001');
  assert.equal(storedAmountInput(1.234e-7),'0.0000001234');
  assert.equal(storedAmountInput(1e21),'1,000,000,000,000,000,000,000');
});
test('한글 금액의 만·억·조 경계, 0, 소수 수량과 단위 구분',()=>{
  assert.equal(koreanAmount('1,234,567','원'),'백이십삼만 사천오백육십칠 원');
  assert.equal(koreanAmount('100,000,000','원'),'일억 원');
  assert.equal(koreanAmount('1,000,000,000,001','원'),'일조 일 원');
  assert.equal(koreanAmount('0.00000001','개 (BTC)'),'영 점 영 영 영 영 영 영 영 일 개 (BTC)');
  assert.equal(koreanAmount('1,500.25','테더 (USDT)'),'천오백 점 이 오 테더 (USDT)');
  assert.equal(koreanAmount('0','원'),'영 원');
});
