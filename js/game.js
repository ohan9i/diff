/* ===========================================================
   열공장 타이쿤 — 공식을 해금하며 열(J)과 물(g)을 버는 방치형 학습 게임
   =========================================================== */
'use strict';

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
// 카드 아이콘·색 (카드 왼쪽 띠, 아이콘 배지, 진행 막대에 쓰임)
const LOOK = {
  fourier: ['🧱', '#ff6a3d', '#ffb347', '전도'], parallel: ['🔀', '#ff8f3d', '#ffd36b', '병렬'], series: ['🧥', '#f2b33d', '#fff08a', '직렬'],
  conv: ['🌀', '#ff5e7a', '#ffa36b', '대류'], bridge: ['🌉', '#b06bff', '#ff7ab8', '열교'], rad: ['🔆', '#ff3d3d', '#ffcf5a', '복사'],
  solar: ['☀️', '#ff9f1c', '#ffe066', '일사'], cond: ['🧊', '#2c9be6', '#8be3ff', '습공기'], fick: ['🫧', '#3d7bff', '#7fe0ff', '확산'],
  latent: ['♨️', '#ff7a45', '#4fd1ff', '상변화'], glaser: ['🛡️', '#6c5ce7', '#4fd1ff', '결로'],
};
const look = (f) => LOOK[f.id] || ['⚙️', '#ff7a45', '#ffcf5a', f.tag];
const cssVars = (f) => `--c1:${look(f)[1]};--c2:${look(f)[2]}`;

/* ---------------- 상태 ---------------- */
const SAVE_KEY = 'heat-tycoon-v1';
let G = null;
function fresh() { return { J: 0, Wg: 0, life: 0, lifeW: 0, unlocked: ['fourier'], lv: {}, mult: 1, glaserWins: 0, clicks: 0, quizRight: 0, ended: false, last: Date.now() }; }
function load() {
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
function earn(J, Wg = 0, lump = true) { if (lump && J > 0) bumpWallet(); G.J += J; G.life += Math.max(0, J); G.Wg += Wg; G.lifeW += Math.max(0, Wg); }
function canPay(cost, cur) { return cur === 'W' ? G.Wg >= cost : G.J >= cost; }
function pay(cost, cur) { if (cur === 'W') G.Wg -= cost; else G.J -= cost; }

/* ---------------- UI: 카드 ---------------- */
function tex(s) { try { return katex.renderToString(s, { throwOnError: false, displayMode: true }); } catch (e) { return s; } }

const openDesc = new Set();
document.addEventListener('toggle', (e) => { const d = e.target; if (d.dataset && d.dataset.d) d.open ? openDesc.add(d.dataset.d) : openDesc.delete(d.dataset.d); }, true);
function renderCards() {
  const col = $('#cards');
  const list = FORMULAS.filter(f => has(f.id)).reverse();
  col.innerHTML = list.map(f => {
    const cur = f.cur || 'J';
    const ups = f.params.map(p => {
      const L = lvl(f.id, p.id), M = maxL(p), v = param(f, p);
      const name = p.names ? p.names[Math.min(L, p.names.length - 1)] : '';
      const next = L < M ? (p.values ? p.values[L + 1] : p.fn(L + 1)) : null;
      const nextName = p.names && L < M ? p.names[L + 1] : '';
      const cost = upCost(f, p, L);
      return `<button class="up ${L >= M ? 'maxed' : ''}" data-f="${f.id}" data-p="${p.id}" ${L >= M ? 'disabled' : ''}>
        <span class="row"><span class="t">${p.label}</span><span class="lv">Lv ${L}/${M}</span></span>
        <span class="v">${name ? name + ' · ' : ''}${num(v)} ${p.unit}${next != null ? ` → <b>${nextName ? nextName + ' ' : ''}${num(next)}</b>` : ''}</span>
        ${L >= M ? '' : '<span class="bar"><i></i></span>'}
        <span class="c">${L >= M ? '최대 레벨 ✓' : '💰 ' + fCur(cost, cur)}</span>
        <span class="why">${p.why}</span></button>`;
    }).join('');
    const out = f.heat ? `<div class="out">${fW(rawOut(f) * eta() * G.mult)}<small>열 수입</small></div>` : f.water ? `<div class="out w">${fG(rawOut(f) * G.mult)}/s<small>물 수입</small></div>` : '';
    const lk = look(f);
    return `<div class="card panel" id="card-${f.id}" style="${cssVars(f)}">
      <div class="card-head"><div class="icon">${lk[0]}</div>
        <div class="ttl"><div class="name">${f.name}<span class="tag ${f.tag === '습기' ? 'm' : ''}">${f.tag} · ${lk[3]}</span></div><div class="subst" data-subst="${f.id}"></div></div>${out}</div>
      <div class="formula">${tex(f.tex)}</div>
      <details class="desc" data-d="${f.id}" ${openDesc.has(f.id) ? 'open' : ''}><summary>원리 보기</summary>${f.desc}</details>
      ${ups ? `<div class="ups">${ups}</div>` : ''}</div>`;
  }).join('');
  refreshCards();
}
function refreshCards() {
  FORMULAS.forEach(f => {
    if (!has(f.id)) return;
    const s = document.querySelector(`[data-subst="${f.id}"]`);
    if (s) s.textContent = f.subst(pvals(f));
    const o = document.querySelector(`#card-${f.id} .out`);
    if (o) o.firstChild.textContent = f.heat ? fW(rawOut(f) * eta() * G.mult) : f.water ? fG(rawOut(f) * G.mult) + '/s' : '';
  });
  $$('.up').forEach(b => {
    const f = FMAP[b.dataset.f], p = f.params.find(x => x.id === b.dataset.p), L = lvl(f.id, p.id);
    if (L >= maxL(p)) return;
    const cost = upCost(f, p, L), ok = canPay(cost, f.cur || 'J');
    b.classList.toggle('can', ok);
    b.querySelector('.c').textContent = '💰 ' + fCur(cost, f.cur || 'J');
    const bar = b.querySelector('.bar i'); if (bar) bar.style.width = Math.min(100, (f.cur === 'W' ? G.Wg : G.J) / cost * 100) + '%';
  });
  renderNext();
}
function renderNext() {
  const nf = FORMULAS.find(f => !has(f.id));
  const box = $('#nextCard');
  if (!nf) { box.innerHTML = `<div class="lock-card"><div class="ring" style="--p:${Math.min(100, G.life / 1e12 * 100)}"><span>🏆</span></div><div class="kick">ALL UNLOCKED</div><div class="big">모든 공식을 해금했어요!</div><div class="desc">목표: 누적 1 TJ → 열공장 마스터 · 현재 ${fJ(G.life)}</div></div>`; return; }
  const pct = Math.min(100, G.J / nf.cost * 100);
  const m = nf.tag === '습기';
  const key = nf.id + (G.J >= nf.cost ? 1 : 0) + Math.floor(pct);
  if (box.dataset.key === key) return; // 같은 상태면 다시 그리지 않음 (버튼 애니메이션 유지)
  box.dataset.key = key;
  box.innerHTML = `<div class="lock-card ${m ? 'm' : ''}"><div class="ring" style="--p:${pct}"><span>${G.J >= nf.cost ? look(nf)[0] : '🔒'}</span></div>
    <div class="kick">NEXT FORMULA · ${Math.floor(pct)}%</div><div class="big">${nf.name}</div>
    <div class="desc">${m && !has('cond') ? '💧 해금하면 <b>습기</b> 단계가 시작돼요! · ' : ''}해금 비용 ${fJ(nf.cost)}</div>
    <button class="unlock-btn ${m ? 'm' : ''}" id="unlockBtn" ${G.J >= nf.cost ? '' : 'disabled'}>해금하기 · ${fJ(nf.cost)}</button></div>`;
  $('#unlockBtn').onclick = () => unlock(nf);
}
function unlock(f) {
  if (G.J < f.cost || has(f.id)) return;
  G.J -= f.cost; G.unlocked.push(f.id);
  if (f.id === 'cond') $('#waterBox').classList.remove('hidden');
  log(`🔓 ${f.name} 해금!`);
  renderCards(); save();
  $('#nextCard').dataset.key = '';
  showModal(`<div class="burst" style="${cssVars(f)}"><div class="rays"></div><div class="icon">${look(f)[0]}</div><h2>새 공식 해금!</h2></div><h3>${f.name}</h3><div class="formula">${tex(f.tex)}</div><p>${f.desc}</p><p style="color:var(--muted);font-size:13px">도감(📖)에 저장되었어요.</p>`);
}
$('#cards').addEventListener('click', (e) => {
  const b = e.target.closest('.up'); if (!b || b.disabled) return;
  const f = FMAP[b.dataset.f], p = f.params.find(x => x.id === b.dataset.p), L = lvl(f.id, p.id), cur = f.cur || 'J';
  const cost = upCost(f, p, L);
  if (!canPay(cost, cur) || L >= maxL(p)) { toast('잔액이 부족해요'); return; }
  const before = f.heat ? rawOut(f) : f.water ? rawOut(f) : incomeJ();
  pay(cost, cur); G.lv[f.id + '.' + p.id] = L + 1;
  const after = f.heat ? rawOut(f) : f.water ? rawOut(f) : incomeJ();
  if (before > 0 && after > 0) toast(`${p.label}: 출력 ×${(after / before).toFixed(2)}`);
  else toast(`${p.label} 업그레이드!`);
  renderCards(); save();
  const nb = document.querySelector(`.up[data-f="${f.id}"][data-p="${p.id}"]`); if (nb) nb.classList.add('pop');
  burst(null, null, 10);
});

/* ---------------- 무대 (캔버스) ---------------- */
const stage = $('#stage');
let parts = [], floats = [], blob = null, drag = null, drops = [];
const MAT_COL = { 0.035: '#f4e04d', 0.13: '#c9a26b', 0.7: '#c4703f', 1.5: '#a9adb3', 50: '#7f8c9d', 200: '#d6dde6', 400: '#d98c4a', 2000: '#b9f2ff' };
function geom() {
  const w = stage.clientWidth, h = Math.round(Math.min(450, Math.max(370, w * 0.64)));
  return { w, h, hx: w * 0.22, cx: w * 0.78 };
}
let embers = [], snow = [], sparks = [], ripples = [];
const MOTION = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
function pill(ctx, text, x, y, fg = '#e9ecf8', bg = 'rgba(8,10,18,.62)', font = '600 11px Pretendard, sans-serif') {
  ctx.font = font; const tw = ctx.measureText(text).width + 14;
  ctx.fillStyle = bg; roundRect(ctx, x - tw / 2, y - 10, tw, 20, 10); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 0.5); ctx.textBaseline = 'alphabetic';
}
function flame(ctx, x, y, s, t, i) {
  const f = 1 + Math.sin(t * 9 + i * 2.1) * 0.08 + Math.sin(t * 15 + i) * 0.05;
  const hgt = s * 1.9 * f;
  const g = ctx.createRadialGradient(x, y - hgt * 0.25, 1, x, y - hgt * 0.3, hgt);
  g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.25, 'rgba(255,200,80,.95)'); g.addColorStop(0.6, 'rgba(255,90,30,.75)'); g.addColorStop(1, 'rgba(255,40,20,0)');
  ctx.fillStyle = g;
  const sway = Math.sin(t * 5 + i) * s * 0.18;
  ctx.beginPath(); ctx.moveTo(x - s * 0.55, y);
  ctx.bezierCurveTo(x - s * 0.7, y - hgt * 0.5, x + sway - s * 0.15, y - hgt * 0.7, x + sway, y - hgt);
  ctx.bezierCurveTo(x + sway + s * 0.2, y - hgt * 0.65, x + s * 0.75, y - hgt * 0.45, x + s * 0.55, y);
  ctx.closePath(); ctx.fill();
}
function burst(x, y, n = 12, col) {
  if (x == null) { const g = geom(); x = g.hx; y = g.h * 0.55; }
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 160; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5 + Math.random() * 0.4, c: col || (Math.random() < 0.5 ? '#ffd36b' : '#ff7a3c') }); }
}
function shake() { if (!MOTION) return; const w = $('#stageWrap'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); }
function drawStage(dt) {
  const { ctx, w, h } = fitCanvas(stage, geom().h);
  const { hx, cx } = geom();
  const t = performance.now() / 1000;
  ctx.clearRect(0, 0, w, h);
  // 배경: 가운데 벽 단면은 온도 그라데이션, 양쪽은 용광로/냉기
  const bg = ctx.createLinearGradient(0, 0, w, 0);
  bg.addColorStop(0, '#2a0b06'); bg.addColorStop(0.22, '#1d0f12'); bg.addColorStop(0.5, '#10121c'); bg.addColorStop(0.78, '#0b1626'); bg.addColorStop(1, '#06182e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const pulse = 0.85 + 0.15 * Math.sin(t * 2.2);
  let g = ctx.createRadialGradient(hx * 0.45, h * 0.78, 10, hx * 0.45, h * 0.78, hx * 1.6);
  g.addColorStop(0, `rgba(255,110,40,${0.55 * pulse})`); g.addColorStop(1, 'rgba(255,60,20,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  g = ctx.createRadialGradient(cx + (w - cx) * 0.55, h * 0.3, 10, cx + (w - cx) * 0.55, h * 0.3, (w - cx) * 1.6);
  g.addColorStop(0, 'rgba(60,180,255,.35)'); g.addColorStop(1, 'rgba(40,120,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // 벽 단면 경계선
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, h); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
  // 등온선 (점선)
  ctx.setLineDash([2, 6]); ctx.strokeStyle = 'rgba(255,255,255,.05)';
  for (let i = 1; i < 6; i++) { const x = hx + (cx - hx) * i / 6; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  ctx.setLineDash([]);

  // 용광로 (왼쪽)
  const fw = hx * 0.78, fx = hx * 0.11, fy = h * 0.5, fh = h * 0.42;
  ctx.fillStyle = '#1a0d0a'; roundRect(ctx, fx, fy, fw, fh, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(255,140,80,.25)'; ctx.lineWidth = 2; ctx.stroke();
  const mouth = ctx.createLinearGradient(0, fy + fh * 0.25, 0, fy + fh * 0.9);
  mouth.addColorStop(0, '#ff8a3c'); mouth.addColorStop(1, '#7a1d0c');
  ctx.fillStyle = mouth; roundRect(ctx, fx + fw * 0.14, fy + fh * 0.3, fw * 0.72, fh * 0.56, 10); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) flame(ctx, fx + fw * (0.3 + i * 0.2), fy + fh * 0.84, fw * 0.13, t, i);
  ctx.globalCompositeOperation = 'source-over';
  // 굴뚝
  ctx.fillStyle = '#1a0d0a'; ctx.fillRect(fx + fw * 0.66, fy - fh * 0.42, fw * 0.16, fh * 0.44);
  // 고객 건물 (오른쪽)
  const bw = (w - cx) * 0.7, bx = cx + (w - cx) * 0.15, by = h * 0.5, bh = h * 0.42;
  ctx.fillStyle = '#0c1a2e'; ctx.beginPath(); ctx.moveTo(bx - 6, by); ctx.lineTo(bx + bw / 2, by - bh * 0.32); ctx.lineTo(bx + bw + 6, by); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#10243e'; roundRect(ctx, bx, by, bw, bh, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(140,220,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
  const warm = Math.min(1, Math.log10(1 + heatRate()) / 8);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    const wx = bx + bw * (0.16 + c * 0.44), wy = by + bh * (0.14 + r * 0.42);
    ctx.fillStyle = `rgba(255,${190 + 40 * warm},${110 + 60 * warm},${0.25 + 0.65 * warm * (0.9 + 0.1 * Math.sin(t * 3 + r + c))})`;
    ctx.shadowColor = '#ffcf7a'; ctx.shadowBlur = 14 * warm; roundRect(ctx, wx, wy, bw * 0.28, bh * 0.26, 3); ctx.fill(); ctx.shadowBlur = 0;
  }
  // 파티클: 불씨 / 눈
  if (MOTION && embers.length < 40 && Math.random() < 0.6) embers.push({ x: fx + Math.random() * fw, y: fy + fh * 0.4, vy: -(25 + Math.random() * 45), life: 1.2 + Math.random() * 1.6, s: 1 + Math.random() * 2 });
  if (MOTION && snow.length < 40 && Math.random() < 0.5) snow.push({ x: cx + Math.random() * (w - cx), y: -5, vy: 18 + Math.random() * 25, ph: Math.random() * 6, s: 1 + Math.random() * 1.8 });
  ctx.globalCompositeOperation = 'lighter';
  embers = embers.filter(e => (e.life -= dt) > 0);
  embers.forEach(e => { e.y += e.vy * dt; e.x += Math.sin(t * 3 + e.y * 0.05) * 12 * dt; ctx.fillStyle = `rgba(255,${120 + 100 * Math.random()},40,${Math.min(1, e.life)})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.s, 0, 7); ctx.fill(); });
  ctx.globalCompositeOperation = 'source-over';
  snow = snow.filter(s => s.y < h);
  snow.forEach(s => { s.y += s.vy * dt; s.x += Math.sin(t + s.ph) * 10 * dt; ctx.fillStyle = 'rgba(200,240,255,.75)'; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 7); ctx.fill(); });

  // 푸리에 막대 (병렬이면 여러 개)
  const Nall = has('parallel') ? P('parallel', 'N') : 1, N = Math.min(8, Nall);
  const k = P('fourier', 'k');
  const top = h * 0.30, bot = h * 0.74, gap = (bot - top) / N;
  const thick = Math.max(6, Math.min(gap * 0.62, 10 + 40 / P('fourier', 'dx') * 0.05));
  const rods = [];
  const sL = has('series') ? lvl('series', 'Rt') : 0;
  for (let i = 0; i < N; i++) {
    const y = top + gap * (i + 0.5); rods.push(y);
    // 직렬 단열 피복 (층마다 한 겹)
    for (let j = sL; j >= 1; j--) { ctx.fillStyle = `rgba(255,${220 - j * 8},${120 + j * 10},${0.07 + 0.03 * j})`; roundRect(ctx, hx + 2, y - thick / 2 - j * 2.6, cx - hx - 4, thick + j * 5.2, 4 + j); ctx.fill(); }
    const rg = ctx.createLinearGradient(hx, 0, cx, 0);
    rg.addColorStop(0, '#ff6a2c'); rg.addColorStop(0.5, MAT_COL[k] || '#aaa'); rg.addColorStop(1, '#3aa6ff');
    ctx.shadowColor = 'rgba(255,120,50,.6)'; ctx.shadowBlur = 12;
    ctx.fillStyle = rg; roundRect(ctx, hx, y - thick / 2, cx - hx, thick, Math.min(6, thick / 2)); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(hx + 4, y - thick / 2 + 1.5, cx - hx - 8, Math.max(1, thick * 0.18));
  }
  pill(ctx, `${FMAP.fourier.params[0].names[lvl('fourier', 'k')]} · k=${k}${Nall > 1 ? ` · 막대 ${Nall}개${Nall > N ? ' (8개 표시)' : ''}` : ''}`, (hx + cx) / 2, bot + 16 + sL * 2.6, '#ffe2b8');
  // 열교 슬래브
  {
    const b = beta(), sy = h * 0.13;
    ctx.fillStyle = '#5b606c'; roundRect(ctx, hx, sy, cx - hx, 9, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(hx, sy, cx - hx, 2);
    const lg = ctx.createRadialGradient(cx, sy + 4, 1, cx, sy + 4, 8 + b * 90);
    lg.addColorStop(0, `rgba(255,120,60,${Math.min(.9, b * 4)})`); lg.addColorStop(1, 'rgba(255,80,40,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, sy + 4, 8 + b * 90, 0, 7); ctx.fill();
    pill(ctx, has('bridge') ? `열교 슬래브 · 누설 ${(b * 100).toFixed(0)}%` : '? 슬래브에서 열이 새는 것 같은데…', (hx + cx) / 2, sy - 12, has('bridge') ? '#ffd0b0' : '#ff9a8a');
  }
  // 열 입자 (발광 + 꼬리)
  const inc = heatRate();
  const want = Math.min(160, Math.round(6 + 14 * Math.log10(1 + inc)));
  const speed = 60 + 30 * Math.log10(1 + inc);
  if (parts.length < want && Math.random() < 0.5) parts.push({ x: hx, r: Math.floor(Math.random() * N), leak: Math.random() < (1 - eta()) * 0.6, vy: 0, y: 0 });
  parts = parts.filter(p => p.x < cx && p.y < h);
  ctx.globalCompositeOperation = 'lighter';
  parts.forEach(p => {
    const ry = rods[p.r % rods.length];
    p.x += speed * dt;
    if (p.leak && p.x > (hx + cx) / 2) { p.vy += 200 * dt; p.y += p.vy * dt; }
    const u = (p.x - hx) / (cx - hx);
    const col = p.leak && p.y > 0 ? '255,90,70' : `255,${Math.round(200 + 40 * u)},${Math.round(80 + 140 * u)}`;
    const pg = ctx.createRadialGradient(p.x, ry + p.y, 0, p.x, ry + p.y, 8);
    pg.addColorStop(0, `rgba(${col},1)`); pg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(p.x, ry + p.y, 8, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(${col},.25)`; ctx.fillRect(p.x - 18, ry + p.y - 1, 16, 2);
  });
  ctx.globalCompositeOperation = 'source-over';
  // 대류 팬
  if (has('conv')) {
    const hL = lvl('conv', 'h'), fx2 = hx * 0.5, fy2 = h * 0.2, R = 20;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(fx2, fy2, R + 6, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(fx2, fy2); ctx.rotate(t * (1 + hL * 3));
    ctx.fillStyle = hL >= 3 ? '#7fe0ff' : '#e6e9f2';
    for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.ellipse(R / 2, 0, R / 2, 6, 0.3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    pill(ctx, FMAP.conv.params[0].names[hL], fx2, fy2 + R + 18);
  }
  // 복사판
  if (has('rad')) {
    const T = P('rad', 'T');
    const c = T < 800 ? `rgb(${Math.round(110 + (T - 400) / 3)},40,30)` : T < 1500 ? `rgb(255,${Math.round((T - 800) / 4)},40)` : `rgb(255,${Math.round(Math.min(255, 175 + (T - 1500) / 10))},${Math.round(Math.min(255, (T - 1500) / 6))})`;
    const rx = w * 0.5, ry = h * 0.215;
    ctx.shadowColor = c; ctx.shadowBlur = 14 + Math.min(50, (T - 400) / 40);
    ctx.fillStyle = c; roundRect(ctx, rx - 52, ry - 9, 104, 18, 6); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = T < 1500 ? 'rgba(255,240,220,.95)' : '#3a1400'; ctx.font = '800 11px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`복사판 ${T} K`, rx, ry + 0.5); ctx.textBaseline = 'alphabetic';
    if (MOTION) { ctx.strokeStyle = c; ctx.globalAlpha = 0.35; for (let i = 0; i < 3; i++) { const r = ((t * 30 + i * 12) % 36); ctx.beginPath(); ctx.moveTo(rx - 48, ry + 12 + r); ctx.lineTo(rx + 48, ry + 12 + r); ctx.stroke(); } ctx.globalAlpha = 1; }
  }
  // 태양
  if (has('solar')) {
    const s = sunFactor(), ang = (simT % 60) / 60;
    const sx = cx + (w - cx) * (0.15 + 0.7 * Math.min(1, ang * 2)), sy = 24 + (1 - s) * 34;
    if (ang < 0.5) {
      const sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 36); sg.addColorStop(0, 'rgba(255,240,150,1)'); sg.addColorStop(0.35, 'rgba(255,200,60,.9)'); sg.addColorStop(1, 'rgba(255,160,40,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 36, 0, 7); ctx.fill();
    } else { ctx.fillStyle = '#e8eefc'; ctx.beginPath(); ctx.arc(w - 30, 28, 10, 0, 7); ctx.fill(); ctx.fillStyle = '#06182e'; ctx.beginPath(); ctx.arc(w - 25, 25, 9, 0, 7); ctx.fill(); }
    pill(ctx, `일사 ${(P('solar', 'qpk') * s).toFixed(0)} W/m²`, (cx + w) / 2, 76, '#ffe9a8');
  }
  // 응축기
  if (has('cond')) {
    const wr = rawOut(FMAP.cond), bx2 = w * 0.5, by2 = h * 0.93;
    ctx.strokeStyle = '#4fd1ff'; ctx.lineWidth = 3; ctx.shadowColor = '#4fd1ff'; ctx.shadowBlur = 8; ctx.beginPath();
    for (let i = 0; i <= 6; i++) { const x = bx2 - 66 + i * 22; i ? ctx.lineTo(x, by2 - 12 + (i % 2) * 10) : ctx.moveTo(x, by2 - 12); }
    ctx.stroke(); ctx.shadowBlur = 0;
    if (wr > 0 && Math.random() < Math.min(0.6, 0.05 + Math.log10(1 + wr) * 0.1)) drops.push({ x: bx2 - 60 + Math.random() * 120, y: by2 });
    ctx.fillStyle = '#7fe0ff';
    drops = drops.filter(d => d.y < h); drops.forEach(d => { d.y += 90 * dt; ctx.beginPath(); ctx.moveTo(d.x, d.y - 5); ctx.quadraticCurveTo(d.x + 3, d.y, d.x, d.y + 2); ctx.quadraticCurveTo(d.x - 3, d.y, d.x, d.y - 5); ctx.fill(); });
    pill(ctx, wr > 0 ? '💧 응축 중' : '이슬점보다 따뜻해서 물이 안 나와요', bx2, by2 - 26, '#bff0ff');
  }
  // 구역 라벨
  pill(ctx, w < 500 ? '🔥 고온' : '🔥 고온 T_h', hx / 2, h - 14, '#ffd0b0', 'rgba(60,15,5,.7)', '800 12px Pretendard, sans-serif');
  pill(ctx, w < 500 ? '❄️ 저온' : '❄️ 저온 → 고객', (cx + w) / 2, h - 14, '#cdeeff', 'rgba(5,25,50,.7)', '800 12px Pretendard, sans-serif');
  // 클릭 파문 · 불꽃 튐
  ripples = ripples.filter(r => (r.life -= dt) > 0);
  ripples.forEach(r => { ctx.strokeStyle = `rgba(255,210,120,${r.life * 2})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, (0.5 - r.life) * 90 + 6, 0, 7); ctx.stroke(); });
  sparks = sparks.filter(s => (s.life -= dt) > 0);
  ctx.globalCompositeOperation = 'lighter';
  sparks.forEach(s => { s.vy += 300 * dt; s.x += s.vx * dt; s.y += s.vy * dt; ctx.globalAlpha = Math.min(1, s.life * 2); ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, 2.2, 0, 7); ctx.fill(); });
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // 떠오르는 숫자 (외곽선)
  floats = floats.filter(f => f.life > 0);
  floats.forEach(f => {
    f.y -= 46 * dt; f.life -= dt; const sc = 1 + Math.max(0, f.life - (f.max || 1) + 0.15) * 3;
    ctx.globalAlpha = Math.min(1, f.life * 1.5); ctx.font = `${f.big ? 22 : 17}px "Black Han Sans", Pretendard, sans-serif`; ctx.textAlign = 'center';
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(sc, sc);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,8,0,.85)'; ctx.strokeText(f.t, 0, 0); ctx.fillStyle = f.c || '#ffd36b'; ctx.fillText(f.t, 0, 0);
    ctx.restore(); ctx.globalAlpha = 1;
  });
  // 고온 덩어리
  if (blob) {
    blob.life -= dt;
    if (blob.life <= 0 && !drag) { blob = null; }
    else {
      if (drag) {
        const zg = ctx.createLinearGradient(cx, 0, w, 0); zg.addColorStop(0, 'rgba(80,200,255,.0)'); zg.addColorStop(1, `rgba(80,200,255,${0.18 + 0.08 * Math.sin(t * 8)})`);
        ctx.fillStyle = zg; ctx.fillRect(cx, 0, w - cx, h);
        ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(159,220,255,.7)'; ctx.lineWidth = 2; ctx.strokeRect(cx + 2, 2, w - cx - 4, h - 4); ctx.setLineDash([]);
      }
      const R = 22 + Math.sin(t * 6) * 2;
      const og = ctx.createRadialGradient(blob.x, blob.y, 2, blob.x, blob.y, R * 1.9);
      og.addColorStop(0, 'rgba(255,245,200,1)'); og.addColorStop(0.35, 'rgba(255,150,50,.95)'); og.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = og; ctx.beginPath(); ctx.arc(blob.x, blob.y, R * 1.9, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(blob.x, blob.y, R + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, blob.life) / 12); ctx.stroke(); ctx.lineCap = 'butt';
      pill(ctx, drag ? '❄️ 오른쪽에 놓으세요!' : '👆 끌어서 차가운 쪽으로', blob.x, blob.y - R - 22, '#2a1600', 'rgba(255,211,107,.95)', '800 12px Pretendard, sans-serif');
    }
  }
}
function stagePos(e) { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
stage.addEventListener('pointerdown', (e) => {
  const p = stagePos(e);
  if (blob && Math.hypot(p.x - blob.x, p.y - blob.y) < 34) { drag = true; stage.setPointerCapture(e.pointerId); return; }
  const v = clickValue();
  earn(v); G.clicks++;
  floats.push({ x: p.x, y: p.y - 10, t: '+' + fJ(v), life: 1, max: 1 });
  ripples.push({ x: p.x, y: p.y, life: 0.5 }); burst(p.x, p.y, 7);
  for (let i = 0; i < 3; i++) parts.push({ x: geom().hx, r: Math.floor(Math.random() * 8), leak: false, vy: 0, y: 0 });
});
stage.addEventListener('pointermove', (e) => { if (drag && blob) { const p = stagePos(e); blob.x = p.x; blob.y = p.y; } });
stage.addEventListener('pointerup', (e) => {
  if (!drag || !blob) return;
  drag = false;
  const { hx, cx } = geom();
  if (blob.x > cx) {
    const r = Math.max(50, 20 * incomeJ());
    earn(r); floats.push({ x: blob.x, y: blob.y, t: '+' + fJ(r) + ' 보너스!', life: 1.6, max: 1.6, big: true, c: '#4ee6a6' });
    burst(blob.x, blob.y, 30, '#8be3ff'); burst(blob.x, blob.y, 20); shake();
    log(`🔥→❄️ 고온 덩어리 배달 성공 +${fJ(r)} (열은 고온에서 저온으로!)`);
    blob = null;
  } else if (blob.x < hx) {
    floats.push({ x: blob.x, y: blob.y, t: '그쪽은 원래 자리예요', life: 1.2, c: '#ff5d6c' });
  }
});
function spawnBlob() {
  if (blob) return;
  const { hx, h } = geom();
  blob = { x: hx * 0.5, y: geom().h * (0.3 + Math.random() * 0.4), life: 12 };
}

/* ---------------- 토스트 / 로그 / 모달 ---------------- */
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = t; $('#toasts').appendChild(d); while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove(); setTimeout(() => d.remove(), 2200); }
function log(t) { const d = document.createElement('div'); d.innerHTML = t; $('#log').prepend(d); while ($('#log').children.length > 30) $('#log').lastChild.remove(); }
function showModal(html, onClose) { $('#modalBody').innerHTML = html; $('#modal').classList.remove('hidden'); G._onClose = onClose; }
function hideModal() { $('#modal').classList.add('hidden'); const f = G._onClose; G._onClose = null; if (f) f(); }
$('#modalClose').onclick = hideModal;
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') hideModal(); });

/* ---------------- 퀴즈 ---------------- */
const QUIZ = [
  { f: 'fourier', q: 'ΔT를 2배로 올리면 전도 열류 q는?', o: ['그대로', '2배', '4배', '절반'], a: 1, e: 'q = kΔT/Δx 이므로 ΔT에 비례 → 2배.' },
  { f: 'fourier', q: '벽 두께 Δx를 2배로 하면 q는?', o: ['2배', '절반', '4배', '그대로'], a: 1, e: 'q ∝ 1/Δx → 절반. 그래서 단열재는 두꺼울수록 좋아요.' },
  { f: 'fourier', q: '열전도율 k의 단위는?', o: ['W/m²', 'W/(m·K)', 'm²K/W', 'J/kg'], a: 1, e: 'k [W/(m·K)] = 단위 두께·단위 온도차·단위 시간당 전달되는 에너지.' },
  { f: 'fourier', q: '두께 60 mm, k=0.03 인 단열재의 열저항 R은?', o: ['0.5', '2.0', '0.0018', '18'], a: 1, e: 'R = d/k = 0.06/0.03 = 2.0 m²K/W.' },
  { f: 'parallel', q: '병렬로 연결된 두 경로의 전체 열류는?', o: ['두 열류의 곱', '두 열류의 합', '작은 쪽 열류', '평균'], a: 1, e: '병렬이면 컨덕턴스(1/R)가 더해지고 열류도 더해져요.' },
  { f: 'parallel', q: '단열벽 면적의 5%만 콘크리트가 관통하면?', o: ['영향 거의 없음', '열손실이 크게 늘 수 있다', '열손실이 준다', '5%만 늘어난다'], a: 1, e: '콘크리트의 컨덕턴스가 수십 배 커서 작은 면적도 전체 열손실을 지배할 수 있어요 (열교).' },
  { f: 'series', q: '직렬로 쌓인 층들의 전체 열저항은?', o: ['각 R의 합', '각 R의 곱', '가장 큰 R', '1/R의 합'], a: 0, e: 'R_t = R₁ + R₂ + … (직렬은 저항이 더해짐).' },
  { f: 'series', q: '정상상태 다층벽에서 각 층을 지나는 열류 q는?', o: ['층마다 다르다', '모두 같다', '바깥층이 크다', '두꺼운 층이 크다'], a: 1, e: '에너지가 쌓이지 않으니 모든 층에서 같은 q. 대신 R이 큰 층에서 온도가 많이 떨어져요.' },
  { f: 'series', q: 'U값과 총 열저항 R_t의 관계는?', o: ['U = R_t', 'U = 1/R_t', 'U = R_t²', '관계 없음'], a: 1, e: 'U = 1/R_t, 표면 열전달(1/h)까지 포함한 총 저항의 역수.' },
  { f: 'conv', q: 'h_c 가 가장 큰 것은?', o: ['기체 자연대류', '기체 강제대류', '액체 강제대류', '비등·응축'], a: 3, e: '강의 표: 비등·응축 2,500–100,000 W/(m²K).' },
  { f: 'conv', q: '표면에서 유체 속도가 0이 되는 이유는?', o: ['중력', '마찰(점성)', '복사', '압력'], a: 1, e: '점성(마찰) 때문에 표면에서 v=0 → 경계층이 생겨요.' },
  { f: 'conv', q: '건물 외표면의 h가 내표면보다 큰 주된 이유는?', o: ['바람에 의한 강제대류', '외부가 더 추워서', '복사가 없어서', '재료가 달라서'], a: 0, e: '외표면은 바람 → 강제대류 (25–250), 내표면은 주로 자연대류 (2–25).' },
  { f: 'bridge', q: '열교가 실내 쪽에 만드는 문제는?', o: ['표면온도 상승', '표면온도 저하 → 결로·곰팡이', '소음', '일사 증가'], a: 1, e: '열이 몰려 빠져나가 내표면 온도가 떨어지고, 표면 상대습도가 올라가 결로·곰팡이 위험.' },
  { f: 'bridge', q: '발코니 슬래브 열교의 해결책이 아닌 것은?', o: ['슬래브 외부를 단열재로 감싸기', '단열 브레이크 부재 사용', '단열재를 더 두껍게만 하기', '슬래브 분리'], a: 2, e: '열교가 남아 있으면 두꺼운 단열은 소용없어요 (강의 p.68).' },
  { f: 'rad', q: '절대온도를 2배로 하면 흑체 방사량은?', o: ['2배', '4배', '8배', '16배'], a: 3, e: 'q = σT⁴ → 2⁴ = 16배.' },
  { f: 'rad', q: '키르히호프 법칙은?', o: ['ε = α', 'ρ = τ', 'α + ε = 1', 'ε = 1 − τ'], a: 0, e: '같은 파장에서 방사율 = 흡수율.' },
  { f: 'rad', q: '온도가 높을수록 복사 스펙트럼의 정점은?', o: ['긴 파장으로', '짧은 파장으로', '변화 없음', '사라짐'], a: 1, e: '빈 법칙 λmax ≈ 2898/T μm → 짧은 파장으로 이동.' },
  { f: 'rad', q: 'Low-e 유리가 겨울에 좋은 이유는?', o: ['가시광을 막아서', '장파를 반사해 실내 열을 지켜서', '자외선만 막아서', '두꺼워서'], a: 1, e: '가시광 투과는 유지, 장파 반사율이 커서 실내 복사열 손실 감소.' },
  { f: 'solar', q: '상당외기온도를 높이는 요인은?', o: ['흰색 외벽', '큰 일사 흡수율 α', '큰 h_t', '야간'], a: 1, e: 'T_sol = T_oa + αq_sol/h_t − εq_e/h_t → α↑ → T_sol↑.' },
  { f: 'solar', q: '여름 옥상 열취득을 줄이는 가장 쉬운 방법은?', o: ['검은 방수층', '흰색(고반사) 마감', '창문 크게', '환기 끄기'], a: 1, e: '흡수율 α를 낮추면 상당외기온도가 내려가요.' },
  { f: 'cond', q: '온도는 그대로, 수증기만 늘리면 상대습도는?', o: ['감소', '증가', '그대로', '0'], a: 1, e: 'p_sat(컵 크기)는 그대로, p(물)가 늘어서 φ = p/p_sat 증가.' },
  { f: 'cond', q: '응축기에서 물이 나오려면 코일 온도가?', o: ['공기온도보다 높게', '이슬점보다 낮게', '0 °C 이하', '상관없음'], a: 1, e: '이슬점 아래로 내려가야 φ=100% 에 도달해 응축.' },
  { f: 'cond', q: '절대습도 x에 대한 설명으로 옳은 것은?', o: ['온도에 따라 변한다', '건공기 1 kg당 수증기 질량', '항상 100% 이하', '%로 표시'], a: 1, e: 'x [g/kg(DA)] = 수증기 질량 / 건공기 질량. 냉각만으로는 변하지 않아요 (응축 전까지).' },
  { f: 'cond', q: '에어컨 제습 모드의 원리는?', o: ['수증기를 가열', '냉각 코일로 이슬점 아래 냉각', '공기 압축', '자외선'], a: 1, e: '냉방과 같은 원리, 팬을 약하게 해 더 차갑게 냉각 → 더 많이 응축.' },
  { f: 'fick', q: 'Fick 법칙에서 μ(투습저항계수)는 항상?', o: ['0보다 작다', '1 이상', '0~1 사이', '음수'], a: 1, e: 'μ = D₀/D, 정지 공기 D₀가 가장 커서 μ ≥ 1.' },
  { f: 'fick', q: '등가공기층두께 s_d 는?', o: ['μ/d', 'μ·d', 'd/μ', 'μ+d'], a: 1, e: 's_d = μd [m], 열의 R=d/k 에 해당.' },
  { f: 'fick', q: '방습필름(PE)의 특징은?', o: ['μ가 매우 크다', 'μ가 1이다', 'k가 매우 크다', '흡습성이 크다'], a: 0, e: 'μ가 매우 커서 s_d가 수십 m → 수증기 이동을 거의 막아요.' },
  { f: 'latent', q: '물 1 kg 을 증발시키는 데 필요한 잠열은 약?', o: ['334 kJ', '2265 kJ', '4.2 kJ', '100 kJ'], a: 1, e: '기화 잠열 ≈ 2265 kJ/kg (100 °C 기준). 융해는 334 kJ/kg.' },
  { f: 'latent', q: '상변화 중 열을 가하면 온도는?', o: ['계속 오른다', '일정하다', '내려간다', '진동한다'], a: 1, e: '잠열은 결합을 끊는 데 쓰여 온도가 변하지 않아요 → 단위가 kJ/kg.' },
  { f: 'glaser', q: '내단열 벽에서 방습층을 둘 위치는?', o: ['단열재의 실내측(따뜻한 쪽)', '단열재의 외기측', '맨 바깥', '아무 데나'], a: 0, e: '수증기는 따뜻하고 습한 실내에서 오므로 따뜻한 쪽에서 막아야 차가운 층에서 포화되지 않아요.' },
  { f: 'glaser', q: 'Glaser 선도의 가로축은?', o: ['실제 두께', '등가공기층두께 s_d', '온도', '시간'], a: 1, e: 's_d 축이면 수증기압 분포가 직선이 돼요.' },
  { f: 'glaser', q: 'ISO 13788 의 내표면 임계 상대습도는?', o: ['50%', '80%', '100%', '30%'], a: 1, e: '내표면 φ > 80% 이면 곰팡이 위험.' },
];
let quizOpen = false;
function openQuiz() {
  const pool = QUIZ.filter(q => has(q.f));
  if (!pool.length) return;
  const Q = pool[Math.floor(Math.random() * pool.length)];
  const reward = Math.max(40, 30 * incomeJ());
  quizOpen = true;
  $('#quizBubble').classList.add('hidden');
  showModal(`<h2>💡 공식 퀴즈</h2><p><b>${Q.q}</b></p><p style="color:var(--muted);font-size:13px">정답 보상: ${fJ(reward)}</p>
    <div class="choices">${Q.o.map((o, i) => `<button data-i="${i}">${o}</button>`).join('')}</div><div id="qExp"></div>`, () => { quizOpen = false; });
  $$('#modalBody .choices button').forEach(b => b.onclick = () => {
    if ($('#qExp').innerHTML) return;
    const i = +b.dataset.i, ok = i === Q.a;
    $$('#modalBody .choices button').forEach((x, j) => { if (j === Q.a) x.classList.add('right'); else if (j === i) x.classList.add('wrong'); });
    if (ok) { earn(reward); G.quizRight++; log(`💡 퀴즈 정답 +${fJ(reward)}`); }
    $('#qExp').innerHTML = `<div class="explain ${ok ? '' : 'bad'}">${ok ? '정답! +' + fJ(reward) : '아쉬워요.'} ${Q.e}</div>`;
  });
}
$('#quizBubble').onclick = openQuiz;

/* ---------------- 미니게임: 열교 찾기 ---------------- */
function bridgeGame() {
  const reward = Math.max(200, 40 * incomeJ());
  showModal(`<h2>📷 열교 찾기</h2><p>열화상 카메라로 본 겨울 외벽이에요. <b>열이 가장 많이 새는 곳(가장 따뜻하게 보이는 곳)</b>을 6초 안에 눌러 보세요! 보상 ${fJ(reward)}</p>
    <div class="timer"><i id="bgT" style="width:100%"></i></div><canvas class="mg-canvas" id="bgC"></canvas><div id="bgR"></div>`);
  const cv = $('#bgC');
  const { ctx, w, h } = fitCanvas(cv, 260);
  const floors = 3, cols = 4, fh = h / floors;
  const target = { f: 1 + Math.floor(Math.random() * (floors - 1)), side: Math.random() < 0.5 ? 0 : 1 };
  const tx = target.side ? w - 14 : 14, ty = target.f * fh;
  const img = ctx.createImageData(Math.ceil(w), Math.ceil(h));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let T = 0.15 + 0.05 * Math.sin(x * 0.05) * Math.cos(y * 0.07);
    for (let f = 1; f < floors; f++) T += 0.25 * Math.exp(-((y - f * fh) ** 2) / 30);            // 슬래브 라인 (약한 열교)
    for (let c = 0; c < cols; c++) for (let f = 0; f < floors; f++) {                                  // 창문
      const wx = (c + 0.5) * w / cols, wy = (f + 0.5) * fh;
      if (Math.abs(x - wx) < w / cols * 0.22 && Math.abs(y - wy) < fh * 0.25) T += 0.3;
    }
    T += 0.65 * Math.exp(-(((x - tx) ** 2) + ((y - ty) ** 2)) / 260);                             // 발코니 열교
    const [r, g, b] = lerpStops([[0, [20, 20, 90]], [0.3, [120, 30, 140]], [0.55, [230, 60, 50]], [0.8, [255, 180, 40]], [1, [255, 255, 200]]], T);
    const i = (y * Math.ceil(w) + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  const dpr = window.devicePixelRatio || 1;
  const tmp = document.createElement('canvas'); tmp.width = Math.ceil(w); tmp.height = Math.ceil(h); tmp.getContext('2d').putImageData(img, 0, 0);
  ctx.drawImage(tmp, 0, 0, w, h);
  let done = false; const t0 = performance.now();
  const timer = setInterval(() => {
    const left = 1 - (performance.now() - t0) / 6000;
    if (!$('#bgR')) { done = true; clearInterval(timer); return; } // 창을 닫으면 중단
    if ($('#bgT')) $('#bgT').style.width = Math.max(0, left * 100) + '%';
    if (left <= 0 && !done) { done = true; clearInterval(timer); finish(false); }
  }, 100);
  const finish = (ok) => {
    clearInterval(timer);
    ctx.strokeStyle = '#3ddc97'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx, ty, 18, 0, Math.PI * 2); ctx.stroke();
    if (ok) { earn(reward); log(`📷 열교 발견 +${fJ(reward)}`); }
    if (!$('#bgR')) return;
    $('#bgR').innerHTML = `<div class="explain ${ok ? '' : 'bad'}">${ok ? '정답! +' + fJ(reward) + ' ' : '놓쳤어요. '}초록 원: 발코니 슬래브가 벽을 관통하는 모서리. 슬래브 라인(층 사이 가로줄)과 창호 주변도 약한 열교예요. 열교에서는 실내 표면온도가 떨어져 결로·곰팡이가 생기기 쉬워요.</div>`;
  };
  cv.addEventListener('pointerdown', (e) => {
    if (done) return; done = true;
    const r = cv.getBoundingClientRect();
    finish(Math.hypot(e.clientX - r.left - tx, e.clientY - r.top - ty) < 30);
  });
}

/* ---------------- 미니게임: Glaser 결로 위기 ---------------- */
function glaserGame() {
  const Ti = 20, Te = -10 + Math.round(Math.random() * 6), RHi = 55 + Math.round(Math.random() * 15), RHe = 80;
  const reward = Math.max(500, 60 * incomeJ());
  const base = [['brick', 200, '벽돌 (외벽)'], ['mineral', 100, '미네랄울 단열재'], ['gypsum', 12.5, '석고보드']];
  showModal(`<h2>💧 결로 위기!</h2><p>고객이 오래된 벽돌집에 <b>내단열</b>을 했더니 벽 속이 젖는대요. 실내 ${Ti} °C / ${RHi}%, 외기 ${Te} °C. <b>방습층(PE 필름)</b>을 놓을 자리를 눌러 주세요.</p>
    <canvas class="mg-canvas" id="glC"></canvas><div id="glR"></div>`);
  const cv = $('#glC');
  const H = 230;
  const { ctx, w } = fitCanvas(cv, H);
  const x0 = 60, x1 = w - 60;
  const widths = [0.38, 0.42, 0.20];
  const xs = [x0]; widths.forEach(f => xs.push(xs[xs.length - 1] + f * (x1 - x0)));
  const cols = ['#c4703f', '#e9c46a', '#ede7da'];
  const drawWall = () => {
    ctx.clearRect(0, 0, w, H);
    ctx.fillStyle = '#163a66'; ctx.fillRect(0, 20, x0, H - 60); ctx.fillStyle = '#5a2a1e'; ctx.fillRect(x1, 20, w - x1, H - 60);
    base.forEach((b, i) => { ctx.fillStyle = cols[i]; ctx.fillRect(xs[i], 20, xs[i + 1] - xs[i], H - 60); ctx.fillStyle = '#1d2433'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(b[2], (xs[i] + xs[i + 1]) / 2, H / 2); });
    ctx.fillStyle = '#9fd0ff'; ctx.fillText('외기 ❄️', x0 / 2, H - 22); ctx.fillStyle = '#ffb08a'; ctx.fillText('실내 🔥', (x1 + w) / 2, H - 22);
    xs.forEach((x, i) => { ctx.fillStyle = 'rgba(108,92,231,.9)'; ctx.beginPath(); ctx.arc(x, 20 + (H - 60) / 2 + 30, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 12px sans-serif'; ctx.fillText(String.fromCharCode(65 + i), x, 20 + (H - 60) / 2 + 34); });
    ctx.fillStyle = '#c9d2f2'; ctx.font = '12px sans-serif'; ctx.fillText('보라색 A~D 중 방습층 위치를 고르세요', w / 2, 14);
  };
  drawWall();
  let done = false;
  cv.addEventListener('pointerdown', (e) => {
    if (done) return;
    const r = cv.getBoundingClientRect(), px = e.clientX - r.left;
    let best = 0; xs.forEach((x, i) => { if (Math.abs(px - x) < Math.abs(px - xs[best])) best = i; });
    if (Math.abs(px - xs[best]) > 30) return;
    done = true;
    const mk = (m, d) => ({ mat: m, d, k: MATERIALS[m].k, mu: MATERIALS[m].mu });
    const L = base.map(b => mk(b[0], b[1])); L.splice(best, 0, mk('vb', 0.2));
    const res = ENGINE.wall(L, { Ti, Te, RHi, RHe });
    const none = ENGINE.wall(base.map(b => mk(b[0], b[1])), { Ti, Te, RHi, RHe });
    const ok = res.cond.length === 0;
    // 방습층 표시
    ctx.fillStyle = '#6c5ce7'; ctx.fillRect(xs[best] - 3, 20, 6, H - 60);
    if (ok) { G.glaserWins++; G.mult = Math.min(3, G.mult + 0.1); earn(reward); log(`💧 결로 위기 해결! 전역 배수 ×${G.mult.toFixed(2)}, +${fJ(reward)}`); renderCards(); }
    const gd = (v) => (v * 86400 * 1000).toFixed(1);
    $('#glR').innerHTML = `<div class="explain ${ok ? '' : 'bad'}">${ok ? `정답! 결로 0. 전역 배수 +10% (×${G.mult.toFixed(2)}), +${fJ(reward)}` : `실패! 벽 속 결로 ${gd(res.gc)} g/(m²·day).`}
      방습층이 없으면 ${gd(none.gc)} g/(m²·day) 결로. 수증기는 따뜻하고 습한 <b>실내</b>에서 들어와요. 단열재의 <b>따뜻한 쪽(C 또는 D)</b>에서 막아야 차가운 벽돌과 단열재 경계에서 p &gt; p<sub>sat</sub> 가 되지 않아요.</div>
      <canvas class="mg-canvas" id="glP" style="margin-top:10px"></canvas>
      <div style="font-size:12px;color:var(--muted)">빨강: 포화수증기압 p<sub>sat</sub>, 파랑: 수증기압 p (결로 반영), 가로축: 두께 (왼쪽 외기)</div>`;
    drawGlaser($('#glP'), res);
  });
}
function drawGlaser(cv, c) {
  const pl = new Plot(cv, 200);
  const xm = c.xn[c.xn.length - 1];
  const s2x = (s) => { for (let i = 0; i < c.Ls.length; i++) if (s <= c.sn[i + 1] + 1e-12) return c.xn[i] + (s - c.sn[i]) / ((c.sn[i + 1] - c.sn[i]) || 1) * (c.xn[i + 1] - c.xn[i]); return xm; };
  const hp = [];
  for (let i = 0; i < c.hull.length - 1; i++) {
    const A = c.hull[i], B = c.hull[i + 1];
    [A.s, ...c.sn.filter(s => s > A.s && s < B.s), B.s].forEach(s => hp.push([s2x(s), A.p + (B.p - A.p) * (s - A.s) / ((B.s - A.s) || 1)]));
  }
  const sat = c.samp.map(p => [p.x, p.ps]);
  sat.unshift([0, PHYS.psat(c.Tse)]); sat.push([xm, PHYS.psat(c.Tsi)]);
  pl.draw({ x: [0, xm], y: [0, Math.max(...sat.map(p => p[1])) * 1.1], xlabel: '두께 [mm]', ylabel: 'Pa',
    bands: c.Ls.map((L, i) => ({ x0: c.xn[i], x1: c.xn[i + 1], color: (MATERIALS[L.mat].color) + '40' })),
    series: [{ pts: sat, color: '#c0392b', width: 2.5 }, { pts: hp, color: '#2e86de', width: 2.5 }],
    points: c.cond.length ? [{ x: s2x(c.cond[0].s), y: c.cond[0].p, color: '#2e86de', label: '결로!' }] : [] });
}

/* ---------------- 도감 / 도움말 ---------------- */
$('#btnDex').onclick = () => {
  showModal(`<h2>📖 공식 도감</h2><p style="color:var(--muted);font-size:13px">해금한 공식 ${G.unlocked.length} / ${FORMULAS.length}</p>` + FORMULAS.map(f => has(f.id)
    ? `<div class="dex-item"><h4>${look(f)[0]} ${f.name} <span style="font-size:11px;color:var(--muted)">${f.tag}</span></h4><div class="formula">${tex(f.tex)}</div><p>${f.desc}</p></div>`
    : `<div class="dex-item locked"><h4>🔒 ??? (${fJ(f.cost)})</h4></div>`).join(''));
};
$('#btnHelp').onclick = () => showHelp();
function showHelp() {
  showModal(`<h2>🔥 열공장 타이쿤</h2>
    <p>당신은 열을 배달해 파는 열공장 사장이에요. <b>돈 = 열에너지 J(줄)</b>, 수입은 <b>W = J/s</b> 예요.</p>
    <p>① 가운데 벽을 <b>클릭</b>하면 열이 넘어가며 돈이 들어와요.<br>
    ② 오른쪽 <b>공식 카드</b>가 자동으로 돈을 벌어요. 변수(k, ΔT, Δx, A…)를 업그레이드하면 공식대로 출력이 바뀌어요. 어떤 변수가 비례/반비례인지 느껴 보세요.<br>
    ③ 돈을 모아 <b>다음 공식을 해금</b>하세요: 병렬 → 직렬 → 대류 → 열교 → 복사 → 상당외기온도 → 💧습기(이슬점 → Fick 확산 → 잠열 → Glaser).<br>
    ④ 🔥 덩어리가 나타나면 <b>차가운 쪽으로 드래그</b>! 💡 퀴즈와 미니게임은 큰 보상을 줘요.</p>
    <p style="color:var(--muted);font-size:13px">진행 상황은 이 브라우저에 자동 저장돼요. 강의 「02 Thermal Energy and Heat Transfer」, 「03 Moisture Transfer」 내용을 바탕으로 만들었어요.</p>
    <button class="btn" id="resetBtn" style="margin-top:8px">처음부터 다시 하기</button>`);
  $('#resetBtn').onclick = () => { if ($('#resetBtn').dataset.c) { G = fresh(); save(); location.reload(); } else { $('#resetBtn').dataset.c = 1; $('#resetBtn').textContent = '정말 초기화할까요? 한 번 더 누르세요'; } };
}

/* ---------------- 메인 루프 ---------------- */
let shownJ = 0, bumpT = 0;
function bumpWallet() { const b = $('#boxJ'); if (!b) return; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); clearTimeout(bumpT); bumpT = setTimeout(() => b.classList.remove('bump'), 260); }
let last = performance.now(), acc = 0, quizTimer = 35, blobTimer = 12, evTimer = 60, saveTimer = 0;
function updateTop() {
  $('#rateJ').textContent = '+' + fW(incomeJ());
  if (has('cond')) { $('#moneyW').textContent = fG(G.Wg); $('#rateW').textContent = '+' + fG(waterRate()) + '/s'; }
  $('#clickVal').textContent = fJ(clickValue());
  $('#etaVal').textContent = (eta() * 100).toFixed(1) + '%';
  $('#multVal').textContent = '×' + G.mult.toFixed(2);
}
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  simT += dt;
  earn(incomeJ() * dt * SPEED, waterRate() * dt * SPEED, false);
  shownJ = G.J < shownJ || !MOTION ? G.J : shownJ + (G.J - shownJ) * Math.min(1, dt * 9);
  $('#moneyJ').textContent = fJ(shownJ);
  drawStage(dt);
  acc += dt;
  if (acc > 0.25) { acc = 0; updateTop(); refreshCards(); }
  // 이벤트 타이머
  if (!quizOpen) quizTimer -= dt;
  if (quizTimer <= 0) { quizTimer = 45 + Math.random() * 30; $('#quizBubble').classList.remove('hidden'); }
  blobTimer -= dt;
  if (blobTimer <= 0) { blobTimer = 22 + Math.random() * 25; spawnBlob(); }
  if (has('bridge') || has('glaser')) {
    evTimer -= dt;
    if (evTimer <= 0) {
      evTimer = 70 + Math.random() * 40;
      const opts = []; if (has('bridge')) opts.push('bridge'); if (has('glaser')) opts.push('glaser');
      const ev = opts[Math.floor(Math.random() * opts.length)];
      const b = $('#eventBubble');
      b.textContent = ev === 'bridge' ? '📷 열교 찾기 의뢰!' : '💧 결로 위기 의뢰!';
      b.dataset.ev = ev; b.classList.remove('hidden');
    }
  }
  if (!G.ended && G.life >= 1e12) { G.ended = true; showModal(`<h2>🏆 열공장 마스터!</h2><p>누적 1 TJ 의 열에너지를 다뤘어요. 전도·대류·복사부터 습기와 결로까지, 두 강의의 핵심 공식을 모두 손에 넣었습니다. 계속 플레이하며 기록을 늘려 보세요!</p>`); }
  saveTimer += dt; if (saveTimer > 5) { saveTimer = 0; save(); }
  requestAnimationFrame(loop);
}
$('#eventBubble').onclick = () => { const ev = $('#eventBubble').dataset.ev; $('#eventBubble').classList.add('hidden'); ev === 'bridge' ? bridgeGame() : glaserGame(); };

/* ---------------- 시작 ---------------- */
(function start() {
  const s = load();
  G = s || fresh();
  if (has('cond')) $('#waterBox').classList.remove('hidden');
  renderCards(); updateTop();
  shownJ = G.J;
  if (s) {
    const off = Math.min(7200, (Date.now() - (s.last || Date.now())) / 1000);
    if (off > 30) { const gain = incomeJ() * off * 0.5, gw = waterRate() * off * 0.5; earn(gain, gw); toast(`자리 비운 동안 +${fJ(gain)} 벌었어요 (${Math.round(off / 60)}분, 50%)`); }
    log('저장된 게임을 불러왔어요.');
  } else { showHelp(); log('열공장을 시작했어요! 벽을 클릭해 보세요.'); }
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  requestAnimationFrame(loop);
})();
