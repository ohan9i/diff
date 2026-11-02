/* ===========================================================
   Part 1 — 열에너지와 열전달
   =========================================================== */
'use strict';
const PAGES = {};

/* 로그 슬라이더 매핑 */
function logK(v) { return Math.pow(10, -1.7 + v / 100 * 4.0); }          // 0.02 ~ 200
function invLogK(k) { return (Math.log10(k) + 1.7) / 4.0 * 100; }
function logT(v) { return Math.pow(10, 2 + v / 100 * 2); }                // 100 ~ 10000 K
function invLogT(t) { return (Math.log10(t) - 2) / 2 * 100; }

/* ===========================================================
   H1. 열부하 vs 에너지 사용량
   =========================================================== */
PAGES['h-load'] = {
  init() {
    const root = $('#h-load');
    bindControls(root, (el) => {
      if (el.id === 'ldSys' && el.value !== 'custom') setV('ldEta', el.value);
      if (el.id === 'ldEta') $('#ldSys').value = 'custom';
      this.update();
    });
    this.update();
  },
  update() {
    const To = V('ldTo'), Ts = V('ldTs'), UA = V('ldUA'), eta = V('ldEta');
    const load = UA * (Ts - To);         // + : 난방, - : 냉방
    const mode = load > 0 ? '난방' : load < 0 ? '냉방' : '없음';
    const L = Math.abs(load), E = L / eta;
    const { ctx, w, h } = fitCanvas($('#ldCanvas'), 280);
    ctx.clearRect(0, 0, w, h);
    // 외부 배경
    const tmin = -20, tmax = 40;
    const hw = Math.min(w * 0.55, 380);
    ctx.fillStyle = tempColor(To, tmin, tmax, 0.35); ctx.fillRect(0, 0, hw, h);
    // 집
    const hx = 50, hy = 90, hW = hw - 100, hH = 150;
    ctx.fillStyle = tempColor(Ts, tmin, tmax, 0.6);
    ctx.fillRect(hx, hy, hW, hH);
    ctx.strokeStyle = '#3a4357'; ctx.lineWidth = 8; ctx.strokeRect(hx, hy, hW, hH);
    ctx.beginPath(); ctx.moveTo(hx - 14, hy); ctx.lineTo(hx + hW / 2, hy - 60); ctx.lineTo(hx + hW + 14, hy); ctx.closePath();
    ctx.fillStyle = '#3a4357'; ctx.fill();
    ctx.fillStyle = '#1d2433'; ctx.font = '700 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`실내 설정 ${Ts} °C`, hx + hW / 2, hy + 40);
    ctx.font = '600 13px sans-serif';
    ctx.fillText(`외기 ${To} °C`, hw / 2, h - 12);
    // 열 이동 화살표
    if (load !== 0) {
      const n = Math.min(6, 1 + Math.round(L / 1500));
      const col = load > 0 ? '#2e86de' : '#e4572e';
      for (let i = 0; i < n; i++) {
        const y = hy + 60 + i * (hH - 70) / Math.max(1, n - 1 || 1);
        if (load > 0) { arrow(ctx, hx + 20, y, hx - 40, y, col, 3); arrow(ctx, hx + hW - 20, y, hx + hW + 40, y, col, 3); }
        else { arrow(ctx, hx - 40, y, hx + 20, y, col, 3); arrow(ctx, hx + hW + 40, y, hx + hW - 20, y, col, 3); }
      }
      ctx.fillStyle = col; ctx.font = '600 13px sans-serif';
      ctx.fillText(load > 0 ? '열이 빠져나감 → 난방으로 공급' : '열이 들어옴 → 냉방으로 제거', hx + hW / 2, hy + hH - 14);
    }
    // 막대
    const bx = hw + 40, bw = 70, base = h - 40, maxV = Math.max(L, E, 1) * 1.15;
    const bars = [['부하', L, '#5d6679'], ['에너지 사용', E, load > 0 ? '#e4572e' : '#2e86de']];
    bars.forEach(([lab, v, c], i) => {
      const x = bx + i * (bw + 40), bh = (base - 30) * v / maxV;
      ctx.fillStyle = c; roundRect(ctx, x, base - bh, bw, bh, 6); ctx.fill();
      ctx.fillStyle = '#1d2433'; ctx.font = '700 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(fmt(v / 1000, 2) + ' kW', x + bw / 2, base - bh - 8);
      ctx.font = '13px sans-serif'; ctx.fillStyle = '#5d6679';
      ctx.fillText(lab, x + bw / 2, base + 18);
    });
    ctx.textAlign = 'center'; ctx.fillStyle = '#5d6679'; ctx.font = '600 12px sans-serif';
    ctx.fillText(`부하 ÷ 효율 ${fmt(eta * 100, 0)}% = 사용량`, bx + bw + 20, 18);

    $('#ldKpis').innerHTML = `
      <div class="kpi ${load > 0 ? 'cold' : 'hot'}"><div class="k">부하 종류</div><div class="v">${mode}부하</div></div>
      <div class="kpi"><div class="k">${mode}부하 Q</div><div class="v">${fmt(L / 1000, 2)}<small>kW</small></div></div>
      <div class="kpi"><div class="k">설비 에너지 사용량</div><div class="v">${fmt(E / 1000, 2)}<small>kW</small></div></div>
      <div class="kpi"><div class="k">하루 사용량 (24 h)</div><div class="v">${fmt(E * 24 / 1000, 1)}<small>kWh</small></div></div>`;
  },
};

/* ===========================================================
   H2. 전도 — 푸리에 법칙
   =========================================================== */
PAGES['h-cond'] = {
  parts: [],
  init() {
    const root = $('#h-cond');
    const keys = ['pir', 'eps', 'mineral', 'wood', 'gypsum', 'brick', 'concrete', 'glass', 'water', 'steel', 'alu', 'air'];
    $('#cdMat').innerHTML = keys.map(k => `<option value="${k}" ${k === 'concrete' ? 'selected' : ''}>${MATERIALS[k].name} (k=${MATERIALS[k].k})</option>`).join('') + '<option value="custom">직접 조정</option>';
    $('#cdK').value = invLogK(1.5);
    bindControls(root, (el) => {
      if (el.id === 'cdMat' && el.value !== 'custom') setV('cdK', invLogK(MATERIALS[el.value].k));
      if (el.id === 'cdK') $('#cdMat').value = 'custom';
      this.update();
    });
    this.update();
  },
  calc() {
    const k = logK(V('cdK')), dx = V('cdDx') / 1000, T1 = V('cdT1'), T2 = V('cdT2'), A = V('cdA');
    const R = dx / k, q = -(T2 - T1) / R;
    return { k, dx, T1, T2, A, R, q, Q: q * A };
  },
  update() {
    const c = this.calc();
    $('#cdKpis').innerHTML = `
      <div class="kpi hot"><div class="k">열류 q (왼→오 +)</div><div class="v">${fmt(c.q, Math.abs(c.q) < 10 ? 2 : 0)}<small>W/m²</small></div></div>
      <div class="kpi"><div class="k">열류량 Q = qA</div><div class="v">${fmt(c.Q / 1000, 2)}<small>kW</small></div></div>
      <div class="kpi"><div class="k">열저항 R = Δx/k</div><div class="v">${fmt(c.R, 3)}<small>m²K/W</small></div></div>
      <div class="kpi"><div class="k">온도구배 dT/dx</div><div class="v">${fmt((c.T2 - c.T1) / c.dx, 0)}<small>K/m</small></div></div>`;
    this.drawBar(c);
  },
  drawBar(c) {
    const keys = ['pir', 'eps', 'wood', 'gypsum', 'brick', 'concrete', 'glass', 'steel', 'alu'];
    const { ctx, w, h } = fitCanvas($('#cdBar'), 260);
    ctx.clearRect(0, 0, w, h);
    const l = 150, r = w - 70, top = 8, rowH = (h - 30) / keys.length;
    const lo = Math.log10(0.001), hi = Math.log10(100);
    const X = (m) => l + (Math.log10(Math.max(m, 0.001)) - lo) / (hi - lo) * (r - l);
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#5d6679'; ctx.textAlign = 'center';
    [[0.001, '1 mm'], [0.01, '1 cm'], [0.1, '10 cm'], [1, '1 m'], [10, '10 m'], [100, '100 m']].forEach(([m, t]) => {
      ctx.strokeStyle = '#eceff5'; ctx.beginPath(); ctx.moveTo(X(m), top); ctx.lineTo(X(m), h - 20); ctx.stroke();
      ctx.fillText(t, X(m), h - 6);
    });
    keys.forEach((k, i) => {
      const m = MATERIALS[k], d = c.R * m.k, y = top + i * rowH;
      ctx.fillStyle = m.color; roundRect(ctx, l, y + 3, Math.max(2, X(d) - l), rowH - 6, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.stroke();
      ctx.fillStyle = '#1d2433'; ctx.textAlign = 'right'; ctx.font = '12px sans-serif';
      ctx.fillText(m.name, l - 8, y + rowH / 2 + 4);
      ctx.textAlign = 'left';
      const txt = d >= 1 ? fmt(d, 2) + ' m' : d >= 0.01 ? fmt(d * 100, 1) + ' cm' : fmt(d * 1000, 1) + ' mm';
      ctx.fillText(txt, Math.min(X(d) + 6, r + 4), y + rowH / 2 + 4);
    });
  },
  tick(dt) {
    const c = this.calc();
    const cv = $('#cdCanvas');
    const { ctx, w, h } = fitCanvas(cv, 250);
    ctx.clearRect(0, 0, w, h);
    const tmin = -20, tmax = 60;
    const sx0 = w * 0.3, sx1 = w * 0.7, top = 30, bot = h - 40;
    // 공기
    ctx.fillStyle = tempColor(c.T1, tmin, tmax, 0.25); ctx.fillRect(0, top, sx0, bot - top);
    ctx.fillStyle = tempColor(c.T2, tmin, tmax, 0.25); ctx.fillRect(sx1, top, w - sx1, bot - top);
    // 슬래브 (온도 그라데이션)
    const g = ctx.createLinearGradient(sx0, 0, sx1, 0);
    for (let i = 0; i <= 10; i++) g.addColorStop(i / 10, tempColor(c.T1 + (c.T2 - c.T1) * i / 10, tmin, tmax));
    ctx.fillStyle = g; ctx.fillRect(sx0, top, sx1 - sx0, bot - top);
    ctx.strokeStyle = '#3a4357'; ctx.lineWidth = 1.5; ctx.strokeRect(sx0, top, sx1 - sx0, bot - top);
    // 온도 선
    const ty = (T) => bot - 10 - (T - tmin) / (tmax - tmin) * (bot - top - 20);
    ctx.strokeStyle = '#1d2433'; ctx.lineWidth = 2.5; ctx.beginPath();
    ctx.moveTo(sx0 - 40, ty(c.T1)); ctx.lineTo(sx0, ty(c.T1)); ctx.lineTo(sx1, ty(c.T2)); ctx.lineTo(sx1 + 40, ty(c.T2)); ctx.stroke();
    // 입자
    const speed = 18 * Math.log10(1 + Math.abs(c.q));
    const want = Math.min(160, Math.round(4 + 4 * Math.sqrt(Math.abs(c.q))));
    const dir = Math.sign(c.q);
    while (this.parts.length < want) this.parts.push({ x: Math.random(), y: Math.random(), j: Math.random() });
    if (this.parts.length > want) this.parts.length = want;
    ctx.fillStyle = 'rgba(255,190,40,.95)'; ctx.strokeStyle = 'rgba(120,60,0,.6)'; ctx.lineWidth = 1;
    this.parts.forEach(p => {
      p.x += dir * speed * dt / (sx1 - sx0);
      p.y += (Math.random() - 0.5) * 0.01;
      if (p.x > 1) p.x -= 1; if (p.x < 0) p.x += 1;
      p.y = Math.max(0.03, Math.min(0.97, p.y));
      if (dir === 0) return;
      const X = sx0 + p.x * (sx1 - sx0), Y = top + p.y * (bot - top);
      ctx.beginPath(); ctx.arc(X, Y, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    // 레이블
    ctx.fillStyle = '#1d2433'; ctx.font = '700 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`T₁ = ${c.T1} °C`, sx0 / 2, top + 22);
    ctx.fillText(`T₂ = ${c.T2} °C`, (sx1 + w) / 2, top + 22);
    ctx.font = '12px sans-serif'; ctx.fillStyle = '#3a4357';
    ctx.fillText(`Δx = ${V('cdDx')} mm,  k = ${fmt(c.k, 3)} W/(m·K)`, (sx0 + sx1) / 2, bot + 18);
    if (dir !== 0) {
      const ay = top - 12;
      if (dir > 0) arrow(ctx, sx0 + 20, ay, sx1 - 20, ay, '#e4572e', 3); else arrow(ctx, sx1 - 20, ay, sx0 + 20, ay, '#e4572e', 3);
      ctx.fillStyle = '#e4572e'; ctx.font = '600 12px sans-serif'; ctx.fillText('열은 고온 → 저온', (sx0 + sx1) / 2, ay - 6 < 10 ? ay + 18 : ay - 6);
    } else {
      ctx.fillStyle = '#5d6679'; ctx.font = '600 13px sans-serif'; ctx.fillText('온도차가 없으면 열류도 없다 (포텐셜 차 = 0)', (sx0 + sx1) / 2, top - 10);
    }
  },
};

/* ===========================================================
   H3. 다층 벽체 · U값
   =========================================================== */
const WALL_PRESETS = {
  ex29: { film: false, To: 40, Ti: 10, layers: [['concrete1', 400, 1.0], ['pir', 50, 0.02], ['wood1', 150, 0.1]] },
  ex21: { film: false, To: 0, Ti: 20, layers: [['xps', 60, 0.03], ['concrete', 120, 1.5]] },
  ext:  { film: true, To: -10, Ti: 20, layers: [['mortar', 10, 0.56], ['eps', 150, 0.035], ['concrete', 200, 1.5], ['gypsum', 12, 0.25]] },
  none: { film: true, To: -10, Ti: 20, layers: [['mortar', 20, 0.56], ['concrete', 200, 1.5], ['mortar', 15, 0.56]] },
};

/** 레이어 편집 테이블 공용 컴포넌트 */
function LayerTable(table, layers, opts, onChange) {
  const render = () => {
    const extra = opts.mu ? '<th>μ</th><th>s<sub>d</sub> [m]</th>' : '<th>R [m²K/W]</th>';
    table.innerHTML = `<tr><th>재료</th><th>d [mm]</th><th>k</th>${extra}<th></th></tr>` +
      layers.map((L, i) => `<tr data-i="${i}">
        <td><span class="swatch" style="background:${MATERIALS[L.mat].color}"></span><select data-f="mat" style="width:auto">${materialOptions(L.mat)}</select></td>
        <td><input type="number" data-f="d" value="${L.d}" min="0.1" step="any"></td>
        <td><input type="number" data-f="k" value="${L.k}" min="0.001" step="any"></td>
        ${opts.mu ? `<td><input type="number" data-f="mu" value="${L.mu}" min="1" step="any"></td><td>${fmt(L.mu * L.d / 1000, 2)}</td>` : `<td>${fmt(L.d / 1000 / L.k, 3)}</td>`}
        <td><button data-del="${i}" title="삭제">✕</button></td></tr>`).join('');
  };
  table.addEventListener('input', (e) => {
    const tr = e.target.closest('tr'); if (!tr) return;
    const L = layers[+tr.dataset.i], f = e.target.dataset.f;
    if (f === 'mat') { L.mat = e.target.value; L.k = MATERIALS[L.mat].k; if (opts.mu) L.mu = MATERIALS[L.mat].mu; render(); }
    else { const v = parseFloat(e.target.value); if (v > 0) L[f] = v; else return; }
    onChange();
    if (f !== 'mat') { // R 셀만 갱신
      const cells = tr.querySelectorAll('td');
      cells[cells.length - 2].textContent = opts.mu ? fmt(L.mu * L.d / 1000, 2) : fmt(L.d / 1000 / L.k, 3);
    }
  });
  table.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-del]'); if (!b) return;
    if (layers.length <= 1) return;
    layers.splice(+b.dataset.del, 1); render(); onChange();
  });
  render();
  return { render };
}

PAGES['h-wall'] = {
  layers: [],
  init() {
    const root = $('#h-wall');
    this.table = LayerTable($('#wlTable'), this.layers, {}, () => this.update());
    $('#wlAdd').onclick = () => { this.layers.push({ mat: 'eps', d: 50, k: MATERIALS.eps.k }); this.table.render(); this.update(); };
    $$('#wlPresets button').forEach(b => b.onclick = () => this.preset(b.dataset.p));
    bindControls(root, () => this.update());
    this.preset('ex29');
  },
  preset(p) {
    const P = WALL_PRESETS[p];
    this.layers.length = 0;
    P.layers.forEach(([mat, d, k]) => this.layers.push({ mat, d, k }));
    $('#wlFilm').checked = P.film;
    setV('wlTo', P.To); setV('wlTi', P.Ti);
    this.table.render(); this.update();
  },
  calc() {
    const film = V('wlFilm');
    const To = V('wlTo'), Ti = V('wlTi'), ho = V('wlHo'), hi = V('wlHi');
    const parts = [];
    if (film) parts.push({ name: '외표면 1/h<sub>to</sub>', R: 1 / ho, film: true, color: '#dfe6f0' });
    this.layers.forEach(L => parts.push({ name: MATERIALS[L.mat].name, R: L.d / 1000 / L.k, d: L.d, color: MATERIALS[L.mat].color, mat: L.mat }));
    if (film) parts.push({ name: '내표면 1/h<sub>ti</sub>', R: 1 / hi, film: true, color: '#dfe6f0' });
    const Rt = parts.reduce((s, p) => s + p.R, 0);
    const K = 1 / Rt;
    const qt = -K * (Ti - To); // + : 외→내
    // 노드 온도: T_n = To - q_t * sum R (외측부터)
    let acc = 0; const nodes = [To];
    parts.forEach(p => { acc += p.R; nodes.push(To - qt * acc); });
    return { film, To, Ti, parts, Rt, K, qt, nodes };
  },
  update() {
    const c = this.calc();
    $('#wlToLab').firstChild.textContent = c.film ? '외기온도 T_oa ' : '외표면온도 T_os ';
    $('#wlTiLab').firstChild.textContent = c.film ? '실내온도 T_ia ' : '내표면온도 T_is ';
    $('#wlFilmCtrls').style.display = c.film ? '' : 'none';
    this.drawSection(c);
    this.drawRes(c);
    const big = c.parts.reduce((a, p) => (p.R > a.R ? p : a), c.parts[0]);
    $('#wlKpis').innerHTML = `
      <div class="kpi"><div class="k">총 열저항 R<sub>t</sub></div><div class="v">${fmt(c.Rt, 3)}<small>m²K/W</small></div></div>
      <div class="kpi"><div class="k">${c.film ? 'U값 K = 1/R<sub>t</sub>' : '열관류 K = 1/R<sub>t</sub>'}</div><div class="v">${fmt(c.K, 3)}<small>W/(m²K)</small></div></div>
      <div class="kpi hot"><div class="k">열류 q (외→내 +)</div><div class="v">${fmt(c.qt, 2)}<small>W/m²</small></div></div>
      <div class="kpi"><div class="k">온도가 가장 많이 떨어지는 층</div><div class="v" style="font-size:15px">${big.name}<br><small>${fmt(big.R / c.Rt * 100, 0)}% 의 ΔT</small></div></div>`;
    const rows = [];
    const labs = c.film ? ['T<sub>oa</sub> (외기)', 'T<sub>os</sub> (외표면)'] : ['T<sub>os</sub> (외표면)'];
    c.nodes.forEach((T, i) => {
      let lab;
      if (i === 0) lab = labs[0];
      else if (c.film && i === 1) lab = labs[1];
      else if (i === c.nodes.length - 1) lab = c.film ? 'T<sub>ia</sub> (실내)' : 'T<sub>is</sub> (내표면)';
      else if (c.film && i === c.nodes.length - 2) lab = 'T<sub>is</sub> (내표면)';
      else lab = `경계면: ${c.parts[i - 1].name} | ${c.parts[i].name}`;
      rows.push(`<tr><td>${lab}</td><td>${fmt(T, 2)} °C</td></tr>`);
    });
    $('#wlTemps').innerHTML = '<tr><th>위치 (외측→내측)</th><th>온도</th></tr>' + rows.join('');
    this.drawParallel();
  },
  drawSection(c) {
    const { ctx, w, h } = fitCanvas($('#wlCanvas'), 320);
    ctx.clearRect(0, 0, w, h);
    const padL = 50, padR = 50, top = 26, bot = h - 34;
    const filmW = c.film ? 46 : 0;
    const totD = this.layers.reduce((s, L) => s + L.d, 0);
    const innerW = w - padL - padR - 2 * filmW;
    const minW = 14;
    // 너무 얇은 층도 보이게 최소 폭 보장
    let widths = this.layers.map(L => L.d / totD * innerW);
    const deficit = widths.reduce((s, x) => s + Math.max(0, minW - x), 0);
    const bigSum = widths.filter(x => x > minW).reduce((s, x) => s + x, 0);
    widths = widths.map(x => x < minW ? minW : x - deficit * x / bigSum);
    const tAll = [c.To, c.Ti, ...c.nodes];
    let tmin = Math.min(...tAll), tmax = Math.max(...tAll);
    const pad = Math.max(2, (tmax - tmin) * 0.12); tmin -= pad; tmax += pad;
    const ty = (T) => bot - (T - tmin) / (tmax - tmin) * (bot - top);
    // 공기층
    ctx.fillStyle = tempColor(c.To, -20, 45, 0.25); ctx.fillRect(0, top, padL + filmW, bot - top);
    ctx.fillStyle = tempColor(c.Ti, -20, 45, 0.25); ctx.fillRect(w - padR - filmW, top, padR + filmW, bot - top);
    // 레이어
    let x = padL + filmW; const xs = [padL, x];
    if (!c.film) xs.shift();
    this.layers.forEach((L, i) => {
      ctx.fillStyle = MATERIALS[L.mat].color; ctx.globalAlpha = 0.75; ctx.fillRect(x, top, widths[i], bot - top); ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x, top, widths[i], bot - top);
      ctx.save(); ctx.translate(x + widths[i] / 2, bot - 8); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#1d2433'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
      if (widths[i] > 12) ctx.fillText(`${MATERIALS[L.mat].name} ${L.d}mm`, 0, 4);
      ctx.restore();
      x += widths[i]; xs.push(x);
    });
    if (c.film) xs.push(w - padR);
    // 온도 곡선
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3; ctx.beginPath();
    if (c.film) { ctx.moveTo(8, ty(c.To)); } else { ctx.moveTo(8, ty(c.nodes[0])); }
    const pts = c.nodes.map((T, i) => [xs[i], ty(T)]);
    pts.forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.lineTo(w - 8, ty(c.nodes[c.nodes.length - 1]));
    ctx.stroke();
    ctx.fillStyle = '#c0392b'; ctx.font = '600 11px sans-serif'; ctx.textAlign = 'center';
    pts.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, Math.PI * 2); ctx.fill();
      const above = i % 2 === 0;
      ctx.fillText(fmt(c.nodes[i], 1) + '°', p[0], p[1] + (above ? -8 : 16));
    });
    ctx.fillStyle = '#1d2433'; ctx.font = '600 12px sans-serif';
    ctx.textAlign = 'left'; ctx.fillText('외측', 6, top - 8);
    ctx.textAlign = 'right'; ctx.fillText('내측', w - 6, top - 8);
    if (c.film) {
      ctx.font = '11px sans-serif'; ctx.fillStyle = '#5d6679'; ctx.textAlign = 'center';
      ctx.fillText('표면 경계층', padL + filmW / 2, bot + 14);
      ctx.fillText('표면 경계층', w - padR - filmW / 2, bot + 14);
    }
    // 열류 화살표
    if (Math.abs(c.qt) > 1e-6) {
      ctx.fillStyle = '#e4572e'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${c.qt > 0 ? '→' : '←'}  열류 q = ${fmt(Math.abs(c.qt), 2)} W/m² (모든 층에서 동일)  ${c.qt > 0 ? '→' : '←'}`, w / 2, top - 9);
    }
  },
  drawRes(c) {
    const { ctx, w, h } = fitCanvas($('#wlRes'), 110);
    ctx.clearRect(0, 0, w, h);
    const l = 10, r = w - 10, y = 30, bh = 34;
    let x = l;
    c.parts.forEach(p => {
      const pw = p.R / c.Rt * (r - l);
      ctx.fillStyle = p.color; ctx.fillRect(x, y, pw, bh);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, pw, bh);
      ctx.fillStyle = '#1d2433'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      if (pw > 34) {
        ctx.fillText(`R=${fmt(p.R, 3)}`, x + pw / 2, y + 14);
        ctx.fillText(`ΔT=${fmt(Math.abs(c.qt * p.R), 1)}K`, x + pw / 2, y + 28);
      }
      x += pw;
    });
    ctx.fillStyle = '#5d6679'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('각 칸의 폭 = 그 층의 열저항 비율 = 그 층에서 떨어지는 온도의 비율', l, y - 10);
    ctx.fillText(`ΔT 전체 = ${fmt(Math.abs(c.Ti - c.To), 1)} K,  R_t = ${fmt(c.Rt, 3)} m²K/W`, l, y + bh + 22);
  },
  drawParallel() {
    const d = V('pfD') / 1000, ki = V('pfKi'), kc = V('pfKc'), f = V('pfF') / 100, dT = V('pfDT');
    const Ri = d / ki, Rc = d / kc;
    const qi = dT / Ri, qc = dT / Rc;
    const Qi = (1 - f) * qi, Qc = f * qc, Qt = Qi + Qc;
    const Ueff = Qt / dT;
    const { ctx, w, h } = fitCanvas($('#pfCanvas'), 200);
    ctx.clearRect(0, 0, w, h);
    const x0 = w * 0.35, x1 = w * 0.65, top = 10, bot = h - 10;
    const yc = top + (bot - top) * (1 - f);
    ctx.fillStyle = MATERIALS.eps.color; ctx.fillRect(x0, top, x1 - x0, yc - top);
    ctx.fillStyle = MATERIALS.concrete.color; ctx.fillRect(x0, yc, x1 - x0, bot - yc);
    ctx.strokeStyle = '#3a4357'; ctx.strokeRect(x0, top, x1 - x0, bot - top);
    ctx.fillStyle = '#1d2433'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    if (yc - top > 16) ctx.fillText('단열재', (x0 + x1) / 2, (top + yc) / 2 + 4);
    if (bot - yc > 16) ctx.fillText('콘크리트', (x0 + x1) / 2, (yc + bot) / 2 + 4);
    // 화살표 두께 = 각 부분 총 열류
    const maxQ = Math.max(Qi, Qc, 1e-9);
    const thick = (Q) => 2 + 16 * Q / maxQ;
    if (yc - top > 6) arrow(ctx, 10, (top + yc) / 2, w - 10, (top + yc) / 2, 'rgba(46,134,222,.55)', thick(Qi), 12 + thick(Qi));
    if (bot - yc > 2) arrow(ctx, 10, (yc + bot) / 2, w - 10, (yc + bot) / 2, 'rgba(228,87,46,.75)', thick(Qc), 12 + thick(Qc));
    ctx.fillStyle = '#3a4357'; ctx.textAlign = 'left'; ctx.fillText('실내 (따뜻)', 4, 14);
    ctx.textAlign = 'right'; ctx.fillText('외부 (차가움)', w - 4, 14);
    $('#pfKpis').innerHTML = `
      <div class="kpi"><div class="k">단열부 q<sub>i</sub></div><div class="v">${fmt(qi, 1)}<small>W/m²</small></div></div>
      <div class="kpi hot"><div class="k">콘크리트부 q<sub>c</sub></div><div class="v">${fmt(qc, 0)}<small>W/m²</small></div></div>
      <div class="kpi ${Qc / Qt > 0.5 ? 'bad' : ''}"><div class="k">면적 ${fmt(f * 100, 0)}% 콘크리트가 차지하는 열손실</div><div class="v">${fmt(Qc / Qt * 100, 0)}<small>%</small></div></div>
      <div class="kpi"><div class="k">평균 열관류 (단열만일 때)</div><div class="v">${fmt(Ueff, 3)}<small>(${fmt(1 / Ri, 3)})</small></div></div>`;
  },
};

/* ===========================================================
   H4. 비정상 전도
   =========================================================== */
const TR_WALLS = {
  conc:  [['concrete', 0.2]],
  ext:   [['eps', 0.1], ['concrete', 0.2]],
  int:   [['concrete', 0.2], ['eps', 0.1]],
  light: [['gypsum', 0.012], ['eps', 0.1], ['gypsum', 0.012]],
  heavy: [['brick', 0.4]],
};
PAGES['h-trans'] = {
  playing: true,
  init() {
    const root = $('#h-trans');
    bindControls(root, (el) => { if (el.id === 'trWall') this.reset(); });
    $('#trPlay').onclick = () => { this.playing = !this.playing; $('#trPlay').textContent = this.playing ? '⏸ 일시정지' : '▶ 재생'; };
    $('#trReset').onclick = () => this.reset();
    this.plotP = new Plot($('#trCanvas'), 300);
    this.plotT = new Plot($('#trTime'), 260);
    this.reset();
  },
  ho: 23, hi: 7.7,
  Toa(t) { return V('trTm') + V('trAmp') * Math.cos(2 * Math.PI * (t - 15) / 24); },
  reset() {
    const spec = TR_WALLS[$('#trWall').value];
    const cells = [];
    spec.forEach(([mat, d]) => {
      const n = Math.max(3, Math.round(d / 0.005));
      for (let i = 0; i < n; i++) cells.push({ mat, k: MATERIALS[mat].k, C: MATERIALS[mat].rho * MATERIALS[mat].c * d / n, dx: d / n });
    });
    this.cells = cells;
    const N = cells.length;
    this.G = new Float64Array(N + 1);
    this.G[0] = 1 / (1 / this.ho + cells[0].dx / (2 * cells[0].k));
    for (let i = 1; i < N; i++) this.G[i] = 1 / (cells[i - 1].dx / (2 * cells[i - 1].k) + cells[i].dx / (2 * cells[i].k));
    this.G[N] = 1 / (cells[N - 1].dx / (2 * cells[N - 1].k) + 1 / this.hi);
    let dt = Infinity;
    for (let i = 0; i < N; i++) dt = Math.min(dt, cells[i].C / (this.G[i] + this.G[i + 1]));
    this.dt = 0.9 * dt; // [s]
    this.Rt = 1 / this.ho + spec.reduce((s, [m, d]) => s + d / MATERIALS[m].k, 0) + 1 / this.hi;
    this.t = 0; // hours
    this.T = new Float64Array(N);
    const ss = this.steady(this.Toa(0));
    for (let i = 0; i < N; i++) this.T[i] = ss.cellT[i];
    this.hist = [];
    this.lastSample = -1;
  },
  steady(Toa) {
    const Ti = V('trTi'), N = this.cells.length;
    const q = (Toa - Ti) / this.Rt; // 외→내
    const cellT = new Float64Array(N);
    let T = Toa - q / this.ho; // 외표면
    let x = 0; const prof = [[0, T]];
    for (let i = 0; i < N; i++) {
      const c = this.cells[i];
      cellT[i] = T - q * c.dx / 2 / c.k;
      T -= q * c.dx / c.k; x += c.dx; prof.push([x, T]);
    }
    return { cellT, prof, Tsi: T, q };
  },
  step(seconds) {
    const N = this.cells.length, Ti = V('trTi');
    let n = Math.ceil(seconds / this.dt);
    const dt = seconds / n;
    const T = this.T, G = this.G, cells = this.cells;
    const flux = new Float64Array(N + 1);
    for (let s = 0; s < n; s++) {
      const To = this.Toa(this.t + s * dt / 3600);
      flux[0] = G[0] * (To - T[0]);
      for (let i = 1; i < N; i++) flux[i] = G[i] * (T[i - 1] - T[i]);
      flux[N] = G[N] * (T[N - 1] - Ti);
      for (let i = 0; i < N; i++) T[i] += dt * (flux[i] - flux[i + 1]) / cells[i].C;
    }
    this.t += seconds / 3600;
  },
  surface() {
    const N = this.cells.length, Ti = V('trTi');
    const qin = this.G[N] * (this.T[N - 1] - Ti);
    const c0 = this.cells[0];
    const Tos = this.T[0] + (this.Toa(this.t) - this.T[0]) * (c0.dx / (2 * c0.k)) / (c0.dx / (2 * c0.k) + 1 / this.ho);
    return { Tsi: Ti + qin / this.hi, Tos };
  },
  tick(dt) {
    if (this.playing) {
      const hrs = Math.min(V('trSpd') * dt, 2);
      this.step(hrs * 3600);
    }
    const s = this.surface();
    if (this.t - this.lastSample >= 0.1) {
      const ss = this.steady(this.Toa(this.t));
      this.hist.push([this.t, this.Toa(this.t), s.Tsi, ss.Tsi]);
      this.lastSample = this.t;
      if (this.hist.length > 1200) this.hist.shift();
    }
    this.draw(s);
  },
  draw(s) {
    const Ti = V('trTi'), Tm = V('trTm'), A = V('trAmp');
    const N = this.cells.length;
    const totD = this.cells.reduce((a, c) => a + c.dx, 0);
    const airW = totD * 0.18;
    const prof = [[-airW, this.Toa(this.t)], [0, s.Tos]];
    let x = 0;
    for (let i = 0; i < N; i++) { prof.push([x + this.cells[i].dx / 2, this.T[i]]); x += this.cells[i].dx; }
    prof.push([totD, s.Tsi], [totD + airW, Ti]);
    const ss = this.steady(this.Toa(this.t));
    const sprof = [[-airW, this.Toa(this.t)], ...ss.prof, [totD + airW, Ti]];
    const ymin = Math.min(Tm - A, Ti) - 3, ymax = Math.max(Tm + A, Ti) + 3;
    // 레이어 밴드
    const bands = []; x = 0;
    TR_WALLS[$('#trWall').value].forEach(([m, d]) => { bands.push({ x0: x, x1: x + d, color: MATERIALS[m].color + '88', label: MATERIALS[m].name }); x += d; });
    const day = Math.floor(this.t / 24) + 1, hr = this.t % 24;
    this.plotP.draw({
      x: [-airW, totD + airW], y: [ymin, ymax], xlabel: '위치 [m]  (왼쪽 = 외기, 오른쪽 = 실내)', ylabel: '온도 [°C]',
      bands,
      series: [
        ...(V('trSteady') ? [{ pts: sprof, color: '#5d6679', width: 2, dash: [6, 5] }] : []),
        { pts: prof, color: '#e4572e', width: 3 },
      ],
      texts: [{ x: -airW, y: ymax, text: `${day}일차 ${String(Math.floor(hr)).padStart(2, '0')}:${String(Math.floor(hr % 1 * 60)).padStart(2, '0')}`, dx: 6, dy: 12, color: '#1d2433', bold: true }],
    });
    const t1 = this.t, t0 = Math.max(0, t1 - 72);
    const H = this.hist.filter(p => p[0] >= t0);
    this.plotT.draw({
      x: [t0, Math.max(t0 + 24, t1)], y: [ymin, ymax], xlabel: '경과 시간 [h]', ylabel: '온도 [°C]',
      series: [
        { pts: H.map(p => [p[0], p[1]]), color: '#e4572e', width: 2 },
        { pts: H.map(p => [p[0], p[3]]), color: '#2e86de', width: 1.5, dash: [5, 4] },
        { pts: H.map(p => [p[0], p[2]]), color: '#2e86de', width: 3 },
      ],
      hlines: [{ y: Ti, color: '#5d6679', label: `실내 ${Ti}°C` }],
    });
    // 지표: 최근 24h
    let lag = null, ampSi = null, ampSS = null;
    if (this.t > 48) {
      const last = this.hist.filter(p => p[0] >= this.t - 24);
      const mx = (idx) => last.reduce((a, p) => (p[idx] > a[idx] ? p : a), last[0]);
      const mn = (idx) => last.reduce((a, p) => (p[idx] < a[idx] ? p : a), last[0]);
      const pO = mx(1), pS = mx(2);
      lag = ((pS[0] - pO[0]) % 24 + 24) % 24;
      ampSi = (mx(2)[2] - mn(2)[2]) / 2;
      ampSS = (mx(3)[3] - mn(3)[3]) / 2;
    }
    const totC = this.cells.reduce((a, c) => a + c.C, 0) / 1000;
    $('#trKpis').innerHTML = `
      <div class="kpi"><div class="k">U값 (두 벽 비교용)</div><div class="v">${fmt(1 / this.Rt, 3)}<small>W/(m²K)</small></div></div>
      <div class="kpi"><div class="k">벽의 열용량</div><div class="v">${fmt(totC, 0)}<small>kJ/(m²K)</small></div></div>
      <div class="kpi"><div class="k">시간 지연 (외기 최고→표면 최고)</div><div class="v">${lag == null ? '계산 중…' : fmt(lag, 1) + '<small>h</small>'}</div></div>
      <div class="kpi"><div class="k">실내표면 진폭 (실제 / 정상가정)</div><div class="v">${ampSi == null ? '…' : fmt(ampSi, 2) + ' / ' + fmt(ampSS, 2) + '<small>K</small>'}</div></div>`;
  },
};

/* ===========================================================
   H5. 대류
   =========================================================== */
PAGES['h-conv'] = {
  mode: 'nat', parts: [],
  init() {
    const root = $('#h-conv');
    bindControls(root, () => this.update());
    $('#cvNat').onclick = () => { this.mode = 'nat'; $('#cvNat').classList.add('on'); $('#cvFor').classList.remove('on'); this.parts = []; this.update(); };
    $('#cvFor').onclick = () => { this.mode = 'for'; $('#cvFor').classList.add('on'); $('#cvNat').classList.remove('on'); this.parts = []; this.update(); };
    this.update();
  },
  calc() {
    const Ts = V('cvTs'), Ta = V('cvTa'), v = V('cvV'), A = V('cvA');
    let h;
    if (V('cvMan')) h = V('cvH');
    else if (this.mode === 'nat') h = Math.max(1.0, 1.31 * Math.cbrt(Math.abs(Ts - Ta)));
    else h = 5.8 + 3.9 * v;
    return { Ts, Ta, v, A, h, q: h * (Ts - Ta) };
  },
  update() {
    $('#cvVwrap').style.display = this.mode === 'for' ? '' : 'none';
    $('#cvHwrap').style.display = V('cvMan') ? '' : 'none';
    const c = this.calc();
    $('#cvKpis').innerHTML = `
      <div class="kpi"><div class="k">대류열전달계수 h<sub>c</sub></div><div class="v">${fmt(c.h, 1)}<small>W/(m²K)</small></div></div>
      <div class="kpi hot"><div class="k">대류 열류 q<sub>c</sub> (표면→공기 +)</div><div class="v">${fmt(c.q, 1)}<small>W/m²</small></div></div>
      <div class="kpi"><div class="k">전체 Q = q<sub>c</sub>A</div><div class="v">${fmt(c.q * c.A, 0)}<small>W</small></div></div>`;
    $('#cvNote').innerHTML = V('cvMan') ? '직접 지정한 h<sub>c</sub> 값을 사용합니다.' :
      this.mode === 'nat'
        ? '자연대류: 데워진 공기는 가벼워져 올라가고(부력), 차가운 공기는 내려갑니다. 여기서는 수직면 난류 자연대류 경험식 h<sub>c</sub> ≈ 1.31·ΔT<sup>1/3</sup> 를 사용했어요. 표면이 공기보다 차가우면 흐름이 아래로 바뀝니다.'
        : '강제대류: 팬이나 바람이 공기를 밀어줍니다. 풍속이 커지면 경계층이 얇아져 h<sub>c</sub> 가 커집니다. 경험식 예: h<sub>c</sub> ≈ 5.8 + 3.9·v (Jürges 식).';
  },
  tick(dt) {
    const c = this.calc();
    const { ctx, w, h } = fitCanvas($('#cvCanvas'), 340);
    ctx.clearRect(0, 0, w, h);
    const tmin = Math.min(c.Ts, c.Ta) - 5, tmax = Math.max(c.Ts, c.Ta) + 5;
    const col = (T) => tempColor(T, -10, 60);
    ctx.fillStyle = tempColor(c.Ta, -10, 60, 0.15); ctx.fillRect(0, 0, w, h);
    const want = 140;
    if (this.mode === 'nat') {
      const px = 60; // 판 두께
      const delta = Math.max(40, 160 / Math.pow(Math.abs(c.Ts - c.Ta) + 1, 0.25));
      const sgn = Math.sign(c.Ts - c.Ta);
      // 판
      ctx.fillStyle = col(c.Ts); ctx.fillRect(0, 0, px, h);
      ctx.strokeStyle = '#3a4357'; ctx.strokeRect(0, 0, px, h);
      // 경계층
      ctx.setLineDash([5, 5]); ctx.strokeStyle = '#5d6679';
      ctx.beginPath(); ctx.moveTo(px + delta, 0); ctx.lineTo(px + delta, h); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#5d6679'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('경계층', px + delta + 4, 16);
      while (this.parts.length < want) this.parts.push({ x: Math.random() * 1.6, y: Math.random() });
      const vmax = 140 * Math.min(1.5, Math.sqrt(Math.abs(c.Ts - c.Ta)) / 4);
      this.parts.forEach(p => {
        const xi = p.x;
        const f = xi < 1 ? 6.75 * xi * (1 - xi) * (1 - xi) : 0;
        p.y -= sgn * vmax * f * dt / h;
        p.x += (Math.random() - 0.5) * 0.01 + (xi > 1 ? -0.002 : 0);
        if (p.y < 0) { p.y += 1; p.x = Math.random() * 1.1; }
        if (p.y > 1) { p.y -= 1; p.x = Math.random() * 1.1; }
        if (p.x < 0.02) p.x = 0.02; if (p.x > 1.6) p.x = Math.random() * 1.6;
        const T = xi < 1 ? c.Ta + (c.Ts - c.Ta) * (1 - xi) * (1 - xi) : c.Ta;
        ctx.fillStyle = col(T); ctx.strokeStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath(); ctx.arc(px + p.x * delta, p.y * h, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      // 속도/온도 분포 곡선
      const yb = h - 20;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#1d2433'; ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const xi = i / 40; const f = xi < 1 ? 6.75 * xi * (1 - xi) ** 2 : 0; const X = px + xi * delta, Y = yb - sgn * f * 90; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.stroke();
      ctx.strokeStyle = '#c0392b'; ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const xi = i / 40; const T = xi < 1 ? (1 - xi) ** 2 : 0; const X = px + xi * delta, Y = yb - 90 - 10 + (1 - T) * 0 - T * 0; i ? ctx.lineTo(X, 40 + (1 - T) * 80) : ctx.moveTo(X, 40 + (1 - T) * 80); }
      ctx.stroke();
      ctx.font = '600 12px sans-serif'; ctx.fillStyle = '#c0392b'; ctx.fillText('온도 T: T_s → T₀', px + delta * 1.1, 46);
      ctx.fillStyle = '#1d2433'; ctx.fillText(sgn >= 0 ? '속도 v: 0 → 최대 → 0 (상승)' : '속도 v: 0 → 최대 → 0 (하강)', px + delta * 1.1, yb - 20);
      ctx.save(); ctx.translate(30, h / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = '#fff'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`벽 표면 ${c.Ts}°C`, 0, 4); ctx.restore();
      ctx.fillStyle = '#1d2433'; ctx.textAlign = 'right'; ctx.font = '700 13px sans-serif'; ctx.fillText(`공기 T₀ = ${c.Ta}°C`, w - 10, 20);
    } else {
      const ph = 50; const base = h - ph;
      const delta = Math.min(base - 20, 150 / Math.sqrt(c.v));
      ctx.fillStyle = col(c.Ts); ctx.fillRect(0, base, w, ph);
      ctx.strokeStyle = '#3a4357'; ctx.strokeRect(0, base, w, ph);
      ctx.fillStyle = '#fff'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`표면 ${c.Ts}°C`, w / 2, base + 30);
      ctx.setLineDash([5, 5]); ctx.strokeStyle = '#5d6679';
      ctx.beginPath(); ctx.moveTo(0, base - delta); ctx.lineTo(w, base - delta); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#5d6679'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('경계층 두께 δ', 8, base - delta - 6);
      const prof = (eta) => eta >= 1 ? 1 : 1.5 * eta - 0.5 * eta ** 3;
      while (this.parts.length < want) this.parts.push({ x: Math.random(), z: Math.random() * (base - 10) });
      this.parts.forEach(p => {
        const eta = p.z / delta;
        p.x += c.v * 40 * prof(eta) * dt / w + 0.0003;
        if (p.x > 1) { p.x -= 1; p.z = Math.random() * (base - 10); }
        const T = c.Ts + (c.Ta - c.Ts) * prof(eta);
        ctx.fillStyle = col(T); ctx.strokeStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath(); ctx.arc(p.x * w, base - p.z - 4, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      // 속도 프로파일 화살표
      const x0 = w * 0.75;
      ctx.strokeStyle = '#1d2433'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, base); ctx.lineTo(x0, 20); ctx.stroke();
      for (let z = 8; z < base - 20; z += 18) {
        const L = 90 * prof(z / delta);
        if (L > 4) arrow(ctx, x0, base - z, x0 + L, base - z, '#1d2433', 1.5, 6);
      }
      ctx.fillStyle = '#1d2433'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`v₀ = ${c.v} m/s, T₀ = ${c.Ta}°C`, x0 + 10, 30);
      ctx.fillText('표면에서 v = 0 (마찰)', x0 + 10, base - 6);
    }
  },
};

/* ===========================================================
   H6. 복사
   =========================================================== */
PAGES['h-rad'] = {
  lowe: false,
  init() {
    const root = $('#h-rad');
    $('#rdT').value = invLogT(300);
    bindControls(root, (el) => {
      if (el.id === 'rdA' || el.id === 'rdTau') {
        const a = V('rdA'), t = V('rdTau');
        if (a + t > 1) { if (el.id === 'rdA') setV('rdTau', +(1 - a).toFixed(2)); else setV('rdA', +(1 - t).toFixed(2)); }
      }
      this.update();
    });
    $$('#h-rad button[data-t]').forEach(b => b.onclick = () => { setV('rdT', invLogT(+b.dataset.t)); this.update(); });
    $('#geClear').onclick = () => { this.lowe = false; $('#geClear').classList.add('on'); $('#geLowe').classList.remove('on'); this.drawGlass(); };
    $('#geLowe').onclick = () => { this.lowe = true; $('#geLowe').classList.add('on'); $('#geClear').classList.remove('on'); this.drawGlass(); };
    this.plot = new Plot($('#rdCanvas'), 380);
    this.gplot = new Plot($('#geSpec'), 260);
    this.update();
  },
  spectrum(T) {
    const pts = [];
    for (let i = 0; i <= 300; i++) { const l = Math.pow(10, -1 + i / 100); pts.push([l, PHYS.planck(l, T)]); }
    return pts;
  },
  update() {
    const T = logT(V('rdT'));
    const series = [];
    if (V('rdRef')) [[300, '#c0392b'], [1000, '#e67e22'], [5800, '#f1c40f']].forEach(([t, c]) => series.push({ pts: this.spectrum(t), color: c, width: 1.5, dash: [5, 4] }));
    series.push({ pts: this.spectrum(T), color: '#1d2433', width: 3 });
    const lmax = 2898 / T;
    this.plot.draw({
      x: [0.1, 100], y: [1e-2, 1e9], xlog: true, ylog: true,
      xlabel: '파장 λ [μm]', ylabel: 'dq/dλ [W/(m²·μm)]', series,
      points: [{ x: lmax, y: PHYS.planck(lmax, T), color: '#e4572e', label: `최대 λ = ${fmt(lmax, 2)} μm`, }],
      texts: V('rdRef') ? [
        { x: 40, y: PHYS.planck(40, 300) * 4, text: '300 K', color: '#c0392b', bold: true, align: 'center' },
        { x: 2.9, y: PHYS.planck(2.9, 1000) * 3, text: '1000 K', color: '#e67e22', bold: true, align: 'center' },
        { x: 0.5, y: PHYS.planck(0.5, 5800) * 3, text: '5800 K 태양', color: '#b7950b', bold: true, align: 'center' },
      ] : [],
      after: (ctx, p) => {
        const x0 = p.sx(0.38), x1 = p.sx(0.78);
        const g = ctx.createLinearGradient(x0, 0, x1, 0);
        ['#8e44ad', '#2e86de', '#27ae60', '#f1c40f', '#e67e22', '#c0392b'].forEach((c, i) => g.addColorStop(i / 5, c));
        ctx.globalAlpha = 0.18; ctx.fillStyle = g; ctx.fillRect(x0, p.pad.t, x1 - x0, p.ph); ctx.globalAlpha = 1;
      },
    });
    const q = PHYS.sigma * T ** 4;
    $('#rdKpis').innerHTML = `
      <div class="kpi hot"><div class="k">총 방사 q = σT⁴</div><div class="v">${q > 1e5 ? fmt(q / 1e6, 2) + '<small>MW/m²</small>' : fmt(q, 0) + '<small>W/m²</small>'}</div></div>
      <div class="kpi"><div class="k">최대 파장 (빈 법칙 2898/T)</div><div class="v">${fmt(lmax, 2)}<small>μm</small></div></div>
      <div class="kpi"><div class="k">300 K 대비 방사량</div><div class="v">${fmt(q / (PHYS.sigma * 300 ** 4), q / (PHYS.sigma * 8.1e9) > 100 ? 0 : 2)}<small>배</small></div></div>`;
    this.drawBalance();
    this.exchange();
    this.drawGlass();
  },
  drawBalance() {
    const a = V('rdA'), t = V('rdTau'), r = Math.max(0, 1 - a - t);
    const { ctx, w, h } = fitCanvas($('#rdBal'), 170);
    ctx.clearRect(0, 0, w, h);
    // 물체
    const bx = w / 2 - 20, by = 20, bw = 40, bh = 90;
    ctx.fillStyle = '#5d6679'; ctx.globalAlpha = 0.3 + 0.7 * a; ctx.fillRect(bx, by, bw, bh); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#1d2433'; ctx.strokeRect(bx, by, bw, bh);
    const yc = by + bh / 2;
    arrow(ctx, 20, yc - 20, bx - 2, yc, '#f39c12', 6);
    ctx.fillStyle = '#f39c12'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('입사 1.0', 14, yc - 26);
    if (r > 0.01) { arrow(ctx, bx - 2, yc + 4, 30, yc + 40, '#8e9aaf', 1 + 6 * r); ctx.fillStyle = '#5d6679'; ctx.fillText(`반사 ρ=${fmt(r, 2)}`, 14, yc + 56); }
    if (t > 0.01) { arrow(ctx, bx + bw + 2, yc, w - 20, yc, '#2e86de', 1 + 6 * t); ctx.fillStyle = '#2e86de'; ctx.textAlign = 'right'; ctx.fillText(`투과 τ=${fmt(t, 2)}`, w - 14, yc - 10); }
    ctx.fillStyle = '#c0392b'; ctx.textAlign = 'center'; ctx.fillText(`흡수 α=${fmt(a, 2)} (→ 열)`, bx + bw / 2, by + bh + 16);
    // 막대
    const y = h - 26, l = 10, rr = w - 10;
    [[r, '#b0b8c8', 'ρ'], [a, '#e4572e', 'α'], [t, '#2e86de', 'τ']].reduce((x, [v, c, n]) => {
      const pw = v * (rr - l);
      ctx.fillStyle = c; ctx.fillRect(x, y, pw, 18);
      if (pw > 28) { ctx.fillStyle = '#fff'; ctx.font = '700 11px sans-serif'; ctx.fillText(`${n} ${fmt(v, 2)}`, x + pw / 2, y + 13); }
      return x + pw;
    }, l);
  },
  exchange() {
    const Ti = V('rdTi') + 273.15, Tj = V('rdTj') + 273.15, ei = V('rdEi'), ej = V('rdEj'), F = V('rdF'), hc = V('rdHc');
    const qr = F * ei * ej * PHYS.sigma * (Ti ** 4 - Tj ** 4);
    const hr = Math.abs(Ti - Tj) < 1e-6 ? 4 * F * ei * ej * PHYS.sigma * Ti ** 3 : qr / (Ti - Tj);
    const ht = hc + hr;
    $('#rdKpis2').innerHTML = `
      <div class="kpi hot"><div class="k">순복사 q<sub>r</sub> (i→j)</div><div class="v">${fmt(qr, 1)}<small>W/m²</small></div></div>
      <div class="kpi"><div class="k">복사열전달계수 h<sub>r</sub></div><div class="v">${fmt(hr, 2)}<small>W/(m²K)</small></div></div>
      <div class="kpi"><div class="k">총열전달계수 h<sub>t</sub>=h<sub>c</sub>+h<sub>r</sub></div><div class="v">${fmt(ht, 2)}<small>W/(m²K)</small></div></div>
      <div class="kpi"><div class="k">복사가 차지하는 비율</div><div class="v">${fmt(hr / ht * 100, 0)}<small>%</small></div></div>`;
  },
  drawGlass() {
    const lowe = this.lowe;
    const tau = (l) => (l >= 0.3 && l <= 2.7 ? 0.85 : l > 2.7 && l < 4.5 ? 0.85 * (4.5 - l) / 1.8 : 0) * (lowe && l > 0.78 && l <= 2.7 ? 0.75 : 1);
    const rho = (l) => lowe ? (l > 3 ? 0.9 : l > 0.78 ? 0.2 : 0.08) : 0.08;
    const sun = [], room = [], tp = [], rp = [];
    const ps = PHYS.planck(0.5, 5800), pr = PHYS.planck(9.66, 300);
    for (let i = 0; i <= 240; i++) {
      const l = Math.pow(10, Math.log10(0.2) + i / 240 * (Math.log10(50) - Math.log10(0.2)));
      sun.push([l, PHYS.planck(l, 5800) / ps]); room.push([l, PHYS.planck(l, 300) / pr]);
      tp.push([l, tau(l)]); rp.push([l, rho(l)]);
    }
    this.gplot.draw({
      x: [0.2, 50], y: [0, 1.05], xlog: true, xlabel: '파장 λ [μm]', ylabel: '정규화 값 / 비율',
      xticks: [0.2, 0.5, 1, 2, 5, 10, 20, 50],
      series: [
        { pts: sun, color: '#f39c12', width: 2, fill: 'rgba(243,156,18,.12)' },
        { pts: room, color: '#c0392b', width: 2, fill: 'rgba(192,57,43,.10)' },
        { pts: tp, color: '#2e86de', width: 3 },
        { pts: rp, color: '#6c5ce7', width: 2, dash: [5, 4] },
      ],
    });
    const { ctx, w, h } = fitCanvas($('#geRoom'), 260);
    ctx.clearRect(0, 0, w, h);
    const gx = w * 0.38;
    ctx.fillStyle = '#eaf4fb'; ctx.fillRect(0, 0, gx, h);
    ctx.fillStyle = '#fff6ec'; ctx.fillRect(gx, 0, w - gx, h);
    ctx.fillStyle = lowe ? 'rgba(108,92,231,.45)' : 'rgba(168,218,220,.8)'; ctx.fillRect(gx - 5, 20, 10, h - 40);
    // 태양
    ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(34, 34, 20, 0, Math.PI * 2); ctx.fill();
    arrow(ctx, 50, 50, gx - 8, 80, '#f39c12', 4); arrow(ctx, gx + 6, 82, w * 0.9, 118, '#f39c12', 4);
    ctx.fillStyle = '#b7950b'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('단파(가시광) 거의 투과', gx + 14, 66);
    // 실내 물체
    ctx.fillStyle = '#8d6e63'; ctx.fillRect(w * 0.7, h - 50, w * 0.26, 34);
    ctx.fillStyle = '#5d4037'; ctx.font = '12px sans-serif'; ctx.textAlign = 'right'; ctx.fillText('실내 물체 (≈300 K)', w - 8, h - 56);
    arrow(ctx, w * 0.72, h - 52, gx + 10, h - 100, '#c0392b', 3);
    ctx.textAlign = 'left';
    if (lowe) {
      arrow(ctx, gx + 10, h - 92, w * 0.62, h - 40, '#6c5ce7', 3);
      ctx.fillStyle = '#6c5ce7'; ctx.font = '600 12px sans-serif'; ctx.fillText('장파를 반사 → 실내로 되돌림', gx + 14, h - 130);
    } else {
      ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(gx, h - 100, 8, 0, Math.PI * 2); ctx.globalAlpha = .5; ctx.fill(); ctx.globalAlpha = 1;
      arrow(ctx, gx - 8, h - 100, gx - 60, h - 110, 'rgba(192,57,43,.5)', 2);
      ctx.fillStyle = '#c0392b'; ctx.font = '600 12px sans-serif'; ctx.fillText('장파는 유리에 흡수됨', gx + 14, h - 140);
      ctx.font = '12px sans-serif'; ctx.fillText('(간접적으로만 빠져나감)', gx + 14, h - 125);
    }
    ctx.fillStyle = '#1d2433'; ctx.font = '700 13px sans-serif';
    ctx.fillText('외부', 10, h - 10); ctx.textAlign = 'right'; ctx.fillText('실내', w - 10, 20);
    $('#geNote').innerHTML = lowe
      ? 'Low-e 코팅: 가시광 투과율은 거의 그대로지만 <b>장파 반사율이 크게 증가</b>합니다. 실내 열이 복사로 빠져나가는 것을 막아 겨울에 유리합니다.'
      : '온실효과: 단파(태양)는 유리를 통과해 들어오지만, 실내 물체가 내는 장파는 유리가 흡수해 쉽게 나가지 못합니다 → <b>유입 &gt; 유출</b>, 실내가 데워집니다.';
  },
};

/* ===========================================================
   H7. 상당외기온도
   =========================================================== */
PAGES['h-solair'] = {
  init() {
    const root = $('#h-solair');
    bindControls(root, (el) => {
      if (el.id === 'saCol') setV('saA', el.value);
      this.update();
    });
    this.plot = new Plot($('#saCanvas'), 280);
    this.update();
  },
  at(t) {
    const Tm = V('saTm'), A = V('saAmp'), qmax = V('saQ'), a = V('saA'), e = V('saE'), qe = V('saQe'), h = V('saH');
    const Toa = Tm + A * Math.cos(2 * Math.PI * (t - 15) / 24);
    const qsol = qmax * Math.max(0, Math.sin(Math.PI * (t - 6) / 12));
    const Tsol = Toa + a / h * qsol - e / h * qe;
    return { Toa, qsol, Tsol };
  },
  update() {
    const K = V('saU'), Ti = V('saTi'), hr = V('saHr');
    const pts = []; for (let i = 0; i <= 96; i++) pts.push(i / 4);
    const S = pts.map(t => [t, this.at(t)]);
    const all = S.flatMap(([, s]) => [s.Toa, s.Tsol]).concat([Ti]);
    const ymin = Math.floor(Math.min(...all) - 2), ymax = Math.ceil(Math.max(...all) + 3);
    const qmapped = S.map(([t, s]) => [t, ymin + s.qsol / 1000 * (ymax - ymin) * 0.9]);
    const cur = this.at(hr);
    this.plot.draw({
      x: [0, 24], y: [ymin, ymax], xlabel: '시각 [h]', ylabel: '온도 [°C]', xticks: [0, 3, 6, 9, 12, 15, 18, 21, 24],
      series: [
        { pts: qmapped, color: '#f39c12', width: 1.5, fill: 'rgba(243,156,18,.12)', fillTo: ymin },
        { pts: S.map(([t, s]) => [t, s.Toa]), color: '#2e86de', width: 2.5 },
        { pts: S.map(([t, s]) => [t, s.Tsol]), color: '#e4572e', width: 3 },
      ],
      hlines: [{ y: Ti, color: '#5d6679', label: `실내 ${Ti}°C` }],
      vlines: [{ x: hr, color: '#1d2433', dash: [3, 3] }],
      points: [{ x: hr, y: cur.Tsol, color: '#e4572e', label: `T_sol ${fmt(cur.Tsol, 1)}°C` }, { x: hr, y: cur.Toa, color: '#2e86de', label: `T_oa ${fmt(cur.Toa, 1)}°C`, align: 'left' }],
    });
    // 벽 그림
    const { ctx, w, h } = fitCanvas($('#saWall'), 170);
    ctx.clearRect(0, 0, w, h);
    const wx = w * 0.45, ww = 40;
    ctx.fillStyle = tempColor(cur.Toa, -10, 50, 0.25); ctx.fillRect(0, 0, wx, h);
    ctx.fillStyle = tempColor(Ti, -10, 50, 0.25); ctx.fillRect(wx + ww, 0, w - wx - ww, h);
    const a = V('saA');
    const shade = Math.round(255 * (1 - a));
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`; ctx.fillRect(wx, 0, ww, h);
    ctx.strokeStyle = '#3a4357'; ctx.strokeRect(wx, 0, ww, h);
    if (cur.qsol > 1) {
      ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(30, 28, 16, 0, Math.PI * 2); ctx.fill();
      arrow(ctx, 50, 40, wx - 4, 70, '#f39c12', 1 + cur.qsol / 150);
      ctx.fillStyle = '#b7950b'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`일사 ${fmt(cur.qsol, 0)} W/m² 중 ${fmt(a * 100, 0)}% 흡수`, 10, 64 + 30);
    }
    arrow(ctx, wx - 4, 130, wx - 60, 150, '#6c5ce7', 2);
    ctx.fillStyle = '#6c5ce7'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('장파 → 하늘', 10, 160);
    const q = K * (cur.Tsol - Ti);
    if (Math.abs(q) > 0.05) {
      if (q > 0) arrow(ctx, wx + ww + 6, h / 2, wx + ww + 80, h / 2, '#e4572e', 2 + Math.abs(q) / 3);
      else arrow(ctx, wx + ww + 80, h / 2, wx + ww + 6, h / 2, '#2e86de', 2 + Math.abs(q) / 3);
    }
    ctx.fillStyle = '#1d2433'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`q = K(T_sol − T_ia) = ${fmt(q, 1)} W/m²`, wx + ww + 10, h / 2 - 16);
    let daily = 0, dailyAir = 0;
    S.forEach(([t, s], i) => { if (i) { daily += K * (s.Tsol - Ti) * 0.25; dailyAir += K * (s.Toa - Ti) * 0.25; } });
    $('#saKpis').innerHTML = `
      <div class="kpi hot"><div class="k">${fmt(hr, 2)}시 상당외기온도</div><div class="v">${fmt(cur.Tsol, 1)}<small>°C</small></div></div>
      <div class="kpi"><div class="k">외기온도 대비 상승</div><div class="v">+${fmt(cur.Tsol - cur.Toa, 1)}<small>K</small></div></div>
      <div class="kpi"><div class="k">하루 열취득 (일사 반영)</div><div class="v">${fmt(daily, 0)}<small>Wh/m²</small></div></div>
      <div class="kpi"><div class="k">일사 무시했다면</div><div class="v">${fmt(dailyAir, 0)}<small>Wh/m²</small></div></div>`;
  },
};

/* ===========================================================
   H8. 열교 — 2D 정상 열전도 (유한체적 + SOR)
   =========================================================== */
PAGES['h-bridge'] = {
  NX: 180, NY: 120, L: 0.01,
  init() {
    const root = $('#h-bridge');
    let timer = null;
    bindControls(root, (el) => {
      if (el.id === 'tbIso' || el.id === 'tbFlux' || el.id === 'tbRH') { this.draw(); return; }
      clearTimeout(timer); timer = setTimeout(() => this.update(), 60);
    });
    this.cache = {};
    new ResizeObserver(() => this.res && this.draw()).observe($('#tbCanvas'));
    this.update();
  },
  /* 재료 격자 0=실내공기 1=외기 2=콘크리트 3=단열재 4=단열브레이크 */
  build(kind, ti) {
    const { NX, NY } = this;
    const m = new Uint8Array(NX * NY);
    const wx0 = 60, wx1 = 80, ix1 = 80 + ti, sy0 = 50, sy1 = 70, bEnd = ix1 + 50;
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      let v = i < wx0 ? 0 : 1;
      if (i >= wx0 && i < wx1) v = 2;
      else if (i >= wx1 && i < ix1) v = 3;
      if (j >= sy0 && j < sy1) {
        if (i < wx0) v = 2;
        if (kind !== 'none' && i >= wx1 && i < bEnd) v = (kind === 'break' && i < ix1) ? 4 : 2;
      }
      if (kind === 'wrap' && i >= ix1 && i < bEnd + ti && j >= sy0 - ti && j < sy1 + ti && v === 1) v = 3;
      m[j * NX + i] = v;
    }
    return m;
  },
  solve(kind, ti, Ti, Te, warm) {
    const { NX, NY, L } = this;
    const mat = this.build(kind, ti);
    const K = [0, 0, 1.5, 0.035, 0.15];
    const hi = 1 / 0.13, he = 1 / 0.04;
    const N = NX * NY;
    const T = warm && warm.length === N ? Float64Array.from(warm) : new Float64Array(N).fill((Ti + Te) / 2);
    const nb = new Int32Array(N * 4).fill(-1), G = new Float64Array(N * 4), Gs = new Float64Array(N), B = new Float64Array(N);
    const solid = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const id = j * NX + i, mi = mat[id];
      if (mi < 2) { T[id] = mi === 0 ? Ti : Te; continue; }
      solid.push(id);
      const k = K[mi];
      dirs.forEach(([dx, dy], d) => {
        const ii = i + dx, jj = j + dy;
        if (ii < 0 || jj < 0 || ii >= NX || jj >= NY) return; // 단열 경계
        const nid = jj * NX + ii, mn = mat[nid];
        if (mn < 2) {
          const h = mn === 0 ? hi : he;
          const g = L / (L / 2 / k + 1 / h);
          Gs[id] += g; B[id] += g * (mn === 0 ? Ti : Te);
        } else {
          const g = L / (L / 2 / k + L / 2 / K[mn]);
          G[id * 4 + d] = g; nb[id * 4 + d] = nid; Gs[id] += g;
        }
      });
    }
    const w = 1.92;
    for (let it = 0; it < 6000; it++) {
      let maxd = 0;
      for (let s = 0; s < solid.length; s++) {
        const id = solid[s]; let sum = B[id];
        const b = id * 4;
        for (let d = 0; d < 4; d++) { const n = nb[b + d]; if (n >= 0) sum += G[b + d] * T[n]; }
        const nv = sum / Gs[id];
        const dT = nv - T[id];
        T[id] += w * dT;
        if (Math.abs(dT) > maxd) maxd = Math.abs(dT);
      }
      if (maxd < 2e-5) break;
    }
    // 실내측 열손실 및 최저 표면온도
    let Q = 0, Tsmin = Infinity, at = null;
    for (const id of solid) {
      const i = id % NX, j = (id / NX) | 0, k = K[mat[id]];
      dirs.forEach(([dx, dy]) => {
        const ii = i + dx, jj = j + dy;
        if (ii < 0 || jj < 0 || ii >= NX || jj >= NY) return;
        if (mat[jj * NX + ii] !== 0) return;
        const g = L / (L / 2 / k + 1 / hi);
        const q = g * (Ti - T[id]);
        Q += q;
        const Ts = Ti - q / L / hi;
        if (Ts < Tsmin) { Tsmin = Ts; at = [i + dx * 0.5, j + dy * 0.5]; }
      });
    }
    return { T, mat, Q, Tsmin, at, K };
  },
  update() {
    const kind = $('#tbCase').value, ti = V('tbIns'), Ti = V('tbTi'), Te = V('tbTe');
    const key = `${ti}|${Ti}|${Te}`;
    if (!this.cache[key]) this.cache = { [key]: this.solve('none', ti, Ti, Te) };
    const base = this.cache[key];
    this.res = kind === 'none' ? base : this.solve(kind, ti, Ti, Te, this.res && this.res.T);
    this.base = base; this.params = { kind, ti, Ti, Te };
    this.draw();
  },
  draw() {
    const r = this.res; if (!r) return;
    const { NX, NY } = this, { Ti, Te, kind } = this.params;
    const cv = $('#tbCanvas');
    const w0 = cv.clientWidth || 700;
    const scaleH = w0 * NY / NX;
    const { ctx, w } = fitCanvas(cv, Math.round(scaleH + 40));
    const s = w / NX;
    // 히트맵
    const img = document.createElement('canvas'); img.width = NX; img.height = NY;
    const ic = img.getContext('2d'), id = ic.createImageData(NX, NY);
    for (let p = 0; p < NX * NY; p++) {
      const [R, G, B] = tempRGB(r.T[p], Te, Ti);
      const air = r.mat[p] < 2;
      id.data[p * 4] = air ? 255 - (255 - R) * 0.25 : R;
      id.data[p * 4 + 1] = air ? 255 - (255 - G) * 0.25 : G;
      id.data[p * 4 + 2] = air ? 255 - (255 - B) * 0.25 : B;
      id.data[p * 4 + 3] = 255;
    }
    ic.putImageData(id, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, scaleH + 40);
    ctx.drawImage(img, 0, 0, NX * s, NY * s);
    // 재료 경계
    ctx.strokeStyle = 'rgba(20,26,42,.55)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const m = r.mat[j * NX + i];
      if (i + 1 < NX && r.mat[j * NX + i + 1] !== m) { ctx.moveTo((i + 1) * s, j * s); ctx.lineTo((i + 1) * s, (j + 1) * s); }
      if (j + 1 < NY && r.mat[(j + 1) * NX + i] !== m) { ctx.moveTo(i * s, (j + 1) * s); ctx.lineTo((i + 1) * s, (j + 1) * s); }
    }
    ctx.stroke();
    // 단열재 해칭
    ctx.save(); ctx.beginPath();
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) if (r.mat[j * NX + i] === 3 || r.mat[j * NX + i] === 4) ctx.rect(i * s, j * s, s + 0.5, s + 0.5);
    ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.beginPath();
    for (let x = -NY * s; x < NX * s; x += 7) { ctx.moveTo(x, 0); ctx.lineTo(x + NY * s, NY * s); }
    ctx.stroke(); ctx.restore();
    // 등온선 (marching squares, 고체 셀 사이)
    if (V('tbIso')) {
      ctx.strokeStyle = 'rgba(20,26,42,.75)'; ctx.lineWidth = 1;
      const step = (Ti - Te) / 10;
      for (let lv = Te + step; lv < Ti - 1e-9; lv += step) {
        ctx.beginPath();
        for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
          const a = j * NX + i, b = a + 1, c = a + NX + 1, d = a + NX;
          if (r.mat[a] < 2 || r.mat[b] < 2 || r.mat[c] < 2 || r.mat[d] < 2) continue;
          const v = [r.T[a], r.T[b], r.T[c], r.T[d]];
          const P = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
          const pts = [];
          for (let e = 0; e < 4; e++) {
            const v0 = v[e], v1 = v[(e + 1) % 4];
            if ((v0 - lv) * (v1 - lv) < 0) {
              const t = (lv - v0) / (v1 - v0);
              const p0 = P[e], p1 = P[(e + 1) % 4];
              pts.push([(p0[0] + (p1[0] - p0[0]) * t + 0.5) * s, (p0[1] + (p1[1] - p0[1]) * t + 0.5) * s]);
            }
          }
          if (pts.length >= 2) { ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); }
          if (pts.length === 4) { ctx.moveTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); }
        }
        ctx.stroke();
      }
    }
    // 열류 화살표
    if (V('tbFlux')) {
      const qs = [];
      for (let j = 4; j < NY - 4; j += 7) for (let i = 4; i < NX - 4; i += 7) {
        const id0 = j * NX + i; if (r.mat[id0] < 2) continue;
        const k = r.K[r.mat[id0]];
        const tR = r.mat[id0 + 1] >= 2 ? r.T[id0 + 1] : r.T[id0], tL = r.mat[id0 - 1] >= 2 ? r.T[id0 - 1] : r.T[id0];
        const tD = r.mat[id0 + NX] >= 2 ? r.T[id0 + NX] : r.T[id0], tU = r.mat[id0 - NX] >= 2 ? r.T[id0 - NX] : r.T[id0];
        const qx = -k * (tR - tL) / (2 * this.L), qy = -k * (tD - tU) / (2 * this.L);
        qs.push([i, j, qx, qy, Math.hypot(qx, qy)]);
      }
      const qmax = Math.max(...qs.map(q => q[4]), 1e-9);
      qs.forEach(([i, j, qx, qy, m]) => {
        if (m < qmax * 0.01) return;
        const len = 4 + 16 * Math.log10(1 + 9 * m / qmax);
        const X = (i + 0.5) * s, Y = (j + 0.5) * s;
        arrow(ctx, X - qx / m * len / 2, Y - qy / m * len / 2, X + qx / m * len / 2, Y + qy / m * len / 2, 'rgba(255,255,255,.95)', 1.6, 5);
      });
    }
    // 최저 표면온도 위치
    if (r.at) {
      ctx.strokeStyle = '#141a2a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc((r.at[0] + 0.5) * s, (r.at[1] + 0.5) * s, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#141a2a'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`최저 내표면 ${fmt(r.Tsmin, 1)}°C`, (r.at[0] + 0.5) * s + 12, (r.at[1] + 0.5) * s + 22);
    }
    ctx.fillStyle = '#1d2433'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`실내 ${Ti}°C`, 8, 18); ctx.textAlign = 'right'; ctx.fillText(`외기 ${Te}°C`, w - 8, 18);
    // 컬러바
    const cy = NY * s + 12, cx0 = 40, cx1 = w - 40;
    for (let x = cx0; x < cx1; x++) { ctx.fillStyle = tempColor(Te + (Ti - Te) * (x - cx0) / (cx1 - cx0), Te, Ti); ctx.fillRect(x, cy, 1.5, 10); }
    ctx.fillStyle = '#3a4357'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    for (let k = 0; k <= 5; k++) ctx.fillText(fmt(Te + (Ti - Te) * k / 5, 0) + '°', cx0 + (cx1 - cx0) * k / 5, cy + 24);

    const dT = Ti - Te;
    const fR = (r.Tsmin - Te) / dT;
    const pi = V('tbRH') / 100 * PHYS.psat(Ti);
    const rhs = pi / PHYS.psat(r.Tsmin) * 100;
    const Td = PHYS.dewPoint(pi);
    const psi = (r.Q - this.base.Q) / dT;
    const cls = rhs >= 100 ? 'bad' : rhs >= 80 ? 'bad' : 'good';
    $('#tbKpis').innerHTML = `
      <div class="kpi ${fR < 0.7 ? 'bad' : 'good'}"><div class="k">최저 내표면온도 (f<sub>Rsi</sub>)</div><div class="v">${fmt(r.Tsmin, 1)}<small>°C (${fmt(fR, 2)})</small></div></div>
      <div class="kpi"><div class="k">실내공기 이슬점</div><div class="v">${fmt(Td, 1)}<small>°C</small></div></div>
      <div class="kpi ${cls}"><div class="k">그 지점 표면 상대습도</div><div class="v">${fmt(Math.min(rhs, 999), 0)}<small>% ${rhs >= 100 ? '결로!' : rhs >= 80 ? '곰팡이 위험' : '안전'}</small></div></div>
      <div class="kpi ${psi > 0.3 ? 'bad' : ''}"><div class="k">선형 열관류율 Ψ</div><div class="v">${kind === 'none' ? '0 (기준)' : fmt(psi, 3)}<small>W/(m·K)</small></div></div>
      <div class="kpi"><div class="k">실내→외부 열손실 (1 m 폭)</div><div class="v">${fmt(r.Q, 1)}<small>W/m</small></div></div>`;
  },
};
