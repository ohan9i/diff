/* ===========================================================
   열공장 타이쿤 — 게임 모델 (공식, 경제, 저장, 레벨, 목표, 업적)
   화면과 분리된 순수 로직. React 화면은 G 를 읽고 아래 함수로만 바꾼다.
   =========================================================== */
import { PHYS } from './core.js';

/* ---------------- 이벤트 ---------------- */
const listeners = {};
export function on(ev, fn) { (listeners[ev] ||= new Set()).add(fn); return () => listeners[ev].delete(fn); }
export function emit(ev, ...a) { (listeners[ev] || []).forEach(fn => fn(...a)); }

/* ---------------- 단위 포맷 ---------------- */
/* ---------------- 단위 포맷 ---------------- */
function si(v, unit, d = 2) {
  const a = Math.abs(v);
  const P = [[1e15, 'P'], [1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k']];
  for (const [f, p] of P) if (a >= f) return (v / f).toFixed(d) + ' ' + p + unit;
  if (a < 10 && a > 0) return v.toFixed(a < 0.01 ? 4 : 2) + ' ' + unit;
  return Math.floor(v).toLocaleString('ko-KR') + ' ' + unit;
}
const fJ = (v) => si(v, 'J');
const fW = (v) => si(v, 'W');
function fG(v) { return Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + ' t' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(2) + ' kg' : (Math.abs(v) < 10 ? v.toFixed(3) : Math.floor(v)) + ' g'; }
const fCur = (v, cur) => cur === 'W' ? fG(v) : fJ(v);
const num = (v) => Math.abs(v) >= 1e4 || (Math.abs(v) < 0.01 && v !== 0) ? v.toExponential(2) : +v.toPrecision(4);

/* ---------------- 공식(=기계) 정의 ---------------- */
const SIGMA = 5.67e-8;
const FORMULAS = [
  {
    id: 'fourier', name: '푸리에 법칙 (전도)', tag: '열', cost: 0,
    desc: '고체 속에서 원자의 진동이 충돌로 전해지는 전도. 열류는 온도차와 열전도율에 비례하고 두께에 반비례해요.',
    tex: String.raw`q=k\,\frac{\Delta T}{\Delta x},\qquad \dot Q = q\,A`,
    params: [
      { id: 'k', label: '재료 (열전도율 k)', values: [0.035, 0.13, 0.7, 1.5, 50, 200, 400, 2000], names: ['EPS 단열재', '목재', '벽돌', '콘크리트', '강철', '알루미늄', '구리', '다이아몬드'], unit: 'W/(m·K)', base: 15, growth: 6, why: 'q ∝ k : k가 크면 열이 잘 통해요' },
      { id: 'dT', label: '온도차 ΔT', fn: L => 10 + 10 * L, max: 40, unit: 'K', base: 8, growth: 1.42, why: 'q ∝ ΔT : 포텐셜 차이가 원동력' },
      { id: 'dx', label: '두께 Δx', values: [0.5, 0.3, 0.2, 0.1, 0.05, 0.03, 0.02, 0.01], unit: 'm', base: 20, growth: 4, why: 'q ∝ 1/Δx : 얇을수록 잘 통해요' },
      { id: 'A', label: '단면적 A', fn: L => 1 + L, max: 60, unit: 'm²', base: 12, growth: 1.45, why: 'Q = qA : 면적에 비례' },
    ],
    out(p) { return p.k * p.dT / p.dx * p.A * (has('parallel') ? P('parallel', 'N') : 1); },
    subst(p) { const N = has('parallel') ? P('parallel', 'N') : 1; return `${N > 1 ? N + '개 × ' : ''}${p.k} × ${p.dT} / ${p.dx} × ${p.A} = ${fW(this.out(p))}`; },
    heat: true,
  },
  {
    id: 'parallel', name: '병렬 연결 (컨덕턴스의 합)', tag: '열', cost: 300,
    desc: '열이 지나갈 길이 나란히 여러 개면 컨덕턴스(1/R)가 더해져요. 푸리에 막대를 여러 개 설치할 수 있게 됩니다. 벽 속 콘크리트 기둥처럼 작은 면적이 큰 열손실을 만드는 이유이기도 해요.',
    tex: String.raw`\frac{1}{R_t}=\frac{1}{R_1}+\frac{1}{R_2}+\cdots,\qquad q_t=q_1+q_2+\cdots`,
    params: [{ id: 'N', label: '푸리에 막대 수 N', fn: L => 1 + L, max: 40, unit: '개', base: 150, growth: 1.7, why: '병렬이면 열류가 더해져요' }],
    out() { return 0; }, subst() { return `푸리에 출력 × ${P('parallel', 'N')} (막대 ${P('parallel', 'N')}개가 나란히)`; },
  },
  {
    id: 'series', name: '직렬 저항 (단열 층 쌓기)', tag: '열', cost: 1500,
    desc: '고객에게 열을 배달하는 배관에서 열이 새요. 단열 층을 직렬로 쌓으면 저항이 더해져서(R<sub>t</sub>=ΣR) 손실이 줄고, 배송 효율 η가 올라갑니다. 모든 열 수입에 곱해져요.',
    tex: String.raw`R_t=R_1+R_2+\cdots,\qquad \eta=\frac{R_t}{R_t+R_0}\;(R_0=0.5)`,
    params: [{ id: 'Rt', label: '배관 단열 R_t', values: [0.5, 1.0, 2.4, 5.3, 10.3, 20.3, 40.3], names: ['기본 외피', '+ 석고보드', '+ EPS 50 mm', '+ EPS 100 mm', '+ PIR 100 mm', '+ 진공단열재', '+ 진공단열재 2겹'], unit: 'm²K/W', base: 300, growth: 3.5, why: '직렬이면 R이 더해져요' }],
    out() { return 0; }, subst() { const R = P('series', 'Rt'); return `η = ${R} / (${R} + 0.5) = ${(R / (R + 0.5) * 100).toFixed(1)}%`; },
  },
  {
    id: 'conv', name: '뉴턴 냉각 법칙 (대류)', tag: '열', cost: 8000,
    desc: '유체가 움직이며 열을 나르는 대류. 경계층의 복잡한 물리를 h<sub>c</sub> 하나로 묶었어요. 강의 표처럼 기체 자연대류 → 강제대류 → 액체 → 비등·응축 순으로 h가 폭발적으로 커집니다.',
    tex: String.raw`q_c=h_c\,(T_s-T_a),\qquad \dot Q=q_cA`,
    params: [
      { id: 'h', label: '대류 방식 h_c', values: [5, 25, 100, 500, 5000, 50000], names: ['기체 자연대류', '기체 자연(최대)', '기체 강제대류 (팬)', '액체 자연대류', '액체 강제대류 (펌프)', '비등·응축'], unit: 'W/(m²K)', base: 5000, growth: 5, why: 'q ∝ h : 유체·흐름 방식이 핵심' },
      { id: 'dT', label: '표면-유체 온도차', fn: L => 10 + 5 * L, max: 30, unit: 'K', base: 3000, growth: 1.5, why: 'q ∝ (T_s − T_a)' },
      { id: 'A', label: '표면적 A', fn: L => 1 + L, max: 60, unit: 'm²', base: 4000, growth: 1.45, why: 'Q = qA' },
    ],
    out(p) { return p.h * p.dT * p.A; },
    subst(p) { return `${p.h} × ${p.dT} × ${p.A} = ${fW(this.out(p))}`; },
    heat: true,
  },
  {
    id: 'bridge', name: '열교 (선형 열관류율 Ψ)', tag: '열', cost: 40000,
    desc: '단열층을 관통한 콘크리트 슬래브 같은 열교는 단열을 우회하는 지름길이에요. 지금까지 열 수입의 일부(β)가 몰래 새고 있었어요! 디테일을 고쳐 누설을 줄이세요. 열교 찾기 미니게임도 열립니다.',
    tex: String.raw`\dot Q = UA\,\Delta T + \Psi L\,\Delta T,\qquad f_{Rsi}=\frac{T_{si}-T_e}{T_i-T_e}`,
    params: [{ id: 'beta', label: '열교 누설률 β', values: [0.2, 0.12, 0.06, 0.03, 0.01], names: ['열교 방치', '슬래브 외부 단열 감싸기', '단열 브레이크 (Isokorb형)', '열교 없는 디테일', '패시브 인증 디테일'], unit: '', base: 30000, growth: 4, why: '누설 β ↓ → η ↑' }],
    out() { return 0; }, subst() { const b = beta(); return `누설 β = ${(b * 100).toFixed(0)}% → η에 × ${(1 - b).toFixed(2)}`; },
  },
  {
    id: 'rad', name: '스테판-볼츠만 법칙 (복사)', tag: '열', cost: 200000,
    desc: '모든 물체는 온도의 네제곱에 비례해 전자기파를 내보내요. 매질이 없어도 전달돼요. 온도를 조금만 올려도 출력이 폭발하는 T⁴의 힘을 느껴보세요. 반드시 켈빈(K) 온도!',
    tex: String.raw`q=\varepsilon\,\sigma\,(T^4-T_{sur}^4),\quad \sigma=5.67\times10^{-8}`,
    params: [
      { id: 'T', label: '복사판 온도 T', fn: L => 400 + 100 * L, max: 26, unit: 'K', base: 2e5, growth: 1.55, why: 'q ∝ T⁴ : 2배 → 16배!' },
      { id: 'eps', label: '표면 방사율 ε', values: [0.1, 0.3, 0.6, 0.9, 0.98], names: ['광택 알루미늄', '산화 금속', '벽돌', '무광 페인트', '흑체에 가까움'], unit: '', base: 3e5, growth: 4, why: '흑체 ε=1 이 최대 (키르히호프 ε=α)' },
      { id: 'A', label: '복사판 면적 A', fn: L => 1 + L, max: 60, unit: 'm²', base: 2.5e5, growth: 1.6, why: 'Q = qA' },
    ],
    out(p) { return p.eps * SIGMA * (p.T ** 4 - 300 ** 4) * p.A; },
    subst(p) { return `${p.eps} × 5.67e-8 × (${p.T}⁴ − 300⁴) × ${p.A} = ${fW(this.out(p))}`; },
    heat: true,
  },
  {
    id: 'solar', name: '상당외기온도 (일사 흡수)', tag: '열', cost: 1e6,
    desc: '햇빛을 받은 벽은 공기보다 훨씬 뜨거워져요. 흡수한 일사 αq<sub>sol</sub>를 외기온도에 더한 "가상의 온도"가 상당외기온도예요. 낮에만 벌리고 밤에는 0! 위쪽 태양을 보세요.',
    tex: String.raw`T_{sol}=T_{oa}+\frac{\alpha}{h_t}q_{sol}-\frac{\varepsilon}{h_t}q_e,\qquad \dot Q_{abs}=\alpha\,q_{sol}A`,
    params: [
      { id: 'alpha', label: '표면 색 (흡수율 α)', values: [0.25, 0.5, 0.7, 0.92, 0.97], names: ['흰색', '회색', '붉은 벽돌', '검은색', '선택흡수 코팅'], unit: '', base: 1.5e6, growth: 3, why: '어두운 색일수록 α ↑' },
      { id: 'qpk', label: '설치 지역 (최대 일사)', values: [500, 700, 900, 1100], names: ['흐린 도시', '서울 여름', '제주', '사막'], unit: 'W/m²', base: 2e6, growth: 4, why: 'q_sol 최대 ~1000 W/m²' },
      { id: 'A', label: '집열 면적 A', fn: L => 1000 * (1 + L), max: 40, unit: 'm²', base: 1.2e6, growth: 1.5, why: 'Q = αq_sol A' },
    ],
    out(p) { return p.alpha * p.qpk * sunFactor() * p.A; },
    subst(p) { const q = p.qpk * sunFactor(); return `T_sol = 30 + ${p.alpha}/17 × ${q.toFixed(0)} = ${(30 + p.alpha / 17 * q).toFixed(1)} °C,  Q = ${fW(this.out(p))}`; },
    heat: true,
  },
  {
    id: 'cond', name: '이슬점 응축기 (상대습도)', tag: '습기', cost: 5e6, water: true,
    desc: '💧 습기 해금! 30 °C 습한 공기를 냉각 코일로 식혀요. 공기가 품을 수 있는 수증기(포화수증기압 = 컵 크기)는 온도가 정하므로, <b>이슬점 아래로 냉각해야만</b> 물이 나와요. 처음엔 0 g/s 인 이유를 생각해 보세요!',
    tex: String.raw`\varphi=\frac{p}{p_{sat}(T)},\qquad \dot m_w=\dot m_a\,(x_1-x_2),\quad x=622\frac{p}{P-p}`,
    params: [
      { id: 'RH', label: '유입 공기 상대습도 φ', values: [60, 70, 80, 90, 95], unit: '%', base: 1e6, growth: 3, why: 'φ ↑ → 이슬점 ↑ → 물 ↑' },
      { id: 'T2', label: '냉각 코일 온도', values: [25, 20, 15, 10, 5, 1], unit: '°C', base: 8e5, growth: 2.6, why: '이슬점보다 낮아야 응축' },
      { id: 'm', label: '공기 유량 ṁ_a', values: [0.1, 0.3, 1, 3, 10, 30, 100, 300], unit: 'kg/s', base: 1.2e6, growth: 3, why: '처리 공기량에 비례' },
    ],
    out(p) {
      const p1 = p.RH / 100 * PHYS.psat(30), x1 = PHYS.xFromP(p1), Td = PHYS.dewPoint(p1);
      if (p.T2 >= Td) return 0;
      return p.m * (x1 - PHYS.xFromP(PHYS.psat(p.T2)));
    },
    subst(p) {
      const p1 = p.RH / 100 * PHYS.psat(30), Td = PHYS.dewPoint(p1);
      const x1 = PHYS.xFromP(p1), x2 = p.T2 < Td ? PHYS.xFromP(PHYS.psat(p.T2)) : x1;
      return `이슬점 ${Td.toFixed(1)} °C ${p.T2 < Td ? '>' : '≤'} 코일 ${p.T2} °C → ${p.m} × (${x1.toFixed(2)} − ${x2.toFixed(2)}) = ${fG(this.out(p))}/s`;
    },
  },
  {
    id: 'fick', name: 'Fick 확산 법칙 (투습막)', tag: '습기', cost: 3e7, water: true, cur: 'W',
    desc: '수증기는 수증기압이 높은 곳에서 낮은 곳으로 확산해요. 열전도와 똑같은 모양의 식! 투습저항계수 μ가 작고 얇을수록 잘 통과해요. 확산은 아주 느려서 넓은 면적이 필요해요. (업그레이드는 💧 물로 결제)',
    tex: String.raw`g=\delta_0\,\frac{\Delta p}{\mu\,d}=\delta_0\frac{\Delta p}{s_d},\qquad \delta_0\approx2\times10^{-10}`,
    params: [
      { id: 'dp', label: '수증기압 차 Δp', values: [500, 1000, 1500, 2000, 3000], unit: 'Pa', base: 30, growth: 3, why: 'g ∝ Δp' },
      { id: 'mu', label: '막 재료 (μ)', values: [100, 50, 10, 5, 1], names: ['콘크리트급', 'EPS', '벽돌', '석고보드', '미네랄울 (≈공기)'], unit: '', base: 40, growth: 3.2, why: 'g ∝ 1/μ (μ ≥ 1)' },
      { id: 'd', label: '막 두께 d', values: [0.2, 0.1, 0.05, 0.02, 0.01], unit: 'm', base: 35, growth: 3, why: 'g ∝ 1/d → s_d = μd' },
      { id: 'A', label: '막 면적 A', fn: L => 100 * 2 ** L, max: 24, unit: 'm²', base: 25, growth: 1.9, why: '확산은 느려서 면적이 핵심' },
    ],
    out(p) { return 2e-10 * p.dp / (p.mu * p.d) * p.A * 1000; },
    subst(p) { return `2e-10 × ${p.dp} / (${p.mu} × ${p.d}) × ${num(p.A)} m² = ${fG(this.out(p))}/s`; },
  },
  {
    id: 'latent', name: '잠열 회수 (상변화)', tag: '습기', cost: 1.5e8,
    desc: '수증기가 물로 응축하면 기화할 때 흡수했던 잠열(약 2500 kJ/kg)을 다시 내놓아요. 모은 물의 흐름에서 잠열을 회수해 열(J) 수입으로 바꿉니다. 증발 냉각·냉각탑의 반대 원리예요.',
    tex: String.raw`\dot Q_{latent}=\dot m_w\,h_{fg},\qquad h_{fg}\approx 2500\ \mathrm{kJ/kg}=2500\ \mathrm{J/g}`,
    params: [{ id: 'eff', label: '회수 효율', values: [0.2, 0.4, 0.6, 0.8, 0.95], unit: '', base: 5e7, growth: 3, why: '물 1 g = 2500 J' }],
    out() { return 0; }, subst() { return `${fG(waterRate())}/s × 2500 J/g × ${P('latent', 'eff')} = ${fW(latentW())}`; },
  },
  {
    id: 'glaser', name: 'Glaser 결로 판정', tag: '습기', cost: 1e9,
    desc: '벽 속 온도분포 → 포화수증기압 p<sub>sat</sub>, 그리고 수증기압 p 분포를 겹쳐 그려 p &gt; p<sub>sat</sub> 인 곳에서 결로를 찾아요. 이제 "결로 위기" 의뢰가 들어옵니다. 방습층을 올바른 자리에 놓을 때마다 전역 배수 +10%!',
    tex: String.raw`p_n=p_e+\frac{p_i-p_e}{s_{d,t}}\sum_{j\le n}s_{d,j},\qquad p>p_{sat}\Rightarrow \text{결로}`,
    params: [],
    out() { return 0; }, subst() { return `결로 위기 해결 ${G.glaserWins}회 → 전역 배수 ×${G.mult.toFixed(2)}`; },
  },
];
const FMAP = Object.fromEntries(FORMULAS.map(f => [f.id, f]));

/* ---------------- 상태 ---------------- */
const SAVE_KEY = 'heat-tycoon-v2';
let G = null;
function fresh() { return { J: 0, Wg: 0, life: 0, lifeW: 0, unlocked: ['fourier'], lv: {}, mult: 1, glaserWins: 0, clicks: 0, quizRight: 0, ups: 0, delivered: 0, quest: 0, questBase: null, ach: 0, ended: false, seenHelp: false, last: Date.now() }; }
function load() {
  try { const v1 = JSON.parse(localStorage.getItem('heat-tycoon-v1')); if (v1 && v1.unlocked && !localStorage.getItem(SAVE_KEY)) return Object.assign(fresh(), v1, { seenHelp: true }); } catch (e) { /* 무시 */ }
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.unlocked) return Object.assign(fresh(), s); } catch (e) { /* 저장소 사용 불가 */ }
  return null;
}
function save() { try { G.last = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* 무시 */ } }

const has = (id) => G.unlocked.includes(id);
const lvl = (fid, pid) => G.lv[fid + '.' + pid] || 0;
function param(f, p) { const L = lvl(f.id, p.id); return p.values ? p.values[Math.min(L, p.values.length - 1)] : p.fn(L); }
function maxL(p) { return p.values ? p.values.length - 1 : p.max; }
function P(fid, pid) { const f = FMAP[fid]; return param(f, f.params.find(p => p.id === pid)); }
function pvals(f) { const o = {}; f.params.forEach(p => o[p.id] = param(f, p)); return o; }
/* 업그레이드 가격 = (그 업그레이드로 늘어나는 수입) × 회수시간.
   물리값의 크기와 상관없이 모든 업그레이드가 비슷한 시간 안에 본전을 뽑도록 해서 성장 속도를 일정하게 유지한다. */
const WATER_J = 2500; // 물 1 g 의 가치 = 잠열 2500 J
let PRICING = false;
function value(cur) { return cur === 'W' ? waterRate() / G.mult : (incomeJ() + waterRate() * WATER_J) / G.mult; }
function payback(L) { return 40 * Math.pow(1.25, L); }
function upCost(f, p, L) {
  const cur = f.cur || 'J', key = f.id + '.' + p.id, keep = G.lv[key];
  PRICING = true;
  const v0 = value(cur); G.lv[key] = L + 1; const v1 = value(cur);
  if (keep === undefined) delete G.lv[key]; else G.lv[key] = keep;
  PRICING = false;
  const gain = v1 - v0, T = payback(L);
  return Math.max((cur === 'W' ? 0.05 : 5) * Math.pow(1.5, L), gain > 0 ? gain * T : 0.6 * v0 * T);
}

function beta() { return has('bridge') ? P('bridge', 'beta') : 0.2; }
function eta() { const R = has('series') ? P('series', 'Rt') : 0.5; return R / (R + 0.5) * (1 - beta()); }
let simT = 0; // 게임 내 시간 (초)
// 발표·시연용: 주소 뒤에 ?speed=10 을 붙이면 자동 수입이 10배로 빨라진다
const SPEED = Math.min(100, Math.max(1, +new URLSearchParams(location.search).get('speed') || 1));
function sunFactor() { return PRICING ? 1 / Math.PI : Math.max(0, Math.sin(2 * Math.PI * simT / 60)); }
function rawOut(f) { return has(f.id) ? f.out(pvals(f)) : 0; }
function heatRate() { return FORMULAS.filter(f => f.heat).reduce((s, f) => s + rawOut(f), 0) * eta() * G.mult; }
function waterRate() { return (rawOut(FMAP.cond) + rawOut(FMAP.fick)) * G.mult; }
function latentW() { return has('latent') ? waterRate() * 2500 * P('latent', 'eff') : 0; }
function incomeJ() { return heatRate() + latentW(); }
function clickValue() { return Math.max(1, 1 + 0.08 * incomeJ()); }

/* ---------------- 수입 처리 ---------------- */
function earn(J, Wg = 0, lump = true) { G.J += J; G.life += Math.max(0, J); G.Wg += Wg; G.lifeW += Math.max(0, Wg); if (lump && J > 0) emit('earn', J); }
function canPay(cost, cur) { return cur === 'W' ? G.Wg >= cost : G.J >= cost; }
function pay(cost, cur) { if (cur === 'W') G.Wg -= cost; else G.J -= cost; }

/* ---------------- 행동 ---------------- */
export function tap() { const v = clickValue(); earn(v); G.clicks++; emit('tap', v); return v; }
export function buy(f, p) {
  const L = lvl(f.id, p.id), cur = f.cur || 'J';
  if (L >= maxL(p)) return false;
  const cost = upCost(f, p, L);
  if (!canPay(cost, cur)) return false;
  const before = f.heat || f.water ? rawOut(f) : incomeJ();
  pay(cost, cur); G.lv[f.id + '.' + p.id] = L + 1; G.ups++;
  const after = f.heat || f.water ? rawOut(f) : incomeJ();
  emit('upgrade', f, p, before > 0 && after > 0 ? after / before : 0);
  save(); return true;
}
export function nextFormula() { return FORMULAS.find(f => !has(f.id)); }
export function unlock(f) {
  if (G.J < f.cost || has(f.id)) return false;
  G.J -= f.cost; G.unlocked.push(f.id); emit('unlock', f); save(); return true;
}
export function deliver() { const r = Math.max(50, 20 * incomeJ()); earn(r); G.delivered++; emit('deliver', r); return r; }
export function resetGame() { G = fresh(); save(); location.reload(); }

/* ---------------- 레벨 (누적 열 = 경험치) ---------------- */
const LV0 = 30, LVF = 3;
export function levelInfo() {
  const L = Math.max(1, 1 + Math.floor(Math.log(Math.max(1, G.life) / LV0) / Math.log(LVF) + 1e-9));
  const a = L === 1 ? 0 : LV0 * Math.pow(LVF, L - 1), b = LV0 * Math.pow(LVF, L);
  return { L, cur: G.life - a, need: b - a, toNext: b - G.life, pct: Math.min(1, (G.life - a) / (b - a)) };
}

/* ---------------- 오늘의 목표 (순서대로 돌아가는 작은 미션) ---------------- */
const QUESTS = [
  { k: 'clicks', n: (i) => 20 + 10 * i, t: (n) => `불꽃이 ${n}번 탭하기` },
  { k: 'ups', n: (i) => 3 + 2 * i, t: (n) => `업그레이드 ${n}번 하기` },
  { k: 'unlocked', n: () => 1, t: () => '새 공식 해금하기' },
  { k: 'delivered', n: () => 1, t: () => '불덩이를 집으로 배달하기' },
  { k: 'quizRight', n: () => 1, t: () => '퀴즈 1개 맞히기' },
];
function statOf(k) { return k === 'unlocked' ? G.unlocked.length : G[k] || 0; }
export function questInfo() {
  const i = G.quest, q = QUESTS[i % QUESTS.length], n = q.n(Math.floor(i / QUESTS.length));
  if (!G.questBase || G.questBase.i !== i) G.questBase = { i, v: statOf(q.k) };
  if (q.k === 'unlocked' && !nextFormula()) { G.quest++; return questInfo(); }
  const have = Math.min(n, statOf(q.k) - G.questBase.v);
  return { text: q.t(n), have, n, done: have >= n, reward: Math.max(100, 45 * incomeJ()) };
}
export function claimQuest() { const q = questInfo(); if (!q.done) return 0; earn(q.reward); G.quest++; G.questBase = null; emit('quest', q.reward); save(); return q.reward; }

/* ---------------- 업적 (자동 달성) ---------------- */
const ACH = [
  ['clicks', 50, '탭 50번'], ['unlocked', 3, '공식 3개'], ['life', 1e4, '누적 10 kJ'], ['ups', 25, '업그레이드 25번'], ['quizRight', 3, '퀴즈 3개'],
  ['unlocked', 6, '공식 6개'], ['life', 1e7, '누적 10 MJ'], ['clicks', 500, '탭 500번'], ['unlocked', 9, '공식 9개'], ['life', 1e10, '누적 10 GJ'],
  ['unlocked', 11, '모든 공식'], ['quizRight', 20, '퀴즈 20개'], ['life', 1e12, '누적 1 TJ'],
];
export function achInfo() {
  const a = ACH[G.ach]; if (!a) return null;
  const v = statOf(a[0]), p = a[0] === 'life' ? Math.log10(1 + v) / Math.log10(1 + a[1]) : v / a[1];
  return { name: a[2], pct: Math.min(1, p), done: v >= a[1] };
}
export function checkAch() { const a = achInfo(); if (a && a.done) { G.ach++; const r = Math.max(200, 60 * incomeJ()); earn(r); emit('ach', a.name, r); save(); } }

/* ---------------- 게임 시간 ---------------- */
export function advance(dt) { simT += dt; earn(incomeJ() * dt * SPEED, waterRate() * dt * SPEED, false); }
export function startGame() {
  const s = load(); G = s || fresh();
  let off = 0;
  if (s) { off = Math.min(7200, (Date.now() - (s.last || Date.now())) / 1000); if (off > 30) { const gain = incomeJ() * off * 0.5; earn(gain, waterRate() * off * 0.5, false); return { offline: gain, minutes: Math.round(off / 60) }; } }
  return { fresh: !s };
}

export { G, FORMULAS, FMAP, si, fJ, fW, fG, fCur, num, has, lvl, param, maxL, P, pvals, upCost, beta, eta, sunFactor, rawOut, heatRate, waterRate, latentW, incomeJ, clickValue, earn, canPay, pay, save, simT, SPEED };
