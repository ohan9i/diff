/* ===========================================================
   Part 2 — 수분 전달
   =========================================================== */
'use strict';
function logR(v) { return Math.pow(10, -3 + v / 100 * 3); } // 0.001 ~ 1 mm

/** 로그 가로 막대 그래프 */
function hbars(canvas, items, opts = {}) {
  const { ctx, w, h } = fitCanvas(canvas, opts.height || 200);
  ctx.clearRect(0, 0, w, h);
  const l = opts.left || 120, r = w - 80, top = 6, rowH = (h - (opts.log ? 26 : 8)) / items.length;
  const max = Math.max(...items.map(i => i.v)) * 1.05;
  const lo = opts.log ? Math.log10(opts.min) : 0, hi = opts.log ? Math.log10(max) : max;
  const X = (v) => l + (opts.log ? (Math.log10(Math.max(v, opts.min)) - lo) / (hi - lo) : v / hi) * (r - l);
  items.forEach((it, i) => {
    const y = top + i * rowH;
    ctx.fillStyle = it.color; roundRect(ctx, l, y + 4, Math.max(2, X(it.v) - l), rowH - 8, 4); ctx.fill();
    ctx.fillStyle = '#1d2433'; ctx.font = (it.bold ? '700 ' : '') + '12px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(it.label, l - 8, y + rowH / 2 + 4);
    ctx.textAlign = 'left'; ctx.fillText(it.text, X(it.v) + 6, y + rowH / 2 + 4);
  });
}

/* ===========================================================
   M1. 상변화 · 잠열
   =========================================================== */
PAGES['m-phase'] = {
  playing: false,
  init() {
    const root = $('#m-phase');
    bindControls(root, () => this.update());
    $('#phPlay').onclick = () => { this.playing = !this.playing; if (V('phQ') >= 3103) setV('phQ', 0); $('#phPlay').textContent = this.playing ? '⏸ 멈춤' : '▶ 자동 가열'; };
    $('#phReset').onclick = () => { setV('phQ', 0); this.update(); };
    this.plot = new Plot($('#phCanvas'), 320);
    this.mols = Array.from({ length: 64 }, (_, i) => ({ i, x: Math.random(), y: Math.random(), vx: Math.random() - .5, vy: Math.random() - .5 }));
    hbars($('#phCap'), [
      { label: '물', v: 4200, text: '4200 kJ/(m³K)', color: '#2e86de', bold: true },
      { label: '콘크리트', v: 2070, text: '≈2070', color: '#a9adb3' },
      { label: '벽돌', v: 1510, text: '≈1510', color: '#c4703f' },
      { label: '목재', v: 800, text: '≈800', color: '#c9a26b' },
      { label: '공기', v: 1.2, text: '1.2 kJ/(m³K)', color: '#b0d4f1', bold: true },
    ], { log: true, min: 0.5, height: 180, left: 80 });
    this.update();
  },
  state(Q) {
    if (Q < 42) return { T: -20 + Q / 2.1, ph: '얼음 (고체)', liq: 0, gas: 0, seg: 0 };
    if (Q < 376) return { T: 0, ph: '융해 중 (얼음+물)', liq: (Q - 42) / 334, gas: 0, seg: 1 };
    if (Q < 796) return { T: (Q - 376) / 4.2, ph: '물 (액체)', liq: 1, gas: 0, seg: 2 };
    if (Q < 3061) return { T: 100, ph: '기화 중 (물+수증기)', liq: 1, gas: (Q - 796) / 2265, seg: 3 };
    return { T: 100 + (Q - 3061) / 2.1, ph: '수증기 (기체)', liq: 1, gas: 1, seg: 4 };
  },
  update() {
    const Q = V('phQ'), s = this.state(Q);
    const curve = [[0, -20], [42, 0], [376, 0], [796, 100], [3061, 100], [3103, 120]];
    this.plot.draw({
      x: [0, 3103], y: [-30, 130], xlabel: '가한 열량 Q [kJ/kg]', ylabel: '온도 [°C]',
      bands: [{ x0: 42, x1: 376, color: 'rgba(46,134,222,.10)', label: '융해 잠열 334' }, { x0: 796, x1: 3061, color: 'rgba(228,87,46,.08)', label: '기화(증발) 잠열 2265' }],
      series: [{ pts: curve, color: '#2e86de', width: 3 }],
      points: [{ x: Q, y: s.T, color: '#e4572e', r: 7, label: `${fmt(s.T, 1)} °C`, align: Q > 2600 ? 'right' : 'left' }],
      texts: [{ x: 20, y: -24, text: '얼음', color: '#2e86de' }, { x: 560, y: 60, text: '물', color: '#2e86de' }, { x: 3070, y: 122, text: '증기', align: 'right', color: '#2e86de' }],
    });
    $('#phKpis').innerHTML = `
      <div class="kpi"><div class="k">상태</div><div class="v" style="font-size:16px">${s.ph}</div></div>
      <div class="kpi hot"><div class="k">온도</div><div class="v">${fmt(s.T, 1)}<small>°C</small></div></div>
      <div class="kpi"><div class="k">${s.seg === 1 ? '녹은 비율' : s.seg === 3 ? '증발한 비율' : '현열/잠열'}</div><div class="v">${s.seg === 1 ? fmt(s.liq * 100, 0) + '<small>%</small>' : s.seg === 3 ? fmt(s.gas * 100, 0) + '<small>%</small>' : '<small>현열 (온도 상승)</small>'}</div></div>`;
  },
  tick(dt) {
    if (this.playing) {
      let Q = V('phQ') + dt * 220;
      if (Q >= 3103) { Q = 3103; this.playing = false; $('#phPlay').textContent = '▶ 자동 가열'; }
      setV('phQ', Q); this.update();
    }
    const s = this.state(V('phQ'));
    const { ctx, w, h } = fitCanvas($('#phMol'), 200);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#9aa3b5'; ctx.lineWidth = 2; ctx.strokeRect(w * 0.15, 10, w * 0.7, h - 20);
    const bx = w * 0.15 + 6, bw = w * 0.7 - 12, by = 16, bh = h - 32;
    const n = this.mols.length, nLiq = Math.round(s.liq * n), nGas = Math.round(s.gas * n);
    const energy = 0.2 + Math.max(0, s.T + 20) / 140;
    this.mols.forEach((m, k) => {
      // 인덱스 순서: 먼저 기체로, 그다음 액체로 바뀜
      const phase = k < nGas ? 2 : k < nLiq ? 1 : 0;
      let X, Y;
      if (phase === 0) {
        const cols = 8, gi = k % cols, gj = Math.floor(k / cols);
        const jit = 2 + energy * 3;
        X = bx + bw * 0.2 + gi * (bw * 0.6 / (cols - 1)) + (Math.random() - .5) * jit;
        Y = by + bh - 8 - gj * 15 + (Math.random() - .5) * jit;
        m.x = (X - bx) / bw; m.y = (Y - by) / bh;
      } else {
        const sp = phase === 2 ? 0.9 * energy : 0.25 * energy;
        m.x += m.vx * sp * dt * 2; m.y += m.vy * sp * dt * 2;
        const ymin = phase === 2 ? 0 : 0.5;
        if (m.x < 0 || m.x > 1) { m.vx *= -1; m.x = Math.max(0, Math.min(1, m.x)); }
        if (m.y < ymin || m.y > 1) { m.vy *= -1; m.y = Math.max(ymin, Math.min(1, m.y)); }
        X = bx + m.x * bw; Y = by + m.y * bh;
      }
      ctx.fillStyle = phase === 0 ? '#9fd3ff' : phase === 1 ? '#2e86de' : 'rgba(150,160,175,.85)';
      ctx.beginPath(); ctx.arc(X, Y, 5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#5d6679'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('분자 모형: 연한 파랑=얼음(격자), 파랑=물, 회색=수증기', w / 2, h - 2);
  },
};

/* ===========================================================
   M2. 포화수증기압 · 상대습도 · 이슬점
   =========================================================== */
PAGES['m-rh'] = {
  anim: null, drops: 0,
  init() {
    const root = $('#m-rh');
    bindControls(root, (el) => { this.anim = null; this.drops = 0; this.fromSliders(); this.update(); });
    $('#rhCool').onclick = () => { this.fromSliders(); this.drops = 0; this.anim = 'cool'; };
    $('#rhHum').onclick = () => { this.fromSliders(); this.drops = 0; this.anim = 'hum'; };
    $('#rhStop').onclick = () => { this.anim = null; };
    this.plot = new Plot($('#rhCanvas'), 340);
    this.fromSliders(); this.update();
  },
  fromSliders() { this.T = V('rhT'); this.p = V('rhRH') / 100 * PHYS.psat(this.T); },
  update() {
    const T = this.T, p = this.p, ps = PHYS.psat(T), rh = p / ps, Td = PHYS.dewPoint(p);
    const sat = [], rc = [20, 40, 60, 80].map(() => []);
    for (let t = -15; t <= 45; t += 0.5) { sat.push([t, PHYS.psat(t)]); rc.forEach((a, i) => a.push([t, PHYS.psat(t) * (i + 1) * 0.2])); }
    this.plot.draw({
      x: [-15, 45], y: [0, 10000], xlabel: '온도 T [°C]', ylabel: '수증기압 [Pa]',
      series: [...rc.map(a => ({ pts: a, color: '#8fb8e8', width: 1, dash: [4, 4] })), { pts: sat, color: '#2e86de', width: 3 }],
      points: [
        { x: Td, y: p, color: '#2e86de', label: `이슬점 ${fmt(Td, 1)}°C`, align: 'right' },
        { x: T, y: ps, color: '#9aa3b5', r: 4 },
        { x: T, y: p, color: '#e4572e', r: 7, label: `현재 φ=${fmt(rh * 100, 0)}%` },
      ],
      texts: [{ x: 44, y: PHYS.psat(44) * 0.8 + 300, text: '80%', align: 'right', color: '#8fb8e8' }, { x: 44, y: PHYS.psat(44) * 0.4, text: '40%', align: 'right', color: '#8fb8e8' },
        { x: 30, y: 9400, text: '포화선 위쪽 = 불가능(바로 응축)', color: '#2e86de' }],
      after: (ctx, pl) => {
        if (T - Td > 0.3) arrow(ctx, pl.sx(T), pl.sy(p), pl.sx(Td) + 6, pl.sy(p), '#1d2433', 2);
        if (ps - p > 80) { ctx.setLineDash([5, 4]); arrow(ctx, pl.sx(T), pl.sy(p), pl.sx(T), pl.sy(ps) + 6, '#1d2433', 1.5); ctx.setLineDash([]); }
      },
    });
    $('#rhKpis').innerHTML = `
      <div class="kpi"><div class="k">포화수증기압 p<sub>sat</sub> (컵 크기)</div><div class="v">${fmt(ps, 0)}<small>Pa</small></div></div>
      <div class="kpi"><div class="k">수증기압 p (물의 양)</div><div class="v">${fmt(p, 0)}<small>Pa</small></div></div>
      <div class="kpi ${rh >= 0.999 ? 'bad' : ''}"><div class="k">상대습도 φ</div><div class="v">${fmt(rh * 100, 1)}<small>%</small></div></div>
      <div class="kpi cold"><div class="k">이슬점온도 T<sub>d</sub></div><div class="v">${fmt(Td, 1)}<small>°C</small></div></div>
      <div class="kpi"><div class="k">절대습도 x</div><div class="v">${fmt(PHYS.xFromP(p), 2)}<small>g/kg(DA)</small></div></div>
      <div class="kpi"><div class="k">수증기 농도 v</div><div class="v">${fmt(PHYS.vapConc(p, T) * 1000, 2)}<small>g/m³</small></div></div>`;
  },
  tick(dt) {
    if (this.anim === 'cool') {
      this.T -= 4 * dt;
      if (this.T < -15) { this.T = -15; this.anim = null; }
      const ps = PHYS.psat(this.T);
      if (this.p > ps) { this.drops += (this.p - ps); this.p = ps; }
      setV('rhT', +this.T.toFixed(1)); setV('rhRH', Math.round(this.p / ps * 100));
      this.update();
    } else if (this.anim === 'hum') {
      const ps = PHYS.psat(this.T);
      this.p += ps * 0.15 * dt;
      if (this.p > ps) { this.drops += this.p - ps; this.p = ps; if (this.drops > ps * 0.3) this.anim = null; }
      setV('rhRH', Math.round(this.p / ps * 100));
      this.update();
    }
    // 컵 그림
    const { ctx, w, h } = fitCanvas($('#rhCup'), 240);
    ctx.clearRect(0, 0, w, h);
    const scale = (h - 50) / PHYS.psat(45);
    const ps = PHYS.psat(this.T);
    const cw = 110, cx = w / 2 - cw / 2, base = h - 20;
    const ch = ps * scale, lh = Math.min(this.p, ps) * scale;
    // 물
    ctx.fillStyle = 'rgba(46,134,222,.55)'; ctx.fillRect(cx, base - lh, cw, lh);
    // 컵
    ctx.strokeStyle = '#1d2433'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, base - ch); ctx.lineTo(cx, base); ctx.lineTo(cx + cw, base); ctx.lineTo(cx + cw, base - ch); ctx.stroke();
    ctx.fillStyle = '#1d2433'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`컵 크기 = p_sat(${fmt(this.T, 1)}°C) = ${fmt(ps, 0)} Pa`, cx + cw + 12, base - ch + 4);
    ctx.fillStyle = '#2e86de'; ctx.fillText(`물 = p = ${fmt(this.p, 0)} Pa`, cx + cw + 12, base - lh + 18);
    // 넘친 물방울
    if (this.drops > 1) {
      const nd = Math.min(30, Math.round(this.drops / 40));
      ctx.fillStyle = '#2e86de';
      for (let i = 0; i < nd; i++) { const X = cx - 30 - (i % 5) * 12, Y = base - 6 - Math.floor(i / 5) * 12; ctx.beginPath(); ctx.arc(X, Y, 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.font = '600 12px sans-serif'; ctx.textAlign = 'right'; ctx.fillText('넘침 = 결로', cx - 20, base - 6 - Math.ceil(nd / 5) * 12 - 6);
    }
    ctx.fillStyle = '#5d6679'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`φ = 물 ÷ 컵 = ${fmt(this.p / ps * 100, 0)}%`, 10, 18);
  },
};

/* ===========================================================
   M3. 습공기선도
   =========================================================== */
PAGES['m-psy'] = {
  init() {
    const root = $('#m-psy');
    bindControls(root, () => this.update());
    this.plot = new Plot($('#psCanvas'), 460);
    this.plot.pad.r = 40;
    $$('#m-psy button[data-ex]').forEach(b => b.onclick = () => {
      const ex = { 1: [25, 70, 10, 50], 2: [20, 70, 10, 50], 3: [0, 80, 22, 50] }[b.dataset.ex];
      setV('psT1', ex[0]); setV('psRH1', ex[1]); setV('psT2', ex[2]); setV('psM', ex[3]); this.update();
    });
    const cv = $('#psCanvas'); let drag = false;
    const pick = (e) => {
      const r = cv.getBoundingClientRect();
      const T = this.plot.ix(e.clientX - r.left), x = this.plot.iy(e.clientY - r.top);
      if (T < -10 || T > 45) return;
      const rh = Math.max(5, Math.min(100, PHYS.pFromX(Math.max(0.1, x)) / PHYS.psat(T) * 100));
      setV('psT1', Math.round(T * 2) / 2); setV('psRH1', Math.round(rh)); this.update();
    };
    cv.addEventListener('pointerdown', (e) => { drag = true; cv.setPointerCapture(e.pointerId); pick(e); });
    cv.addEventListener('pointermove', (e) => drag && pick(e));
    cv.addEventListener('pointerup', () => drag = false);
    cv.style.cursor = 'crosshair'; cv.style.touchAction = 'none';
    this.update();
  },
  xs(T) { return PHYS.xFromP(PHYS.psat(T)); },
  update() {
    const T1 = V('psT1'), RH1 = V('psRH1') / 100, T2 = V('psT2'), ma = V('psM');
    const p1 = RH1 * PHYS.psat(T1), x1 = PHYS.xFromP(p1), Td = PHYS.dewPoint(p1);
    let x2, path;
    if (T2 < Td) {
      x2 = this.xs(T2);
      path = [[T1, x1], [Td, x1]];
      for (let t = Td; t >= T2; t -= 0.25) path.push([t, this.xs(t)]);
      path.push([T2, x2]);
    } else { x2 = x1; path = [[T1, x1], [T2, x1]]; }
    const RH2 = PHYS.pFromX(x2) / PHYS.psat(T2);
    const md = ma / (1 + x1 / 1000), mw = x1 / 1000 * md, dmw = (x1 - x2) / 1000 * md;
    const h1 = PHYS.enthalpy(T1, x1), h2 = PHYS.enthalpy(T2, x2);
    // 곡선
    const series = [];
    for (let r = 1; r <= 10; r++) {
      const pts = [];
      for (let t = -10; t <= 45; t += 0.25) { const x = PHYS.xFromP(PHYS.psat(t) * r / 10); if (x > 31) break; pts.push([t, x]); }
      series.push({ pts, color: '#2e86de', width: r === 10 ? 3 : 1, dash: r === 10 ? [] : [] , });
    }
    const hl = [], texts = [];
    for (let H = 0; H <= 120; H += 10) {
      const pts = [];
      for (let t = -10; t <= 45; t += 0.5) { const x = (H - 1.006 * t) / (2501 + 1.86 * t) * 1000; if (x >= 0 && x <= this.xs(t) + 0.01 && x <= 30) pts.push([t, x]); }
      if (pts.length > 1) { hl.push({ pts, color: '#c3c9d6', width: 1, dash: [4, 4] }); texts.push({ x: pts[0][0], y: pts[0][1], text: `${H}`, color: '#9aa3b5', dx: -4, dy: -6, align: 'right' }); }
    }
    [20, 40, 60, 80].forEach(r => {
      const t = 38; const x = PHYS.xFromP(PHYS.psat(t) * r / 100);
      if (x < 29) texts.push({ x: t, y: x, text: `${r}%`, color: '#2e86de', dy: -7, bold: true });
    });
    texts.push({ x: 25, y: 29, text: 'φ=100% (포화선)', color: '#2e86de', bold: true, align: 'right' });
    series.push({ pts: path, color: '#e4572e', width: 3.5 });
    this.plot.draw({
      x: [-10, 45], y: [0, 30], xlabel: '건구온도 T [°C]', ylabel: '절대습도 x [g/kg(DA)]',
      series: [...hl, ...series], texts,
      points: [
        { x: T1, y: x1, color: '#e4572e', r: 8, label: `① ${T1}°C, ${Math.round(RH1 * 100)}%`, align: T1 > 30 ? 'right' : 'left' },
        ...(T2 < Td ? [{ x: Td, y: x1, color: '#2e86de', r: 5, label: `이슬점 ${fmt(Td, 1)}°C`, align: 'right' }] : []),
        { x: T2, y: x2, color: '#1d2433', r: 8, label: `② ${T2}°C, ${fmt(RH2 * 100, 0)}%`, align: 'right' },
      ],
    });
    const cool = T2 < T1;
    $('#psKpis').innerHTML = `
      <div class="kpi"><div class="k">x₁ → x₂</div><div class="v">${fmt(x1, 2)} → ${fmt(x2, 2)}<small>g/kg</small></div></div>
      <div class="kpi"><div class="k">최종 상대습도 φ₂</div><div class="v">${fmt(RH2 * 100, 0)}<small>%</small></div></div>
      <div class="kpi ${dmw > 0 ? 'cold' : ''}"><div class="k">빠져나온 물 Δm<sub>w</sub></div><div class="v">${fmt(dmw, 3)}<small>kg</small></div></div>
      <div class="kpi"><div class="k">${cool ? '제거' : '공급'}할 열량 m<sub>d</sub>|Δh|</div><div class="v">${fmt(Math.abs(md * (h1 - h2)), 0)}<small>kJ</small></div></div>`;
    const latent = dmw * 2501;
    $('#psSteps').innerHTML = `
      <b>계산 과정</b><br>
      ① T₁=${T1}°C, φ₁=${Math.round(RH1 * 100)}% → p₁ = φ·p<sub>sat</sub> = ${fmt(p1, 0)} Pa → x₁ = 622·p/(P−p) = <b>${fmt(x1, 2)} g/kg</b><br>
      ② m<sub>a</sub> = m<sub>d</sub>(1+x₁) → m<sub>d</sub> = ${ma}/(1+${fmt(x1 / 1000, 4)}) = <b>${fmt(md, 1)} kg</b>, m<sub>w</sub> = x₁m<sub>d</sub> = ${fmt(mw, 2)} kg<br>
      ③ ${T2 < Td ? `T₂=${T2}°C 는 이슬점 ${fmt(Td, 1)}°C 보다 낮음 → 포화선을 따라 이동, φ₂=100%, x₂ = <b>${fmt(x2, 2)} g/kg</b>` : `T₂=${T2}°C 가 이슬점 ${fmt(Td, 1)}°C 보다 높음 → x 일정(수평 이동), 결로 없음. 대신 상대습도가 ${fmt(RH2 * 100, 0)}% 로 ${RH2 < RH1 ? '낮아짐 (겨울 난방 시 건조해지는 이유)' : '높아짐'}`}<br>
      ④ Δm<sub>w</sub> = (x₁ − x₂)·m<sub>d</sub> = <b>${fmt(dmw, 3)} kg</b> ${dmw > 0 ? `(1 kg 건공기당 ${fmt(x1 - x2, 2)} g)` : ''}<br>
      ${dmw > 0 ? `⑤ 에너지: 전체 ${fmt(md * (h1 - h2), 0)} kJ 중 잠열(응축) ≈ ${fmt(latent, 0)} kJ (${fmt(latent / (md * (h1 - h2)) * 100, 0)}%). 에어컨은 온도만 낮추는 게 아니라 물도 빼냅니다 — 제습 모드는 같은 원리에 팬을 약하게 돌리는 것.` : ''}`;
  },
};

/* ===========================================================
   M4. 증발
   =========================================================== */
PAGES['m-evap'] = {
  parts: [],
  init() {
    const root = $('#m-evap');
    bindControls(root, () => this.update());
    this.update();
  },
  rate(A, Tw, Ta, RH, v) {
    const vs = PHYS.vapConc(PHYS.psat(Tw), Tw), va = PHYS.vapConc(RH * PHYS.psat(Ta), Ta);
    const hm = (4 + 4 * v) / (1.2 * 1006);
    const g = hm * (vs - va);
    return { g, G: g * A, vs, va, hm };
  },
  update() {
    const A = V('evA'), Tw = V('evTw'), Ta = V('evTa'), RH = V('evRH') / 100, v = V('evV');
    const r = this.rate(A, Tw, Ta, RH, v);
    this.cur = r;
    const gh = r.G * 3600 * 1000;
    $('#evKpis').innerHTML = `
      <div class="kpi ${r.G < 0 ? 'cold' : ''}"><div class="k">${r.G >= 0 ? '증발량' : '응축량'}</div><div class="v">${fmt(Math.abs(gh), 0)}<small>g/h</small></div></div>
      <div class="kpi"><div class="k">하루 기준</div><div class="v">${fmt(Math.abs(gh) * 24 / 1000, 2)}<small>L/day</small></div></div>
      <div class="kpi cold"><div class="k">빼앗는 잠열 (냉각 효과)</div><div class="v">${fmt(r.G * 2.45e6, 0)}<small>W</small></div></div>
      <div class="kpi"><div class="k">농도차 v<sub>sat</sub>(T<sub>w</sub>) − v<sub>air</sub></div><div class="v">${fmt((r.vs - r.va) * 1000, 2)}<small>g/m³</small></div></div>`;
    const base = Math.max(r.G, 1e-12);
    const items = [
      ['현재', r.G], ['면적 2배', this.rate(A * 2, Tw, Ta, RH, v).G], ['물 온도 +10°C', this.rate(A, Tw + 10, Ta, RH, v).G],
      ['습도 절반', this.rate(A, Tw, Ta, RH / 2, v).G], ['풍속 2배 (+1 m/s)', this.rate(A, Tw, Ta, RH, Math.max(v * 2, v + 1)).G],
    ].map(([l, g], i) => ({ label: l, v: Math.max(0, g), text: r.G > 0 ? `× ${fmt(g / base, 2)}` : '–', color: i ? '#8fb8e8' : '#2e86de', bold: !i }));
    hbars($('#evBar'), items, { height: 190, left: 120 });
  },
  tick(dt) {
    const r = this.cur; if (!r) return;
    const { ctx, w, h } = fitCanvas($('#evCanvas'), 230);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f2f7fd'; ctx.fillRect(0, 0, w, h);
    const A = V('evA'), v = V('evV');
    const pw = Math.min(w * 0.85, 80 + Math.sqrt(A) * 160), cx = w / 2, cy = h - 34;
    ctx.fillStyle = tempColor(V('evTw'), 0, 60, 0.9);
    ctx.beginPath(); ctx.ellipse(cx, cy, pw / 2, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e86de'; ctx.lineWidth = 2; ctx.stroke();
    const rate = r.G * 3600 * 1000; // g/h
    const spawn = Math.min(80, Math.abs(rate) / 15) * dt;
    if (Math.random() < spawn % 1) this.parts.push(this.newP(cx, cy, pw, r.G));
    for (let i = 0; i < Math.floor(spawn); i++) this.parts.push(this.newP(cx, cy, pw, r.G));
    this.parts = this.parts.filter(p => p.life > 0);
    ctx.fillStyle = 'rgba(120,140,170,.7)';
    this.parts.forEach(p => {
      p.y += p.vy * dt; p.x += (v * 25 + (Math.random() - .5) * 30) * dt; p.life -= dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life)); ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (v > 0) for (let i = 0; i < 3; i++) arrow(ctx, 14, 40 + i * 40, 14 + 20 + v * 8, 40 + i * 40, '#9aa3b5', 2);
    ctx.fillStyle = '#1d2433'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(`공기 ${V('evTa')}°C, ${V('evRH')}%`, w - 10, 18);
    ctx.textAlign = 'center'; ctx.fillText(`물 ${V('evTw')}°C, ${A} m²`, cx, h - 6);
  },
  newP(cx, cy, pw, G) {
    const up = G >= 0;
    return { x: cx + (Math.random() - .5) * pw * 0.9, y: up ? cy - 10 : 10, vy: up ? -40 - Math.random() * 40 : 60 + Math.random() * 30, life: up ? 3 : (cy - 20) / 75 };
  },
};

/* ===========================================================
   M5. 흡습 · 모세관
   =========================================================== */
PAGES['m-sorp'] = {
  init() {
    const root = $('#m-sorp');
    this.phi = 0.1; this.s = 1; this.u = this.ua(0.1); this.trail = [[0.1, this.u]]; this.cycle = null;
    bindControls(root, (el) => {
      if (el.id === 'soMat') { this.s = +el.value; this.u = this.ua(this.phi); this.trail = [[this.phi, this.u]]; }
      if (el.id === 'soRH') this.moveTo(V('soRH') / 100);
      if (el.id === 'caTh' || el.id === 'caR') this.cap();
      this.drawSorp();
    });
    $('#soCycle').onclick = () => { this.cycle = this.cycle ? null : { t: 0 }; $('#soCycle').textContent = this.cycle ? '⏸ 멈춤' : '▶ 젖음→건조 사이클 자동'; };
    this.plot = new Plot($('#soCanvas'), 260);
    this.drawSorp(); this.cap();
  },
  ua(p) { return this.s * 0.01 * Math.pow(p / (1 - 0.9 * p), 0.8); },
  ud(p) { return this.ua(p) + this.s * 0.007 * Math.pow(Math.sin(Math.PI * Math.min(p, 0.999)), 1.2); },
  moveTo(target) {
    const n = Math.max(1, Math.round(Math.abs(target - this.phi) * 200));
    const st = (target - this.phi) / n;
    for (let i = 0; i < n; i++) {
      this.phi += st;
      if (st > 0) this.u = Math.max(this.u, this.ua(this.phi));
      else this.u = Math.min(this.u, this.ud(this.phi));
      this.u = Math.min(Math.max(this.u, this.ua(this.phi)), this.ud(this.phi));
      this.trail.push([this.phi, this.u]);
    }
    if (this.trail.length > 1500) this.trail.splice(0, this.trail.length - 1500);
  },
  tick(dt) {
    if (!this.cycle) return;
    this.cycle.t += dt;
    const ph = (this.cycle.t % 10) / 10; // 0~1
    const target = 0.1 + 0.87 * (ph < 0.5 ? ph * 2 : 2 - ph * 2);
    this.moveTo(target); setV('soRH', Math.round(target * 100)); this.drawSorp();
  },
  drawSorp() {
    const a = [], d = [];
    for (let p = 0; p <= 0.985; p += 0.005) { a.push([p * 100, this.ua(p)]); d.push([p * 100, this.ud(p)]); }
    const ymax = this.ud(0.985) * 1.1;
    const region = this.phi < 0.2 ? 'A' : this.phi < 0.6 ? 'B' : this.phi < 0.97 ? 'C' : 'D';
    this.plot.draw({
      x: [0, 100], y: [0, ymax], xlabel: '상대습도 φ [%]', ylabel: '함수비 u = m_w/m_d', yfmt: v => v.toFixed(3),
      bands: [{ x0: 0, x1: 20, color: 'rgba(46,134,222,.04)', label: 'A' }, { x0: 20, x1: 60, color: 'rgba(46,134,222,.08)', label: 'B' }, { x0: 60, x1: 97, color: 'rgba(46,134,222,.13)', label: 'C' }, { x0: 97, x1: 100, color: 'rgba(46,134,222,.25)', label: 'D' }],
      series: [
        { pts: a, color: '#2e86de', width: 2 }, { pts: d, color: '#e4572e', width: 2 },
        { pts: this.trail.map(([p, u]) => [p * 100, u]), color: '#1d2433', width: 2.5 },
      ],
      texts: [{ x: 45, y: this.ua(0.45), text: '흡착 (젖음)', color: '#2e86de', dy: 14, bold: true }, { x: 45, y: this.ud(0.45), text: '탈착 (건조)', color: '#e4572e', dy: -12, bold: true }],
      points: [{ x: this.phi * 100, y: this.u, color: '#1d2433', r: 6 }],
    });
    const desc = {
      A: '[A] φ < 20%: 물 분자가 기공 벽에 한 겹(단분자층)으로 흡착',
      B: '[B] 20–60%: 여러 겹(다분자층)으로 흡착',
      C: '[C] 60–97%: 젖은 층들이 서로 연결되기 시작 (모세관 응축)',
      D: '[D] φ > 97%: 기공이 물로 채워지고 모세관 흡인 발생',
    }[region];
    $('#soNote').innerHTML = `<b>${desc}</b><br>같은 상대습도라도 마르는 중(빨강)일 때 함수비가 더 높습니다 = 이력(히스테리시스). 실내의 흡습성 재료는 급격한 습도 변동을 완화해 줍니다.`;
    // 기공 그림
    const { ctx, w, h } = fitCanvas($('#soPore'), 120);
    ctx.clearRect(0, 0, w, h);
    const gap = 60, yc = h / 2, y0 = yc - gap / 2, y1 = yc + gap / 2;
    ctx.fillStyle = '#b5b9bf'; ctx.fillRect(0, 0, w, y0); ctx.fillRect(0, y1, w, h - y1);
    const frac = Math.min(1, this.u / this.ud(0.97));
    const layers = this.phi < 0.2 ? 1 : this.phi < 0.6 ? 1 + Math.round((this.phi - 0.2) / 0.4 * 3) : 4;
    ctx.fillStyle = '#2e86de';
    if (this.phi >= 0.97) { ctx.globalAlpha = .6; ctx.fillRect(0, y0, w, gap); ctx.globalAlpha = 1; }
    else {
      const density = this.phi < 0.2 ? this.phi / 0.2 * 0.6 + 0.1 : 1;
      for (let L = 0; L < layers; L++) for (let x = 6; x < w; x += 9) {
        if (((x * 7 + L * 13) % 10) / 10 > density) continue;
        ctx.beginPath(); ctx.arc(x, y0 + 4 + L * 7, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 4, y1 - 4 - L * 7, 3, 0, Math.PI * 2); ctx.fill();
      }
      if (this.phi >= 0.6) { // 연결된 브리지
        ctx.globalAlpha = .55;
        const nb = Math.round((this.phi - 0.6) / 0.37 * 5) + 1;
        for (let b = 0; b < nb; b++) { const x = w * (b + 0.5) / nb; ctx.fillRect(x - 10 - frac * 10, y0, 20 + frac * 20, gap); }
        ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = '#1d2433'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`기공 단면 (영역 ${region})`, 6, 14);
  },
  cap() {
    const th = V('caTh') * Math.PI / 180, r = logR(V('caR')) / 1000;
    const hgt = 2 * 0.072 * Math.cos(th) / (1000 * 9.81 * r);
    const { ctx, w, h } = fitCanvas($('#caCanvas'), 280);
    ctx.clearRect(0, 0, w, h);
    const lvl = h * 0.62;
    ctx.fillStyle = 'rgba(46,134,222,.35)'; ctx.fillRect(0, lvl, w * 0.62, h - lvl);
    // 관 (표시용 폭)
    const tw = 10 + 40 * (V('caR') / 100), tx = w * 0.31 - tw / 2;
    const maxShow = lvl - 20;
    const scale = maxShow / Math.max(0.05, Math.abs(hgt)) > 1e4 ? 1e4 : maxShow / Math.max(Math.abs(hgt), 0.01);
    const disp = Math.max(-(h - lvl - 20), Math.min(maxShow, hgt * Math.min(scale, 300 / 0.05)));
    const top = lvl - disp;
    ctx.fillStyle = 'rgba(46,134,222,.6)'; ctx.fillRect(tx, Math.min(top, lvl), tw, h - Math.min(top, lvl));
    // 메니스커스
    ctx.fillStyle = '#fff';
    const curv = Math.cos(th) * tw / 2;
    ctx.beginPath(); ctx.moveTo(tx, top); ctx.quadraticCurveTo(tx + tw / 2, top + curv * 1.2, tx + tw, top);
    if (curv > 0) { ctx.lineTo(tx + tw, top - 1); ctx.lineTo(tx, top - 1); ctx.closePath(); ctx.fill(); }
    else { ctx.closePath(); ctx.fillStyle = 'rgba(46,134,222,.6)'; ctx.fill(); }
    ctx.strokeStyle = '#1d2433'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx, 20); ctx.lineTo(tx, h); ctx.moveTo(tx + tw, 20); ctx.lineTo(tx + tw, h); ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#5d6679'; ctx.beginPath(); ctx.moveTo(0, lvl); ctx.lineTo(w * 0.62, lvl); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#1d2433'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'left';
    const hs = Math.abs(hgt) >= 1 ? fmt(hgt, 2) + ' m' : fmt(hgt * 1000, 1) + ' mm';
    ctx.fillText(`h = ${hs}`, tx + tw + 8, (top + lvl) / 2);
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#5d6679'; ctx.fillText('(그림 높이는 축척 조정됨)', tx + tw + 8, (top + lvl) / 2 + 16);
    // 물방울 접촉각 그림
    const dx = w * 0.82, dy = h * 0.45, R = 34;
    ctx.fillStyle = '#8d99ae'; ctx.fillRect(w * 0.66, dy, w * 0.32, 10);
    const t = V('caTh') * Math.PI / 180;
    const rr = R / Math.max(0.25, Math.sin(Math.min(t, Math.PI - 0.01)) || 0.25);
    ctx.fillStyle = 'rgba(46,134,222,.75)';
    ctx.beginPath();
    // 원 중심 높이: 물방울 바닥 반폭 = R, 접촉각 t
    const rad = R / Math.sin(Math.max(0.05, Math.min(Math.PI - 0.05, t)));
    const cyc = dy + rad * Math.cos(t);
    const a0 = Math.PI * 1.5 - t, a1 = Math.PI * 1.5 + t;
    ctx.arc(dx, cyc, rad, a0, a1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1d2433'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(V('caTh') < 90 ? '친수성 (물을 끌어당김)' : V('caTh') > 90 ? '소수성 (물을 밀어냄)' : '중립', dx, dy + 30);
    ctx.fillText(`θ = ${V('caTh')}°`, dx, dy + 46);
    $('#caKpis').innerHTML = `
      <div class="kpi ${hgt > 0 ? 'cold' : ''}"><div class="k">모세관 상승 높이</div><div class="v">${hs}</div></div>
      <div class="kpi"><div class="k">기공 반지름</div><div class="v">${fmt(r * 1e6, r < 1e-5 ? 1 : 0)}<small>μm</small></div></div>`;
  },
};

/* ===========================================================
   M6. 수증기 확산 (Fick)
   =========================================================== */
PAGES['m-diff'] = {
  parts: [],
  init() {
    const root = $('#m-diff');
    bindControls(root, () => this.update());
    $('#dfEx').onclick = () => { [['dfA', 25], ['dfD', 20], ['dfMu', 50], ['dfTi', 21], ['dfRi', 65], ['dfTe', 4], ['dfRe', 80]].forEach(([k, v]) => setV(k, v)); $('#dfSurf').checked = true; this.update(); };
    this.update();
  },
  update() {
    const A = V('dfA'), d = V('dfD') / 100, mu = V('dfMu'), Ti = V('dfTi'), Te = V('dfTe'), Ri = V('dfRi') / 100, Re = V('dfRe') / 100;
    const pi = Ri * PHYS.psat(Ti), pe = Re * PHYS.psat(Te);
    const vi = PHYS.vapConc(pi, Ti), ve = PHYS.vapConc(pe, Te);
    const sds = V('dfSurf') ? 0.01 : 0;
    const sdt = sds + mu * d + sds;
    const g = PHYS.delta0 * (pi - pe) / sdt; // 실내→외부 +
    const qm = g * A;
    this.c = { pi, pe, vi, ve, g, qm, mu, sdt, sds, d };
    $('#dfKpis').innerHTML = `
      <div class="kpi"><div class="k">실내 p<sub>i</sub> / v<sub>i</sub></div><div class="v">${fmt(pi, 0)}<small>Pa / ${fmt(vi * 1000, 2)} g/m³</small></div></div>
      <div class="kpi"><div class="k">외기 p<sub>e</sub> / v<sub>e</sub></div><div class="v">${fmt(pe, 0)}<small>Pa / ${fmt(ve * 1000, 2)} g/m³</small></div></div>
      <div class="kpi"><div class="k">총 등가공기층 s<sub>d,t</sub></div><div class="v">${fmt(sdt, 2)}<small>m</small></div></div>
      <div class="kpi"><div class="k">유량 밀도 g</div><div class="v" style="font-size:16px">${fmtSci(Math.abs(g))}<small>kg/(m²s)</small></div></div>
      <div class="kpi cold"><div class="k">벽 전체 하루 이동량</div><div class="v">${fmt(Math.abs(qm) * 86400 * 1000, 1)}<small>g/day</small></div></div>
      <div class="kpi"><div class="k">방향</div><div class="v" style="font-size:16px">${g > 0 ? '실내 → 외부' : g < 0 ? '외부 → 실내' : '이동 없음'}</div></div>`;
    $('#dfSteps').innerHTML = `
      ① p<sub>i</sub> = ${fmt(Ri * 100, 0)}% × ${fmt(PHYS.psat(Ti), 0)} = ${fmt(pi, 0)} Pa, p<sub>e</sub> = ${fmt(Re * 100, 0)}% × ${fmt(PHYS.psat(Te), 0)} = ${fmt(pe, 0)} Pa<br>
      ② v<sub>i</sub> = p/(R<sub>v</sub>T) = ${fmt(vi * 1000, 2)} g/m³, v<sub>e</sub> = ${fmt(ve * 1000, 2)} g/m³ → ${vi > ve ? '실내에서 외부로' : '외부에서 실내로'} 이동<br>
      ③ s<sub>d,t</sub> = ${sds} + ${mu}×${d} + ${sds} = ${fmt(sdt, 2)} m<br>
      ④ q<sub>m</sub> = δ₀·A·Δp/s<sub>d,t</sub> = 2×10⁻¹⁰ × ${A} × ${fmt(pi - pe, 0)} / ${fmt(sdt, 2)} = ${fmtSci(qm)} kg/s = ${fmt(qm * 3.6e6, 2)} g/h = ${fmt(qm * 8.64e7, 1)} g/day`;
  },
  tick(dt) {
    const c = this.c; if (!c) return;
    const { ctx, w, h } = fitCanvas($('#dfCanvas'), 260);
    ctx.clearRect(0, 0, w, h);
    const wx0 = w * 0.38, wx1 = w * 0.62, top = 20, bot = h - 30;
    ctx.fillStyle = '#eef3fa'; ctx.fillRect(0, top, wx0, bot - top);
    ctx.fillStyle = '#f7f0e6'; ctx.fillRect(wx1, top, w - wx1, bot - top);
    ctx.fillStyle = '#d7dbe2'; ctx.fillRect(wx0, top, wx1 - wx0, bot - top);
    // 기공 표현 (μ 클수록 촘촘)
    ctx.fillStyle = '#b4bac6';
    const dens = Math.min(1, Math.log10(c.mu) / 3);
    for (let y = top + 4; y < bot; y += 10) for (let x = wx0 + 4; x < wx1; x += 10) if (((x * 31 + y * 17) % 100) / 100 < 0.3 + 0.6 * dens) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill(); }
    // 분자: 공기 영역 농도 비례
    const target = (v) => Math.round(v * 1000 * 5);
    if (!this.airL) { this.airL = []; this.airR = []; }
    const fit = (arr, n, x0, x1) => { while (arr.length < n) arr.push({ x: x0 + Math.random() * (x1 - x0), y: top + Math.random() * (bot - top) }); arr.length = Math.min(arr.length, n); };
    fit(this.airL, target(c.ve), 0, wx0); fit(this.airR, target(c.vi), wx1, w);
    ctx.fillStyle = '#2e86de';
    const jig = (p, x0, x1) => { p.x += (Math.random() - .5) * 60 * dt; p.y += (Math.random() - .5) * 60 * dt; p.x = Math.max(x0 + 2, Math.min(x1 - 2, p.x)); p.y = Math.max(top + 2, Math.min(bot - 2, p.y)); ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill(); };
    this.airL.forEach(p => jig(p, 0, wx0)); this.airR.forEach(p => jig(p, wx1, w));
    // 벽을 통과하는 분자
    const gday = Math.abs(c.g) * 86400 * 1000; // g/(m² day)
    const rate = Math.min(20, 2 * Math.log10(1 + gday * 100));
    if (Math.random() < rate * dt) this.parts.push({ x: c.g > 0 ? wx1 : wx0, y: top + Math.random() * (bot - top) });
    const sp = 40 / Math.sqrt(c.mu) * (c.g > 0 ? -1 : 1);
    this.parts = this.parts.filter(p => p.x >= wx0 - 1 && p.x <= wx1 + 1);
    ctx.fillStyle = '#0b5aa8';
    this.parts.forEach(p => { p.x += sp * dt + (Math.random() - .5) * 20 * dt; p.y += (Math.random() - .5) * 30 * dt; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
    // p 분포 선
    const pmax = Math.max(c.pi, c.pe) * 1.25, py = (p) => bot - p / pmax * (bot - top);
    const sdrop = c.sds / c.sdt * (c.pi - c.pe);
    ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(0, py(c.pe)); ctx.lineTo(wx0, py(c.pe + sdrop)); ctx.lineTo(wx1, py(c.pi - sdrop)); ctx.lineTo(w, py(c.pi)); ctx.stroke();
    ctx.fillStyle = '#e4572e'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`p_e = ${fmt(c.pe, 0)} Pa`, 8, py(c.pe) - 6); ctx.textAlign = 'right'; ctx.fillText(`p_i = ${fmt(c.pi, 0)} Pa`, w - 8, py(c.pi) - 6);
    ctx.fillStyle = '#1d2433'; ctx.textAlign = 'center'; ctx.font = '700 13px sans-serif';
    ctx.fillText('외부', wx0 / 2, h - 10); ctx.fillText('실내', (wx1 + w) / 2, h - 10);
    ctx.fillText(`벽 (μ=${c.mu}, d=${c.d * 100} cm)`, (wx0 + wx1) / 2, h - 10);
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#5d6679'; ctx.fillText('파란 점 개수 ∝ 수증기 농도 v', w / 2, 13);
  },
};

/* ===========================================================
   M7. Glaser 결로 판정
   =========================================================== */
const GL_PRESETS = {
  ex2:   { Ti: 20, Ri: 40, Te: -5, Re: 80, sd: true, L: [['facade', 20, 1.5, 50], ['mineral', 50, 0.039, 60], ['concrete1', 150, 1.0, 120], ['mortar', 20, 0.56, 25]] },
  bare:  { Ti: 20, Ri: 60, Te: -10, Re: 80, sd: false, L: [['mortar', 20, 0.56, 25], ['concrete', 200, 1.5, 120], ['mortar', 15, 0.56, 25]] },
  ext:   { Ti: 20, Ri: 60, Te: -10, Re: 80, sd: false, L: [['mortar', 10, 0.56, 25], ['xps', 100, 0.03, 150], ['concrete', 200, 1.5, 120], ['mortar', 15, 0.56, 25]] },
  int:   { Ti: 20, Ri: 60, Te: -10, Re: 80, sd: false, L: [['mortar', 20, 0.56, 25], ['concrete', 200, 1.5, 120], ['mineral', 100, 0.039, 1], ['gypsum', 12.5, 0.25, 8]] },
  intvb: { Ti: 20, Ri: 60, Te: -10, Re: 80, sd: false, L: [['mortar', 20, 0.56, 25], ['concrete', 200, 1.5, 120], ['mineral', 100, 0.039, 1], ['vb', 0.2, 0.4, 400000], ['gypsum', 12.5, 0.25, 8]] },
  soft:  { Ti: 20, Ri: 60, Te: -10, Re: 80, sd: false, L: [['mineral', 120, 0.039, 1], ['concrete', 200, 1.5, 120], ['mortar', 15, 0.56, 25]] },
};
PAGES['m-glaser'] = {
  layers: [], axis: 'sd',
  init() {
    const root = $('#m-glaser');
    this.table = LayerTable($('#glTable'), this.layers, { mu: true }, () => this.update());
    $('#glAdd').onclick = () => { this.layers.push({ mat: 'vb', d: 0.2, k: 0.4, mu: 400000 }); this.table.render(); this.update(); };
    $$('#glPresets button').forEach(b => b.onclick = () => this.preset(b.dataset.p));
    $('#glAxSd').onclick = () => { this.axis = 'sd'; $('#glAxSd').classList.add('on'); $('#glAxX').classList.remove('on'); this.update(); };
    $('#glAxX').onclick = () => { this.axis = 'x'; $('#glAxX').classList.add('on'); $('#glAxSd').classList.remove('on'); this.update(); };
    bindControls(root, () => this.update());
    this.plot = new Plot($('#glCanvas'), 360);
    this.tplot = new Plot($('#glTemp'), 260);
    this.preset('ex2');
  },
  preset(p) {
    const P = GL_PRESETS[p];
    this.layers.length = 0;
    P.L.forEach(([mat, d, k, mu]) => this.layers.push({ mat, d, k, mu }));
    setV('glTi', P.Ti); setV('glRi', P.Ri); setV('glTe', P.Te); setV('glRe', P.Re); $('#glSd').checked = P.sd;
    this.table.render(); this.update();
  },
  calc() {
    const Ti = V('glTi'), Te = V('glTe'), Ri = V('glRi') / 100, Re = V('glRe') / 100;
    const Rse = 0.04, Rsi = 0.13, sdS = V('glSd') ? 0.01 : 0;
    const Ls = this.layers.map(L => ({ ...L, R: L.d / 1000 / L.k, sd: L.mu * L.d / 1000, name: MATERIALS[L.mat].name }));
    const Rt = Rse + Ls.reduce((s, L) => s + L.R, 0) + Rsi;
    const q = (Ti - Te) / Rt; // 실내→외부
    // 경계면 온도 (외측부터)
    let T = Te + q * Rse; const Tse = T;
    const Tn = [T];
    Ls.forEach(L => { T += q * L.R; Tn.push(T); });
    const Tsi = T;
    // sd 좌표
    let s = sdS; const sn = [s];
    Ls.forEach(L => { s += L.sd; sn.push(s); });
    const sdt = s + sdS;
    // x 좌표 (mm)
    let x = 0; const xn = [0];
    Ls.forEach(L => { x += L.d; xn.push(x); });
    const pi = Ri * PHYS.psat(Ti), pe = Re * PHYS.psat(Te);
    // 포화곡선 샘플 (s, x, T)
    const samp = [];
    if (sdS > 0) samp.push({ s: 0, x: 0, T: Te, air: true });
    Ls.forEach((L, i) => {
      const n = 24;
      for (let k = 0; k <= n; k++) {
        if (i > 0 && k === 0) continue;
        const f = k / n;
        samp.push({ s: sn[i] + f * L.sd, x: xn[i] + f * L.d, T: Tn[i] + f * (Tn[i + 1] - Tn[i]), li: i });
      }
    });
    if (sdS > 0) samp.push({ s: sdt, x: xn[xn.length - 1], T: Ti, air: true });
    samp.forEach(p => p.ps = PHYS.psat(p.T));
    // 아래쪽 볼록 껍질 (팽팽한 줄)
    const pts = [{ s: 0, p: pe, end: true }];
    samp.forEach(p => { if (p.s > 1e-9 && p.s < sdt - 1e-9 && !p.air) pts.push({ s: p.s, p: p.ps, ref: p }); });
    pts.push({ s: sdt, p: pi, end: true });
    pts.sort((a, b) => a.s - b.s || a.p - b.p);
    const hull = [];
    for (const P of pts) {
      while (hull.length >= 2) {
        const A = hull[hull.length - 2], B = hull[hull.length - 1];
        const cross = (B.s - A.s) * (P.p - A.p) - (B.p - A.p) * (P.s - A.s);
        if (cross <= 0) hull.pop(); else break;
      }
      hull.push(P);
    }
    const cond = hull.filter(p => !p.end);
    const d0 = PHYS.delta0;
    let g, gin, gout, gc = 0;
    if (cond.length) {
      const f = cond[0], l = cond[cond.length - 1];
      gout = d0 * (f.p - pe) / f.s;
      gin = d0 * (pi - l.p) / (sdt - l.s);
      gc = gin - gout;
    } else { g = d0 * (pi - pe) / sdt; }
    // 위치 설명
    const where = (pt) => {
      const r = pt.ref;
      const i = sn.findIndex((v, k) => k > 0 && Math.abs(v - r.s) < 1e-9);
      if (i > 0 && i < Ls.length) return `${Ls[i - 1].name} | ${Ls[i].name} 경계면`;
      return `${Ls[r.li].name} 층 내부`;
    };
    // 동일 영역 연속점 묶기
    const zones = [];
    cond.forEach(c => { const wv = where(c); if (!zones.includes(wv)) zones.push(wv); });
    const rhsi = pi / PHYS.psat(Tsi);
    return { Ti, Te, Ri, Re, pi, pe, Ls, Tn, Tse, Tsi, sn, xn, sdt, sdS, samp, hull, cond, g, gin, gout, gc, zones, rhsi, q, Rt };
  },
  update() {
    const c = this.calc();
    this.c = c;
    const useSd = this.axis === 'sd';
    const X = (p) => useSd ? p.s : p.x;
    const xmax = useSd ? c.sdt : c.xn[c.xn.length - 1];
    // s→x 변환
    const s2x = (s) => {
      if (useSd) return s;
      if (s <= c.sn[0]) return 0;
      for (let i = 0; i < c.Ls.length; i++) if (s <= c.sn[i + 1] + 1e-12) return c.xn[i] + (s - c.sn[i]) / (c.sn[i + 1] - c.sn[i]) * (c.xn[i + 1] - c.xn[i]);
      return c.xn[c.xn.length - 1];
    };
    const bands = c.Ls.map((L, i) => ({ x0: useSd ? c.sn[i] : c.xn[i], x1: useSd ? c.sn[i + 1] : c.xn[i + 1], color: MATERIALS[L.mat].color + '55' }));
    const satPts = c.samp.map(p => [X(p), p.ps]);
    if (c.sdS === 0) { satPts.unshift([0, PHYS.psat(c.Tse)]); satPts.push([xmax, PHYS.psat(c.Tsi)]); }
    const straight = [[0, c.pe], [useSd ? c.sdt : xmax, c.pi]];
    let straightPts;
    if (useSd) straightPts = straight;
    else { straightPts = c.sn.map((s, i) => [c.xn[i], c.pe + (c.pi - c.pe) * s / c.sdt]); straightPts.unshift([0, c.pe]); straightPts.push([xmax, c.pi]); }
    const hullPts = [];
    for (let i = 0; i < c.hull.length - 1; i++) {
      const A = c.hull[i], B = c.hull[i + 1];
      // 구간 내 경계면도 지나가도록 세분화 (x축 모드에서 꺾임 표현)
      const ss = [A.s, ...c.sn.filter(s => s > A.s && s < B.s), B.s];
      ss.forEach(s => hullPts.push([s2x(s), A.p + (B.p - A.p) * (s - A.s) / (B.s - A.s)]));
    }
    const ymax = Math.max(...c.samp.map(p => p.ps), c.pi, PHYS.psat(c.Tsi)) * 1.12;
    this.plot.draw({
      x: [0, xmax], y: [0, ymax], xlabel: useSd ? '등가공기층두께 누적 s_d [m]  (왼쪽=외부, 오른쪽=실내)' : '두께 [mm]  (왼쪽=외부, 오른쪽=실내)', ylabel: '수증기압 [Pa]',
      bands,
      series: [
        { pts: satPts, color: '#c0392b', width: 3 },
        { pts: straightPts, color: '#2e86de', width: 2, dash: [6, 5] },
        ...(c.cond.length ? [{ pts: hullPts, color: '#2e86de', width: 3 }] : []),
      ],
      points: c.cond.length ? [c.cond[0], c.cond[c.cond.length - 1]].filter((v, i, a) => i === 0 || v !== a[0]).map(p => ({ x: s2x(p.s), y: p.p, color: '#2e86de', r: 7, label: '결로 발생', align: 'center' })) : [],
      texts: [{ x: 0, y: c.pe, text: `p_e ${fmt(c.pe, 0)}`, dx: 4, dy: -10, color: '#2e86de', bold: true }, { x: xmax, y: c.pi, text: `p_i ${fmt(c.pi, 0)}`, dx: -4, dy: -10, align: 'right', color: '#2e86de', bold: true }],
    });
    // 온도 그래프 (실제 두께)
    const Tpts = [[-20, c.Te], [0, c.Tse]];
    c.Tn.forEach((T, i) => Tpts.push([c.xn[i], T]));
    Tpts.push([c.xn[c.xn.length - 1] + 20, c.Ti]);
    // 이슬점 분포 (보정된 p 기준)
    const pAtS = (s) => { for (let i = 0; i < c.hull.length - 1; i++) { const A = c.hull[i], B = c.hull[i + 1]; if (s >= A.s - 1e-12 && s <= B.s + 1e-12) return A.p + (B.p - A.p) * (s - A.s) / ((B.s - A.s) || 1); } return c.pi; };
    const pLin = (s) => c.pe + (c.pi - c.pe) * s / c.sdt;
    const TdLin = c.samp.filter(p => !p.air).map(p => [p.x, PHYS.dewPoint(pLin(p.s))]);
    const xm = c.xn[c.xn.length - 1];
    this.tplot.draw({
      x: [-20, xm + 20], y: [Math.min(c.Te, ...TdLin.map(p => p[1])) - 3, c.Ti + 4], xlabel: '두께 [mm]', ylabel: '온도 [°C]',
      bands: c.Ls.map((L, i) => ({ x0: c.xn[i], x1: c.xn[i + 1], color: MATERIALS[L.mat].color + '55' })),
      series: [{ pts: Tpts, color: '#e4572e', width: 3 }, { pts: TdLin, color: '#2e86de', width: 2, dash: [6, 4] }],
      texts: [{ x: -18, y: c.Te, text: `${c.Te}°C`, dy: -10, color: '#e4572e' }, { x: xm + 18, y: c.Ti, text: `${c.Ti}°C`, dy: -10, align: 'right', color: '#e4572e' }],
      after: (ctx, pl) => {
        ctx.font = '11px sans-serif'; ctx.fillStyle = '#5d6679'; ctx.textAlign = 'left';
        ctx.fillText('빨강: 온도 T,  파란 점선: 보정 전 p 의 이슬점 → T < 이슬점 인 구간이 결로 위험', pl.pad.l + 6, pl.pad.t + 14);
      },
    });
    // KPI
    const perDay = (gv) => gv * 86400 * 1000;
    const surfCond = c.rhsi >= 1;
    $('#glKpis').innerHTML = c.cond.length ? `
      <div class="kpi bad"><div class="k">내부결로</div><div class="v" style="font-size:16px">발생 ⚠</div></div>
      <div class="kpi"><div class="k">유입 g<sub>in</sub> (실내→결로면)</div><div class="v">${fmt(perDay(c.gin), 2)}<small>g/(m²·day)</small></div></div>
      <div class="kpi"><div class="k">유출 g<sub>out</sub> (결로면→외부)</div><div class="v">${fmt(perDay(c.gout), 2)}<small>g/(m²·day)</small></div></div>
      <div class="kpi bad"><div class="k">결로량 g<sub>c</sub> = g<sub>in</sub> − g<sub>out</sub></div><div class="v">${fmt(perDay(c.gc), 2)}<small>g/(m²·day)</small></div></div>
      <div class="kpi ${c.rhsi >= 0.8 ? 'bad' : 'good'}"><div class="k">내표면 ${fmt(c.Tsi, 1)}°C 상대습도</div><div class="v">${fmt(c.rhsi * 100, 0)}<small>%</small></div></div>`
      : `
      <div class="kpi good"><div class="k">내부결로</div><div class="v" style="font-size:16px">없음 ✓</div></div>
      <div class="kpi"><div class="k">투습량 g</div><div class="v">${fmt(perDay(c.g), 2)}<small>g/(m²·day)</small></div></div>
      <div class="kpi"><div class="k">총 s<sub>d,t</sub></div><div class="v">${fmt(c.sdt, 2)}<small>m</small></div></div>
      <div class="kpi"><div class="k">U값</div><div class="v">${fmt(1 / c.Rt, 3)}<small>W/(m²K)</small></div></div>
      <div class="kpi ${c.rhsi >= 0.8 ? 'bad' : 'good'}"><div class="k">내표면 ${fmt(c.Tsi, 1)}°C 상대습도</div><div class="v">${fmt(c.rhsi * 100, 0)}<small>%</small></div></div>`;
    let msg = '';
    if (c.cond.length) msg += `<div class="callout warn"><b>결로 위치:</b> ${c.zones.join(', ')}. 겨울 동안 한 달(30일)에 약 <b>${fmt(perDay(c.gc) * 30, 0)} g/m²</b>의 물이 벽 속에 쌓입니다. 고치려면: 실내측에 방습층(μ 큰 층) 추가, 단열을 외측으로, 외측 층은 투습이 잘 되게(μ 작게). 실제 설계에서는 이 계산을 월별로 반복해, 겨울에 쌓인 물이 여름 동안 모두 증발하는지(연간 수분 수지)를 확인합니다 (강의 p.67).</div>`;
    else msg += `<div class="callout good">수증기압 직선이 모든 곳에서 포화수증기압 아래에 있습니다 (p &lt; p<sub>sat</sub> → φ &lt; 100%). 정상상태에서 g = ${fmt(perDay(c.g), 2)} g/(m²·day)가 모든 층을 그대로 통과합니다.</div>`;
    if (surfCond) msg += `<div class="callout warn">내표면 온도 ${fmt(c.Tsi, 1)}°C 가 실내 이슬점 ${fmt(PHYS.dewPoint(c.pi), 1)}°C 보다 낮아 <b>표면결로</b>가 생깁니다.</div>`;
    else if (c.rhsi >= 0.8) msg += `<div class="callout warn">내표면 상대습도 ${fmt(c.rhsi * 100, 0)}% ≥ 80% (ISO 13788 임계 상대습도) → 곰팡이 위험. 단열을 보강해 내표면 온도를 높이세요.</div>`;
    $('#glMsg').innerHTML = msg;
    // 표
    const rows = [];
    const names = ['외표면', ...c.Ls.slice(0, -1).map((L, i) => `${L.name} | ${c.Ls[i + 1].name}`), '내표면'];
    c.Tn.forEach((T, i) => {
      const s = c.sn[i], ps = PHYS.psat(T), pl = pLin(s), pc = pAtS(s);
      rows.push(`<tr class="${pl > ps + 0.01 ? 'hl' : ''}"><td>${names[i]}</td><td>${fmt(c.xn[i], 1)}</td><td>${fmt(s, 2)}</td><td>${fmt(T, 2)}</td><td>${fmt(ps, 0)}</td><td>${fmt(pl, 0)}</td><td>${fmt(pc, 0)}</td><td>${fmt(Math.min(pc / ps, 1) * 100, 0)}</td></tr>`);
    });
    $('#glTab2').innerHTML = '<tr><th>경계면 (외→내)</th><th>x [mm]</th><th>s<sub>d</sub> [m]</th><th>T [°C]</th><th>p<sub>sat</sub> [Pa]</th><th>p 직선 [Pa]</th><th>p 보정 [Pa]</th><th>φ [%]</th></tr>' + rows.join('');
  },
};

/* ===========================================================
   퀴즈
   =========================================================== */
const QUIZ = [
  { q: '난방부하가 10 kW인 집에 효율 200%의 히트펌프를 쓰면 전기 사용량은?', o: ['20 kW', '10 kW', '5 kW', '12.5 kW'], a: 2, e: '에너지 사용량 = 부하 ÷ 효율 = 10 ÷ 2 = 5 kW. 패시브 기술은 부하를, 액티브 기술은 효율을 개선합니다.' },
  { q: '다층 벽에서 정상상태일 때, 각 층을 통과하는 열류 q는?', o: ['열전도율이 큰 층에서 더 크다', '모든 층에서 같다', '바깥쪽 층에서 더 크다', '두꺼운 층에서 더 작다'], a: 1, e: '정상상태에서는 에너지가 어디에도 쌓이지 않으므로 같은 q가 모든 층을 흐릅니다. 대신 R이 큰 층에서 온도가 많이 떨어집니다.' },
  { q: '두께 60 mm, k = 0.03 W/(m·K) 인 단열재의 열저항은?', o: ['0.002 m²K/W', '0.5 m²K/W', '2.0 m²K/W', '1.8 m²K/W'], a: 2, e: 'R = d/k = 0.06/0.03 = 2.0 m²K/W (강의 p.21 예).' },
  { q: '병렬 구성(단열재 옆 콘크리트)에서 전체를 계산할 때 더하는 것은?', o: ['열저항 R', '컨덕턴스 1/R (면적 가중)', '두께', '온도'], a: 1, e: '병렬일 때는 흐르는 길이 여러 개이므로 컨덕턴스가 더해집니다. 작은 면적의 콘크리트가 열손실을 크게 늘리는 이유(열교)입니다.' },
  { q: '스테판-볼츠만 법칙에서 온도를 2배(K 기준)로 올리면 흑체 방사량은?', o: ['2배', '4배', '8배', '16배'], a: 3, e: 'q = σT⁴ 이므로 2⁴ = 16배. 반드시 켈빈 온도를 사용해야 합니다.' },
  { q: '상당외기온도 T_sol 이 외기온도보다 높아지는 주된 원인은?', o: ['외벽이 흡수한 일사 αq_sol', '실내 발열', '벽의 열용량', '장파 복사손실 εq_e'], a: 0, e: 'T_sol = T_oa + (α/h_t)q_sol − (ε/h_t)q_e. 흡수한 일사가 온도를 올리고, 하늘로의 장파복사는 오히려 낮춥니다.' },
  { q: '온도는 그대로 두고 공기 중 수증기량을 늘리면 상대습도는?', o: ['그대로', '증가', '감소', '온도에 따라 다름'], a: 1, e: 'p_sat(컵 크기)은 온도로만 정해지므로, p(물의 양)가 늘면 φ = p/p_sat 가 증가합니다.' },
  { q: '25 °C, 70% 공기를 10 °C로 냉각하면 무슨 일이 생기나?', o: ['절대습도 유지, 상대습도만 증가', '이슬점(약 19 °C) 아래로 내려가 결로·제습이 일어난다', '상대습도가 감소한다', '아무 변화 없다'], a: 1, e: '이슬점 ≈ 19.1 °C. 그 아래로 냉각하면 포화선을 따라 내려가며 x가 14 → 7.6 g/kg로 줄고, 차이만큼 물이 응축됩니다 (50 kg 공기에서 약 0.32 kg).' },
  { q: '투습저항계수 μ에 대한 설명으로 옳은 것은?', o: ['항상 1보다 작다', '정지 공기 대비 확산을 얼마나 막는지 나타내며 항상 1 이상이다', '열전도율과 같은 값이다', '온도에 크게 의존한다'], a: 1, e: 'μ = D₀/D. 정지 공기의 확산계수 D₀가 가장 크므로 μ ≥ 1. s_d = μd 가 열저항 R = d/k 에 해당합니다.' },
  { q: '내단열 벽체에서 내부결로를 막는 가장 효과적인 방법은?', o: ['외부 쪽에 방습층 설치', '실내 쪽(따뜻한 쪽)에 방습층 설치', '단열재 제거', '외부 마감재의 μ를 크게'], a: 1, e: '수증기는 따뜻하고 습한 실내에서 들어옵니다. 실내 쪽에서 막아야 차가운 층에 도달하는 수증기압이 낮아집니다. Glaser 시뮬레이터의 "내단열 + 방습층" 프리셋을 확인해 보세요.' },
  { q: '모세관 상승 높이를 키우는 조건은?', o: ['기공이 클수록, 접촉각이 클수록', '기공이 작을수록, 접촉각이 작을수록(친수성)', '기공이 클수록, 소수성일수록', '관계없다'], a: 1, e: 'h = 2γcosθ/(ρgr). r이 작고 cosθ가 클수록(θ 작음) 높이 올라갑니다. 그래서 기초 아래 자갈층(큰 공극)이 모세관 흡수를 끊습니다.' },
  { q: '열교(thermal bridge)가 문제인 이유로 가장 거리가 먼 것은?', o: ['열손실 증가', '실내 표면온도 저하', '결로·곰팡이 위험 증가', '벽의 일사 흡수율 증가'], a: 3, e: '열교는 열류가 몰리는 곳으로 열손실을 키우고, 실내 표면온도를 떨어뜨려 표면 상대습도를 높입니다(결로/곰팡이). 일사 흡수율과는 무관합니다.' },
];
PAGES['quiz'] = {
  init() {
    this.ans = {};
    $('#quizBox').innerHTML = QUIZ.map((Q, i) => `
      <div class="card" data-q="${i}"><h3>Q${i + 1}. ${Q.q}</h3>
        <div class="btn-row">${Q.o.map((o, j) => `<button data-o="${j}">${o}</button>`).join('')}</div>
        <div class="exp"></div></div>`).join('');
    $('#quizBox').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-o]'); if (!b) return;
      const card = b.closest('[data-q]'), i = +card.dataset.q, j = +b.dataset.o, Q = QUIZ[i];
      if (this.ans[i] != null) return;
      this.ans[i] = j;
      $$('button', card).forEach((x, k) => { if (k === Q.a) { x.style.background = '#e8f6ee'; x.style.borderColor = '#1e8449'; } else if (k === j) { x.style.background = '#fdecea'; x.style.borderColor = '#c0392b'; } });
      $('.exp', card).innerHTML = `<div class="callout ${j === Q.a ? 'good' : 'warn'}">${j === Q.a ? '정답! ' : '오답. '}${Q.e}</div>`;
      const n = Object.keys(this.ans).length, ok = Object.entries(this.ans).filter(([k, v]) => QUIZ[k].a === v).length;
      $('#quizScore').textContent = `점수: ${ok} / ${n} (총 ${QUIZ.length}문항)`;
    });
    $('#quizScore').textContent = `총 ${QUIZ.length}문항 — 보기를 눌러 답해 보세요.`;
  },
};
