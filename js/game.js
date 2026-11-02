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
// 카드 모양: [아이콘, 진한색, 밝은색, 짧은 이름]
const LOOK = {
  fourier: ['🧱', '#ff6b35', '#ffb347', '전도'], parallel: ['🔀', '#ff8c42', '#ffd166', '병렬'], series: ['🧥', '#f4a300', '#ffe066', '직렬 단열'],
  conv: ['🌀', '#ff5d8f', '#ffa3c1', '대류'], bridge: ['🌉', '#9b5de5', '#d0a8ff', '열교'], rad: ['🔆', '#ff4d4d', '#ffb199', '복사'],
  solar: ['☀️', '#ffb000', '#ffe27a', '햇빛'], cond: ['🧊', '#2c9be6', '#8fd3ff', '이슬점'], fick: ['🫧', '#3a7bff', '#9ec5ff', '확산'],
  latent: ['♨️', '#ff7a45', '#7fd3ff', '잠열'], glaser: ['🛡️', '#6c5ce7', '#a29bfe', '결로'],
};
// 업그레이드 버튼에 쓰는 짧은 이름: [기호, 한 단어]
const SHORT = {
  'fourier.k': ['k', '재료'], 'fourier.dT': ['ΔT', '온도차'], 'fourier.dx': ['Δx', '두께'], 'fourier.A': ['A', '면적'],
  'parallel.N': ['N', '막대 수'], 'series.Rt': ['R', '단열층'],
  'conv.h': ['h', '흐름'], 'conv.dT': ['ΔT', '온도차'], 'conv.A': ['A', '면적'], 'bridge.beta': ['β', '누설'],
  'rad.T': ['T', '온도'], 'rad.eps': ['ε', '표면'], 'rad.A': ['A', '면적'],
  'solar.alpha': ['α', '색'], 'solar.qpk': ['q', '지역'], 'solar.A': ['A', '면적'],
  'cond.RH': ['φ', '습도'], 'cond.T2': ['T', '코일'], 'cond.m': ['ṁ', '바람'],
  'fick.dp': ['Δp', '압력차'], 'fick.mu': ['μ', '막'], 'fick.d': ['d', '두께'], 'fick.A': ['A', '면적'], 'latent.eff': ['η', '회수'],
};
const look = (f) => LOOK[f.id] || ['⚙️', '#ff6b35', '#ffb347', f.name];
const cssVars = (f) => `--c1:${look(f)[1]};--c2:${look(f)[2]}`;
const texI = (s) => { try { return katex.renderToString(s, { throwOnError: false, displayMode: false }); } catch (e) { return s; } };
// 카드 한 줄 공식: tex 의 첫 식만 (\qquad 앞)
const mainTex = (f) => f.tex.split(/\\qquad|,\\quad/)[0].replace(/,\s*$/, '');

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

function upHTML(f, p) {
  const L = lvl(f.id, p.id), M = maxL(p), v = param(f, p), cur = f.cur || 'J';
  const sh = SHORT[f.id + '.' + p.id] || [p.id, p.label];
  const next = L < M ? (p.values ? p.values[L + 1] : p.fn(L + 1)) : null;
  const nm = p.names ? p.names[Math.min(L, p.names.length - 1)] : null;
  const val = nm ? (next != null ? `${nm} → <b>${p.names[L + 1]}</b>` : nm) : `${num(v)}${next != null ? ` → <b>${num(next)}</b>` : ''} ${p.unit}`;
  return `<button class="up ${L >= M ? 'maxed' : ''}" data-f="${f.id}" data-p="${p.id}" ${L >= M ? 'disabled' : ''} title="${p.label}: ${p.why}">
    <span class="sym">${sh[0]}<small>${sh[1]}</small></span><span class="val">${val}</span>
    <span class="cost">${L >= M ? 'MAX' : (cur === 'W' ? '💧' : '🔥') + ' ' + fCur(upCost(f, p, L), cur)}</span><span class="fill"></span></button>`;
}
function outHTML(f) {
  return f.heat ? fW(rawOut(f) * eta() * G.mult) : f.water ? fG(rawOut(f) * G.mult) + '/s' : '';
}
function renderCards() {
  const col = $('#cards');
  const list = FORMULAS.filter(f => has(f.id)).reverse();
  col.innerHTML = list.map(f => {
    const lk = look(f), o = outHTML(f);
    return `<div class="card panel" id="card-${f.id}" style="${cssVars(f)}">
      <div class="card-head"><div class="badge">${lk[0]}</div>
        <div class="ttl"><div class="name">${lk[3]}<button class="qbtn" data-info="${f.id}" title="원리 보기">?</button></div><div class="eq">${texI(mainTex(f))}</div></div>
        ${o ? `<div class="out ${f.water ? 'w' : ''}"><span>${o}</span><small>${f.water ? '물' : '열'} 수입</small></div>` : f.id === 'glaser' ? `<div class="out"><span>×${G.mult.toFixed(1)}</span><small>배수</small></div>` : ''}</div>
      ${f.params.length ? `<div class="ups">${f.params.map(p => upHTML(f, p)).join('')}</div>` : ''}</div>`;
  }).join('');
  refreshCards();
}
function refreshCards() {
  FORMULAS.forEach(f => {
    if (!has(f.id)) return;
    const o = document.querySelector(`#card-${f.id} .out span`);
    if (o && (f.heat || f.water)) o.textContent = outHTML(f);
  });
  $$('.up').forEach(b => {
    const f = FMAP[b.dataset.f], p = f.params.find(x => x.id === b.dataset.p), L = lvl(f.id, p.id);
    if (L >= maxL(p)) return;
    const cur = f.cur || 'J', cost = upCost(f, p, L), ok = canPay(cost, cur);
    b.classList.toggle('can', ok);
    b.querySelector('.cost').textContent = (cur === 'W' ? '💧 ' : '🔥 ') + fCur(cost, cur);
    b.querySelector('.fill').style.width = Math.min(100, (cur === 'W' ? G.Wg : G.J) / cost * 100) + '%';
  });
  renderNext();
}
function infoModal(f) {
  showModal(`<div class="burst" style="${cssVars(f)}"><div class="badge">${look(f)[0]}</div><h2>${f.name}</h2></div>
    <div class="formula">${tex(f.tex)}</div><div class="subst">${f.subst(pvals(f))}</div><p>${f.desc}</p>`);
}
$('#cards').addEventListener('click', (e) => { const q = e.target.closest('[data-info]'); if (q) { e.stopPropagation(); infoModal(FMAP[q.dataset.info]); } }, true);
function renderNext() {
  const nf = FORMULAS.find(f => !has(f.id));
  const box = $('#nextCard');
  if (!nf) {
    const key = 'end' + Math.floor(G.life / 1e12 * 100);
    if (box.dataset.key === key) return; box.dataset.key = key;
    box.className = 'panel next';
    box.innerHTML = `<div class="ring" style="--p:${Math.min(100, G.life / 1e12 * 100)}"><span>🏆</span></div><div class="info"><div class="kick">모든 공식 해금!</div><div class="nm">누적 1 TJ 모으기</div></div>`;
    return;
  }
  const pct = Math.min(100, G.J / nf.cost * 100), ready = G.J >= nf.cost, m = nf.tag === '습기';
  const key = nf.id + (ready ? 1 : 0) + Math.floor(pct);
  if (box.dataset.key === key) return; // 같은 상태면 다시 그리지 않음 (애니메이션 유지)
  box.dataset.key = key;
  box.className = 'panel next' + (m ? ' m' : '');
  box.innerHTML = `<div class="ring ${ready ? 'ready' : ''}" style="--p:${pct}"><span>${ready ? look(nf)[0] : '🔒'}</span></div>
    <div class="info"><div class="kick">다음 공식${m && !has('cond') ? ' · 💧 습기 시작!' : ''}</div><div class="nm">${look(nf)[3]}</div></div>
    <button class="unlock-btn ${m ? 'm' : ''}" id="unlockBtn" ${ready ? '' : 'disabled'}>🔥 ${fJ(nf.cost)}</button>`;
  $('#unlockBtn').onclick = () => unlock(nf);
}
function unlock(f) {
  if (G.J < f.cost || has(f.id)) return;
  G.J -= f.cost; G.unlocked.push(f.id);
  if (f.id === 'cond') $('#waterBox').classList.remove('hidden');
  log(`🔓 ${f.name} 해금!`);
  renderCards(); save();
  $('#nextCard').dataset.key = '';
  showModal(`<div class="burst" style="${cssVars(f)}"><div class="rays"></div><div class="badge">${look(f)[0]}</div><h2>${look(f)[3]} 해금!</h2></div>
    <div class="formula">${tex(f.tex)}</div><p>${f.desc}</p><button class="big-ok" id="okBtn">좋아요!</button>`);
  $('#okBtn').onclick = hideModal; burst(null, null, 40); shake();
}
$('#cards').addEventListener('click', (e) => {
  const b = e.target.closest('.up'); if (!b || b.disabled) return;
  const f = FMAP[b.dataset.f], p = f.params.find(x => x.id === b.dataset.p), L = lvl(f.id, p.id), cur = f.cur || 'J';
  const cost = upCost(f, p, L);
  if (!canPay(cost, cur) || L >= maxL(p)) { toast('잔액이 부족해요'); return; }
  const before = f.heat ? rawOut(f) : f.water ? rawOut(f) : incomeJ();
  pay(cost, cur); G.lv[f.id + '.' + p.id] = L + 1;
  const after = f.heat ? rawOut(f) : f.water ? rawOut(f) : incomeJ();
  const sh = (SHORT[f.id + '.' + p.id] || [p.id, p.label])[1];
  if (before > 0 && after > 0) toast(`${look(f)[0]} ${sh} ↑  출력 ×${(after / before).toFixed(2)}`);
  else toast(`${look(f)[0]} ${sh} ↑`);
  renderCards(); save();
  const nb = document.querySelector(`.up[data-f="${f.id}"][data-p="${p.id}"]`); if (nb) nb.classList.add('pop');
  burst(null, null, 10);
});

/* ---------------- 무대 (캔버스) ---------------- */
const stage = $('#stage');
let parts = [], floats = [], blob = null, drag = null, drops = [];
const MAT_COL = { 0.035: '#f4e04d', 0.13: '#c9a26b', 0.7: '#c4703f', 1.5: '#a9adb3', 50: '#7f8c9d', 200: '#d6dde6', 400: '#d98c4a', 2000: '#b9f2ff' };
function geom() {
  const w = stage.clientWidth, h = Math.round(Math.min(460, Math.max(340, w * 0.66)));
  const z = w < 520 ? 0.29 : 0.25;
  return { w, h, hx: w * z, cx: w * (1 - z) };
}
let embers = [], snow = [], sparks = [], ripples = [], smoke = [], squash = 0;
const MOTION = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const OUTLINE = 'rgba(43,45,66,.85)';
function burst(x, y, n = 12, col) {
  if (x == null) { const g = geom(); x = g.hx * 0.5; y = g.h * 0.5; }
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 180; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.5 + Math.random() * 0.4, c: col || ['#ffd23f', '#ff8c42', '#ff6b35', '#fff3b0'][i % 4], r: 2 + Math.random() * 3 }); }
}
function shake() { if (!MOTION) return; const w = $('#stageWrap'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); }
function eyes(ctx, x, y, s, look = 0, blink = false) {
  // 귀여운 눈: 흰자 + 눈동자 + 하이라이트
  for (const dx of [-1, 1]) {
    const ex = x + dx * s * 0.42;
    if (blink) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(1.5, s * 0.1); ctx.beginPath(); ctx.moveTo(ex - s * 0.18, y); ctx.lineTo(ex + s * 0.18, y); ctx.stroke(); continue; }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, y, s * 0.24, s * 0.3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(ex + look * s * 0.08, y + s * 0.04, s * 0.15, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + look * s * 0.08 - s * 0.05, y - s * 0.04, s * 0.05, 0, 7); ctx.fill();
  }
}
function blush(ctx, x, y, s) { ctx.fillStyle = 'rgba(255,90,120,.35)'; for (const dx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + dx * s * 0.75, y + s * 0.32, s * 0.18, s * 0.1, 0, 0, 7); ctx.fill(); } }
function flameShape(ctx, x, y, s, t, sx = 1, sy = 1) {
  // 아래가 둥근 물방울 모양 불꽃 (y = 바닥 중심)
  const wob = Math.sin(t * 7) * s * 0.06;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.55 * sy);
  ctx.bezierCurveTo(x + s * 0.35 * sx + wob, y - s * 1.05 * sy, x + s * 0.8 * sx, y - s * 0.75 * sy, x + s * 0.8 * sx, y - s * 0.38 * sy);
  ctx.bezierCurveTo(x + s * 0.8 * sx, y, x + s * 0.35 * sx, y, x, y);
  ctx.bezierCurveTo(x - s * 0.35 * sx, y, x - s * 0.8 * sx, y, x - s * 0.8 * sx, y - s * 0.38 * sy);
  ctx.bezierCurveTo(x - s * 0.8 * sx, y - s * 0.8 * sy, x - s * 0.25 * sx + wob, y - s * 1.0 * sy, x, y - s * 1.55 * sy);
  ctx.closePath();
}
function drawMascot(ctx, x, y, s, t) {
  // 불꽃이: 탭할 때 찌그러졌다 튀어오름
  const sq = squash; const sx = 1 + sq * 0.25, sy = 1 - sq * 0.22 + Math.sin(t * 3) * 0.03;
  ctx.save();
  ctx.shadowColor = 'rgba(255,120,40,.55)'; ctx.shadowBlur = 30;
  let g = ctx.createLinearGradient(0, y - s * 1.6, 0, y);
  g.addColorStop(0, '#ffd23f'); g.addColorStop(0.55, '#ff8c42'); g.addColorStop(1, '#ff5a2a');
  flameShape(ctx, x, y, s, t, sx, sy); ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(2, s * 0.06); ctx.strokeStyle = 'rgba(200,60,20,.55)'; ctx.stroke();
  g = ctx.createLinearGradient(0, y - s, 0, y);
  g.addColorStop(0, '#fff3b0'); g.addColorStop(1, '#ffd23f');
  flameShape(ctx, x, y - s * 0.06, s * 0.55, t + 1, sx, sy); ctx.fillStyle = g; ctx.fill();
  const blink = (t % 3.2) < 0.12;
  eyes(ctx, x, y - s * 0.62 * sy, s * 0.55, Math.sin(t * 0.7), blink);
  blush(ctx, x, y - s * 0.62 * sy, s * 0.55);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y - s * 0.42 * sy, s * (sq > 0.1 ? 0.12 : 0.09), 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.restore();
}
function drawHouse(ctx, x, y, w, h, t, warm) {
  // 고객 집: 굴뚝 연기, 눈 쌓인 지붕, 수입이 늘수록 창문이 밝아짐
  const bw = w, bh = h * 0.58, by = y - bh;
  ctx.fillStyle = '#c0583a'; roundRect(ctx, x + bw * 0.62, by - h * 0.34, bw * 0.14, h * 0.24, 3); ctx.fill();
  ctx.fillStyle = '#fff'; roundRect(ctx, x + bw * 0.6, by - h * 0.36, bw * 0.18, h * 0.05, 4); ctx.fill();
  ctx.fillStyle = '#fff4e2'; roundRect(ctx, x, by, bw, bh, 10); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(43,45,66,.12)'; ctx.stroke();
  ctx.fillStyle = '#e8644a'; ctx.beginPath(); ctx.moveTo(x - bw * 0.1, by + 4); ctx.quadraticCurveTo(x + bw * 0.5, by - h * 0.62, x + bw * 1.1, by + 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + bw * 0.08, by - h * 0.12); ctx.quadraticCurveTo(x + bw * 0.5, by - h * 0.5, x + bw * 0.92, by - h * 0.12);
  ctx.quadraticCurveTo(x + bw * 0.5, by - h * 0.34, x + bw * 0.08, by - h * 0.12); ctx.fill();
  for (let i = 0; i < 2; i++) {
    const wx = x + bw * (0.14 + i * 0.46), wy = by + bh * 0.18, ww = bw * 0.3, wh = bh * 0.34;
    const a = 0.25 + 0.75 * warm;
    ctx.fillStyle = `rgba(255,${Math.round(214 + 20 * warm)},${Math.round(110 + 40 * warm)},${a})`;
    ctx.shadowColor = '#ffcf5a'; ctx.shadowBlur = 24 * warm; roundRect(ctx, wx, wy, ww, wh, 6); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(43,45,66,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
  }
  ctx.fillStyle = '#b5653f'; roundRect(ctx, x + bw * 0.38, by + bh * 0.6, bw * 0.24, bh * 0.4, 8); ctx.fill();
  if (MOTION && Math.random() < 0.05 + 0.1 * warm) smoke.push({ x: x + bw * 0.69, y: by - h * 0.36, r: 5, life: 2.4 });
}
function drawStage(dt) {
  const { ctx, w, h } = fitCanvas(stage, geom().h);
  const { hx, cx } = geom();
  const t = performance.now() / 1000;
  squash = Math.max(0, squash - dt * 4);
  ctx.clearRect(0, 0, w, h);
  // 하늘: 왼쪽 노을(뜨거움) → 오른쪽 겨울 하늘(차가움). 햇빛 공식이 있으면 밤낮이 바뀜.
  const night = has('solar') ? 1 - sunFactor() : 0;
  const sky = ctx.createLinearGradient(0, 0, w, 0);
  sky.addColorStop(0, '#ffcfa8'); sky.addColorStop(0.35, '#ffe7cf'); sky.addColorStop(0.62, '#e3f3ff'); sky.addColorStop(1, '#b6e0ff');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  if (night > 0) { ctx.fillStyle = `rgba(40,50,110,${0.28 * night})`; ctx.fillRect(w * 0.5, 0, w * 0.5, h); }
  const ground = h * 0.86;
  // 바닥: 왼쪽 따뜻한 흙 → 오른쪽 눈 (부드럽게 이어짐)
  const gg = ctx.createLinearGradient(0, 0, w, 0);
  gg.addColorStop(0, '#ffb27a'); gg.addColorStop(0.4, '#ffd2a8'); gg.addColorStop(0.6, '#f4f9ff'); gg.addColorStop(1, '#ffffff');
  ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(0, ground + 4); ctx.bezierCurveTo(w * 0.3, ground - 14, w * 0.7, ground + 10, w, ground - 4); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.stroke();

  // 해 / 달
  if (has('solar')) {
    const s = sunFactor(), ang = (simT % 60) / 60;
    if (ang < 0.5) {
      const R = Math.min(26, w * 0.05), sx = w * 0.6 + (w * 0.4 - R * 2) * (ang * 2), sy = R + 10 + (1 - s) * h * 0.06;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.4);
      ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.beginPath(); roundRect(ctx, R + 3, -3, R * 0.45, 6, 3); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#ffd23f'; ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(sx, sy, R, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      eyes(ctx, sx, sy - R * 0.1, R * 0.7, 0, (t % 4) < 0.12); blush(ctx, sx, sy - R * 0.1, R * 0.7);
    } else { ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(w - 40, 40, 16, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(120,130,190,.9)'; ctx.beginPath(); ctx.arc(w - 33, 35, 14, 0, 7); ctx.fill(); }
  }
  // 눈송이 · 연기
  if (MOTION && snow.length < 34 && Math.random() < 0.35) snow.push({ x: w * 0.55 + Math.random() * w * 0.45, y: -6, vy: 16 + Math.random() * 20, ph: Math.random() * 6, s: 1.5 + Math.random() * 2.2 });
  snow = snow.filter(s => s.y < ground + 10);
  ctx.fillStyle = '#fff'; snow.forEach(s => { s.y += s.vy * dt; s.x += Math.sin(t + s.ph) * 12 * dt; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 7); ctx.fill(); });
  smoke = smoke.filter(p => (p.life -= dt) > 0);
  smoke.forEach(p => { p.y -= 18 * dt; p.x += 8 * dt; p.r += 6 * dt; ctx.fillStyle = `rgba(255,255,255,${Math.min(0.8, p.life / 2.4)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); });

  // 고객 집
  const warm = Math.min(1, Math.log10(1 + heatRate()) / 7);
  const hw = Math.min((w - cx) * 0.84, 160), hh = hw * 1.1, houseX = cx + (w - cx - hw) / 2 + 2;
  drawHouse(ctx, houseX, ground + 2, hw, hh, t, warm);

  // 받침대 + 불꽃이
  const ms = Math.min(hx * 0.5, 84);
  ctx.fillStyle = '#7a4a3a'; roundRect(ctx, hx * 0.5 - ms * 0.95, ground - ms * 0.28, ms * 1.9, ms * 0.42, 12); ctx.fill();
  ctx.fillStyle = '#9b6150'; roundRect(ctx, hx * 0.5 - ms * 0.95, ground - ms * 0.28, ms * 1.9, ms * 0.14, 8); ctx.fill();
  drawMascot(ctx, hx * 0.5, ground - ms * 0.26, ms, t);
  if (MOTION && embers.length < 24 && Math.random() < 0.4) embers.push({ x: hx * 0.5 + (Math.random() - 0.5) * ms, y: ground - ms * 1.2, vy: -(30 + Math.random() * 40), life: 1 + Math.random(), s: 1.5 + Math.random() * 2 });
  embers = embers.filter(e => (e.life -= dt) > 0);
  embers.forEach(e => { e.y += e.vy * dt; e.x += Math.sin(t * 4 + e.y * 0.05) * 14 * dt; ctx.fillStyle = `rgba(255,${140 + Math.round(80 * e.life / 2)},60,${Math.min(1, e.life)})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.s, 0, 7); ctx.fill(); });

  // 파이프 (푸리에 막대, 병렬이면 여러 개)
  const Nall = has('parallel') ? P('parallel', 'N') : 1, N = Math.min(6, Nall);
  const top = h * 0.36, bot = Math.min(h * 0.76, ground - hh * 0.12), gap = (bot - top) / N;
  const kL = lvl('fourier', 'k');
  const thick = Math.max(9, Math.min(gap * 0.5, 14 + kL * 1.2 + lvl('fourier', 'A') * 0.15));
  const sL = has('series') ? lvl('series', 'Rt') : 0;
  const px0 = hx * 0.5 + ms * 0.55, px1 = houseX + hw * 0.1;
  const rods = [];
  for (let i = 0; i < N; i++) {
    const y = top + gap * (i + 0.5); rods.push(y);
    if (sL) { // 직렬 단열: 노란 솜 슬리브, 층이 늘수록 두꺼워짐
      const pad = 3 + sL * 2.2;
      ctx.fillStyle = '#ffe58a'; roundRect(ctx, px0 + 18, y - thick / 2 - pad, px1 - px0 - 36, thick + pad * 2, (thick + pad * 2) / 2); ctx.fill();
      ctx.strokeStyle = 'rgba(214,160,0,.5)'; ctx.lineWidth = 2; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
    }
    const rg = ctx.createLinearGradient(px0, 0, px1, 0);
    rg.addColorStop(0, '#ff7a45'); rg.addColorStop(0.5, '#ffc06b'); rg.addColorStop(1, '#5bb8ff');
    ctx.fillStyle = rg; roundRect(ctx, px0, y - thick / 2, px1 - px0, thick, thick / 2); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(43,45,66,.18)'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; roundRect(ctx, px0 + thick / 2, y - thick / 2 + 2.5, px1 - px0 - thick, Math.max(2, thick * 0.2), 2); ctx.fill();
  }
  if (Nall > N) { ctx.fillStyle = 'rgba(43,45,66,.55)'; ctx.font = '700 12px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`×${Nall}`, (px0 + px1) / 2, bot + 14); }

  // 열교 슬래브 (위쪽 콘크리트 보) — 해금 전에는 몰래 새는 열이 보임
  {
    const b = beta(), sy = h * 0.24;
    ctx.fillStyle = '#c9c6d3'; roundRect(ctx, px0, sy - 6, px1 - px0, 12, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; roundRect(ctx, px0 + 6, sy - 4, px1 - px0 - 12, 3, 2); ctx.fill();
    if (MOTION && Math.random() < b * 0.5) sparks.push({ x: px0 + Math.random() * (px1 - px0), y: sy, vx: 0, vy: -20, life: 0.8, c: '#ff8c42', r: 3, leak: true });
    if (!has('bridge')) { // 느낌표 말풍선
      const bx = px1 - 10, by = sy - 26 + Math.sin(t * 4) * 2;
      ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(bx, by, 11, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '800 14px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', bx, by + 1); ctx.textBaseline = 'alphabetic';
    }
  }
  // 열 방울 (눈 달린 작은 불씨)
  const inc = heatRate();
  const want = Math.min(70, Math.round(4 + 8 * Math.log10(1 + inc)));
  const speed = 70 + 28 * Math.log10(1 + inc);
  if (parts.length < want && Math.random() < 0.4) parts.push({ x: px0, r: Math.floor(Math.random() * N), leak: Math.random() < (1 - eta()) * 0.6, vy: 0, y: 0, ph: Math.random() * 6 });
  parts = parts.filter(p => p.x < px1 - 6 && p.y < h);
  parts.forEach(p => {
    const ry = rods[p.r % rods.length];
    p.x += speed * dt;
    if (p.leak && p.x > (px0 + px1) / 2) { p.vy += 220 * dt; p.y += p.vy * dt; }
    const u = (p.x - px0) / (px1 - px0), R = Math.min(7, thick * 0.42) + 1;
    const yy = ry + p.y + Math.sin(t * 10 + p.ph) * 1.2;
    ctx.fillStyle = p.leak && p.y > 0 ? '#ff6b6b' : `rgb(255,${Math.round(150 + 80 * u)},${Math.round(60 + 120 * u)})`;
    ctx.beginPath(); ctx.arc(p.x, yy, R, 0, 7); ctx.fill();
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(p.x + R * 0.35, yy - R * 0.15, R * 0.18, 0, 7); ctx.arc(p.x - R * 0.2, yy - R * 0.15, R * 0.18, 0, 7); ctx.fill();
  });
  // 대류 선풍기 (왼쪽 위)
  if (has('conv')) {
    const hL = lvl('conv', 'h'), fx2 = hx * 0.5, fy2 = h * 0.17, R = Math.min(22, hx * 0.14);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(fx2, fy2, R + 6, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(43,45,66,.12)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.translate(fx2, fy2); ctx.rotate(t * (1.5 + hL * 3));
    ctx.fillStyle = hL >= 3 ? '#3fa7ff' : '#ff8fb1';
    for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.ellipse(R * 0.5, 0, R * 0.5, R * 0.26, 0.3, 0, 7); ctx.fill(); }
    ctx.restore(); ctx.fillStyle = '#2b2d42'; ctx.beginPath(); ctx.arc(fx2, fy2, 3.5, 0, 7); ctx.fill();
  }
  // 복사판 (가운데 위): 온도가 오를수록 빨강 → 노랑 → 흰색
  if (has('rad')) {
    const T = P('rad', 'T'), u = Math.min(1, (T - 400) / 2200);
    const col = u < 0.3 ? `rgb(${Math.round(200 + 180 * u)},${Math.round(70 + 100 * u)},60)` : u < 0.7 ? `rgb(255,${Math.round(130 + 150 * (u - 0.3))},70)` : `rgb(255,${Math.round(220 + 80 * (u - 0.7))},${Math.round(120 + 400 * (u - 0.7))})`;
    const rx = w * 0.5, ry = h * 0.11, rw = Math.min(90, w * 0.16);
    ctx.shadowColor = col; ctx.shadowBlur = 16 + 30 * u; ctx.fillStyle = col; roundRect(ctx, rx - rw / 2, ry - 8, rw, 16, 8); ctx.fill(); ctx.shadowBlur = 0;
    if (MOTION) { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; for (let i = -1; i <= 1; i++) { const ph = (t * 1.5 + i * 0.3) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); for (let k = 0; k <= 8; k++) { const xx = rx + i * rw * 0.3 + Math.sin(k * 1.2 + t * 6) * 3, yy = ry + 12 + ph * 20 + k * 1.6; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); } ctx.globalAlpha = 1; ctx.lineCap = 'butt'; }
  }
  // 이슬점 응축기 (가운데 아래): 이슬점보다 차가우면 물방울이 똑똑
  if (has('cond')) {
    const wr = rawOut(FMAP.cond), bx2 = w * 0.5, by2 = h * 0.86;
    ctx.strokeStyle = wr > 0 ? '#3fa7ff' : '#b9c3d6'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 6; i++) { const x = bx2 - 54 + i * 18; i ? ctx.lineTo(x, by2 - 12 + (i % 2) * 10) : ctx.moveTo(x, by2 - 12); }
    ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#5ab0ff'; roundRect(ctx, bx2 - 22, by2 + 12, 44, 20, 6); ctx.fill();
    if (wr > 0 && Math.random() < Math.min(0.5, 0.06 + Math.log10(1 + wr) * 0.1)) drops.push({ x: bx2 - 48 + Math.random() * 96, y: by2 });
    drops = drops.filter(d => d.y < by2 + 14); ctx.fillStyle = '#3fa7ff';
    drops.forEach(d => { d.y += 70 * dt; d.x += (bx2 - d.x) * dt * 2; ctx.beginPath(); ctx.moveTo(d.x, d.y - 6); ctx.quadraticCurveTo(d.x + 4, d.y, d.x, d.y + 2.5); ctx.quadraticCurveTo(d.x - 4, d.y, d.x, d.y - 6); ctx.fill(); });
    if (wr <= 0) { ctx.fillStyle = 'rgba(43,45,66,.5)'; ctx.font = '800 13px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', bx2, by2 - 22 + Math.sin(t * 3) * 2); }
  }
  // 탭 파문 · 불꽃
  ripples = ripples.filter(r => (r.life -= dt) > 0);
  ripples.forEach(r => { ctx.strokeStyle = `rgba(255,140,60,${r.life * 2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, (0.5 - r.life) * 80 + 8, 0, 7); ctx.stroke(); });
  sparks = sparks.filter(s => (s.life -= dt) > 0);
  sparks.forEach(s => { if (!s.leak) s.vy += 380 * dt; s.x += s.vx * dt; s.y += s.vy * dt; ctx.globalAlpha = Math.min(1, s.life * 2); ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, s.r || 2.5, 0, 7); ctx.fill(); });
  ctx.globalAlpha = 1;
  // 떠오르는 숫자: 흰 테두리 + 주황 글씨
  floats = floats.filter(f => f.life > 0);
  floats.forEach(f => {
    f.y -= 50 * dt; f.life -= dt; const age = (f.max || 1) - f.life, sc = age < 0.12 ? 0.6 + age / 0.12 * 0.6 : 1.2 - Math.min(0.2, (age - 0.12) * 2);
    ctx.globalAlpha = Math.min(1, f.life * 2); ctx.textAlign = 'center';
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(sc, sc);
    ctx.font = `${f.big ? 26 : 20}px Jua, "Pretendard Variable", sans-serif`; ctx.lineJoin = 'round';
    ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.strokeText(f.t, 0, 0); ctx.fillStyle = f.c || '#ff6b35'; ctx.fillText(f.t, 0, 0);
    ctx.restore(); ctx.globalAlpha = 1;
  });
  // 처음 시작 안내 (탭 3번 전까지)
  if (G.clicks < 3 && !blob) {
    const bx = hx * 0.5 + 20, by = ground - ms * 1.9 - 14 + Math.sin(t * 5) * 5;
    ctx.fillStyle = '#2b2d42'; roundRect(ctx, bx - 34, by - 16, 68, 32, 16); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx - 6, by + 15); ctx.lineTo(bx, by + 23); ctx.lineTo(bx + 6, by + 15); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '17px Jua, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('탭!', bx, by + 1); ctx.textBaseline = 'alphabetic';
  }
  // 불덩이 (끌어서 집으로)
  if (blob) {
    blob.life -= dt;
    if (blob.life <= 0 && !drag) { blob = null; }
    else {
      const hx0 = houseX;
      if (drag) { ctx.strokeStyle = `rgba(63,167,255,${0.5 + 0.3 * Math.sin(t * 8)})`; ctx.lineWidth = 4; ctx.setLineDash([8, 8]); roundRect(ctx, hx0 - 12, ground - hh * 1.05, hw + 24, hh * 1.05 + 4, 18); ctx.stroke(); ctx.setLineDash([]); }
      const R = 27 + Math.sin(t * 6) * 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(blob.x, blob.y - R * 0.4, R + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, blob.life) / 12); ctx.stroke(); ctx.lineCap = 'butt';
      const saved = squash; squash = drag ? 0.3 : 0; drawMascot(ctx, blob.x, blob.y + R * 0.5, R, t * 1.5); squash = saved;
      if (!drag) { // 화살표 힌트
        const ax = blob.x + R + 18 + Math.sin(t * 6) * 4;
        ctx.fillStyle = '#3fa7ff'; ctx.beginPath(); ctx.moveTo(ax, blob.y - 8); ctx.lineTo(ax + 14, blob.y); ctx.lineTo(ax, blob.y + 8); ctx.fill();
        ctx.fillRect(ax - 12, blob.y - 3, 12, 6);
        ctx.fillStyle = 'rgba(63,167,255,.9)'; ctx.font = '22px sans-serif'; ctx.fillText('🏠', ax + 30, blob.y + 8);
      }
    }
  }
}
function stagePos(e) { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
stage.addEventListener('pointerdown', (e) => {
  const p = stagePos(e);
  if (blob && Math.hypot(p.x - blob.x, p.y - blob.y) < 44) { drag = true; stage.setPointerCapture(e.pointerId); return; }
  const v = clickValue();
  earn(v); G.clicks++;
  floats.push({ x: p.x, y: p.y - 14, t: '+' + fJ(v), life: 1, max: 1 });
  ripples.push({ x: p.x, y: p.y, life: 0.5 }); burst(p.x, p.y, 7); squash = 1;
  for (let i = 0; i < 3; i++) parts.push({ x: geom().hx, r: Math.floor(Math.random() * 8), leak: false, vy: 0, y: 0 });
});
stage.addEventListener('pointermove', (e) => { if (drag && blob) { const p = stagePos(e); blob.x = p.x; blob.y = p.y; } });
stage.addEventListener('pointerup', (e) => {
  if (!drag || !blob) return;
  drag = false;
  const { hx, cx } = geom();
  if (blob.x > cx) {
    const r = Math.max(50, 20 * incomeJ());
    earn(r); floats.push({ x: blob.x, y: blob.y, t: '+' + fJ(r) + ' 보너스!', life: 1.6, max: 1.6, big: true, c: '#2ec27e' });
    burst(blob.x, blob.y, 30, '#8fd3ff'); burst(blob.x, blob.y, 20); shake();
    log(`🔥→❄️ 고온 덩어리 배달 성공 +${fJ(r)} (열은 고온에서 저온으로!)`);
    blob = null;
  } else if (blob.x < hx) {
    floats.push({ x: blob.x, y: blob.y, t: '집 쪽으로!', life: 1.2, max: 1.2, c: '#ff4d6d' });
  }
});
function spawnBlob() {
  if (blob) return;
  const { hx, h } = geom();
  blob = { x: hx * 0.95, y: h * (0.32 + Math.random() * 0.3), life: 12 };
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
  showModal(`<h2>📖 공식 도감 <span style="font-size:16px;color:var(--muted)">${G.unlocked.length} / ${FORMULAS.length}</span></h2>` + FORMULAS.map(f => has(f.id)
    ? `<div class="dex-item" data-dex="${f.id}" style="${cssVars(f)}"><div class="badge">${look(f)[0]}</div><div><div class="t">${look(f)[3]} · ${f.name.replace(/ \(.*\)/, '')}</div><div class="eq">${texI(mainTex(f))}</div></div></div>`
    : `<div class="dex-item locked"><div class="badge" style="background:#ddd">🔒</div><div><div class="t">???</div><div class="eq">🔥 ${fJ(f.cost)}</div></div></div>`).join(''));
  $$('[data-dex]').forEach(d => d.onclick = () => infoModal(FMAP[d.dataset.dex]));
};

function showHelp() {
  showModal(`<h2>🔥 열공장 타이쿤</h2>
    <div class="steps">
      <div><span>👆</span>화면을 탭하면 열(🔥 J)을 벌어요</div>
      <div><span>⬆️</span>공식 카드의 버튼으로 출력을 올려요</div>
      <div><span>🔓</span>돈을 모아 새 공식을 해금해요</div>
      <div><span>🔥</span>불덩이가 나오면 집 쪽으로 끌어다 놓아요</div>
      <div><span>💡</span>퀴즈와 미니게임은 큰 보상!</div>
    </div>
    <p style="font-size:13px">카드의 <b>?</b> 를 누르면 공식 설명이 나와요. 진행은 자동 저장돼요.</p>
    <button class="big-ok" id="okBtn">시작하기</button>
    <button class="reset" id="resetBtn">처음부터 다시 하기</button>`);
  $('#okBtn').onclick = hideModal;
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
