// Keep the decimal text intact while editing; grouping must never round coin quantities.
const clean = value => String(value ?? '').normalize('NFKC').replace(/,/g, '').trim();
const decimal = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

export function parseAmountInput(value) {
  const raw = clean(value);
  if (!decimal.test(raw)) return NaN;
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? number : NaN;
}

export function formatAmountInput(value) {
  const raw = clean(value);
  if (!raw) return '';
  if (!decimal.test(raw) && raw !== '.') return String(value);
  const [whole, fraction] = raw.split('.');
  const integer = (whole || '0').replace(/^0+(?=\d)/, '');
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : '.' + fraction);
}

export function storedAmountInput(value) {
  const str = String(value);
  if (!/[eE]/.test(str)) return formatAmountInput(str);
  const [coefficient, exponent] = str.toLowerCase().split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  const digits = whole + fraction, position = whole.length + Number(exponent);
  const expanded = position <= 0 ? '0.' + '0'.repeat(-position) + digits
    : position >= digits.length ? digits + '0'.repeat(position - digits.length)
    : digits.slice(0, position) + '.' + digits.slice(position);
  return formatAmountInput(expanded);
}

const syllables = ['영','일','이','삼','사','오','육','칠','팔','구'];
const units = ['', '만', '억', '조', '경', '해', '자', '양', '구', '간', '정'];
function readGroup(group) {
  return String(Number(group)).split('').map((digit, index, digits) => {
    const n = Number(digit), place = digits.length - index - 1;
    return n ? (n === 1 && place ? '' : syllables[n]) + ['', '십', '백', '천'][place] : '';
  }).join('');
}

export function koreanAmount(value, unit = '') {
  const raw = clean(value);
  if (!raw) return '숫자를 입력하세요.';
  if (!decimal.test(raw)) return '숫자와 소수점만 입력하세요.';
  const [whole, fraction] = raw.split('.'), integer = (whole || '0').replace(/^0+(?=\d)/, '');
  if (integer.length > units.length * 4) return '입력한 숫자가 너무 큽니다.';
  const groups = [];
  for (let end = integer.length, i = 0; end > 0; end -= 4, i++) {
    const group = integer.slice(Math.max(0, end - 4), end);
    if (Number(group)) groups.unshift(readGroup(group) + units[i]);
  }
  const words = (groups.join(' ') || '영') + (fraction ? ' 점 ' + [...fraction].map(n => syllables[+n]).join(' ') : '');
  return words + (unit ? ' ' + unit : '');
}

export function formatAmountField(input) {
  if (!input?.matches?.('[data-amount-input]')) return;
  const before = input.value, start = input.selectionStart ?? before.length;
  const raw = clean(before), formatted = formatAmountInput(before);
  if (formatted !== before) {
    let logical = clean(before.slice(0, start)).length;
    const leadingZeros = raw.match(/^0+(?=\d)/)?.[0].length || 0;
    logical = Math.max(0, logical - Math.min(logical, leadingZeros));
    if (raw.startsWith('.')) logical++;
    input.value = formatted;
    let caret = 0, count = 0;
    while (caret < formatted.length && count < logical) {if (formatted[caret] !== ',') count++; caret++;}
    input.setSelectionRange(caret, caret);
  }
  input.setCustomValidity(input.value && !Number.isFinite(parseAmountInput(input.value)) ? '0 이상의 숫자를 입력하세요. 소수점은 한 번만 사용할 수 있습니다.' : '');
}
