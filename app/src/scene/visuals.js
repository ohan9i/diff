/* 공식 카드 속 작은 그림. 업그레이드한 변수가 그림에 바로 드러나게 그린다.
   (재료 질감 = k, 블록 두께 = Δx, 블록 높이 = A, 불 세기 = ΔT, 막대 수 = N …)
   아직 사지 않은 것은 그리지 않는다. 값은 부드럽게 따라가도록 st 에 보간해서 저장. */
import { roundRect } from '../game/core.js';
import * as M from '../game/model.js';

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
function sm(st, key, target, dt, rate = 6) { if (st[key] === undefined) st[key] = target; st[key] = lerp(st[key], target, Math.min(1, dt * rate)); return st[key]; }
const L = (f, p) => M.lvl(f, p);

/* 재료 질감 (열전도율 k 레벨별) */
const MATS = [
  { base: '#f6f3ea', line: '#e2dccb', kind: 'foam' }, { base: '#d9a066', line: '#b77a45', kind: 'wood' },
  { base: '#d0674a', line: '#f3d6c4', kind: 'brick' }, { base: '#b8b7bf', line: '#9897a3', kind: 'concrete' },
  { base: '#8f9bb0', line: '#dfe6f2', kind: 'metal' }, { base: '#d7dee9', line: '#ffffff', kind: 'metal' },
  { base: '#e08a4f', line: '#ffd2a8', kind: 'metal' }, { base: '#bff2ff', line: '#ffffff', kind: 'gem' },
];
function texture(ctx, x, y, w, h, m, t, rad) {
  const rr = rad ?? Math.min(8, w / 4);
  ctx.save(); roundRect(ctx, x, y, w, h, rr); ctx.clip();
  ctx.fillStyle = m.base; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = m.line; ctx.fillStyle = m.line; ctx.lineWidth = 1.2;
  if (m.kind === 'foam') for (let i = 0; i < w * h / 60; i++) { const px = x + ((i * 37) % w), py = y + ((i * 53) % h); ctx.beginPath(); ctx.arc(px, py, 2.2, 0, TAU); ctx.stroke(); }
  if (m.kind === 'wood') for (let i = 0; i < 6; i++) { ctx.beginPath(); for (let k = 0; k <= 10; k++) { const py = y + h * (i + 0.5) / 6 + Math.sin(k * 0.9 + i) * 2; k ? ctx.lineTo(x + w * k / 10, py) : ctx.moveTo(x, py); } ctx.stroke(); }
  if (m.kind === 'brick') { const bh = Math.max(7, h / 6); for (let r = 0; r * bh < h; r++) { ctx.fillRect(x, y + r * bh, w, 1.4); for (let c = (r % 2) * 10; c < w; c += 20) ctx.fillRect(x + c, y + r * bh, 1.4, bh); } }
  if (m.kind === 'concrete') for (let i = 0; i < w * h / 40; i++) ctx.fillRect(x + ((i * 29) % w), y + ((i * 47) % h), 1.6, 1.6);
  if (m.kind === 'metal') { const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45 + 0.1 * Math.sin(t), 'rgba(255,255,255,.7)'); g.addColorStop(0.6 + 0.1 * Math.sin(t), 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  if (m.kind === 'gem') { ctx.strokeStyle = 'rgba(255,255,255,.9)'; for (let i = -2; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x + i * w / 4, y); ctx.lineTo(x + i * w / 4 + h * 0.6, y + h); ctx.stroke(); } for (let i = 0; i < 4; i++) { const a = 0.5 + 0.5 * Math.sin(t * 3 + i * 2); ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + w * (0.2 + 0.2 * i), y + h * (0.25 + 0.15 * (i % 3)), 2.2, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
  ctx.restore();
  ctx.strokeStyle = 'rgba(40,30,80,.18)'; ctx.lineWidth = 1.5; roundRect(ctx, x, y, w, h, rr); ctx.stroke();
}
// 입체 블록: 윗면·옆면 + 앞면 질감 + 뜨거운 쪽→차가운 쪽 색 그라데이션 + 그림자
function slab(ctx, x, y, w, h, m, t, heat = 0.5) {
  const d = Math.min(14, w * 0.18, h * 0.22);
  ctx.save(); ctx.fillStyle = 'rgba(40,30,90,.16)'; ctx.beginPath(); ctx.ellipse(x + w / 2 + d * 0.5, y + h + 5, w * 0.62, 5, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.fillStyle = shade(m.base, 0.82); ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w + d, y + h - d); ctx.lineTo(x + w, y + h); ctx.fill();
  ctx.fillStyle = shade(m.base, 1.12); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w, y); ctx.fill();
  texture(ctx, x, y, w, h, m, t, 2);
  ctx.save(); roundRect(ctx, x, y, w, h, 2); ctx.clip();
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, `rgba(255,110,50,${0.18 + 0.3 * heat})`); g.addColorStop(0.55, 'rgba(255,200,120,.05)'); g.addColorStop(1, 'rgba(90,170,255,.28)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k)))); return `rgb(${c.join(',')})`; }
function cloud(ctx, x, y, s, col = 'rgba(255,255,255,.95)') { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, TAU); ctx.arc(x + s * 0.5, y - s * 0.25, s * 0.6, 0, TAU); ctx.arc(x + s * 1.05, y, s * 0.45, 0, TAU); ctx.rect(x, y - s * 0.1, s * 1.05, s * 0.55); ctx.fill(); }
function drop(ctx, x, y, s, col = '#3a8ff0') { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.2, x, y + s * 0.6); ctx.quadraticCurveTo(x - s * 0.8, y + s * 0.2, x, y - s); ctx.fill(); }
function fire(ctx, x, y, s, t, hot) {
  // 작은 불꽃 (온도차가 클수록 크고 하얗게)
  const g = ctx.createRadialGradient(x, y - s * 0.4, 0, x, y - s * 0.5, s * 1.2);
  g.addColorStop(0, hot > 0.5 ? '#ffffff' : '#fff2b0'); g.addColorStop(0.4, '#ffbe4a'); g.addColorStop(1, 'rgba(255,90,40,0)');
  ctx.fillStyle = g; ctx.beginPath(); const w = Math.sin(t * 7) * s * 0.08;
  ctx.moveTo(x + w, y - s * 1.5); ctx.bezierCurveTo(x + s * 0.7, y - s * 0.8, x + s * 0.6, y, x, y); ctx.bezierCurveTo(x - s * 0.6, y, x - s * 0.7, y - s * 0.8, x + w, y - s * 1.5); ctx.fill();
}
function snowflake(ctx, x, y, r, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke(); } ctx.restore(); }
function dim(ctx, x0, y0, x1, y1, label, col = '#5b55a0') {
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0);
  for (const [px, py, aa] of [[x0, y0, a + Math.PI], [x1, y1, a]]) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(aa - 0.5) * 5, py - Math.sin(aa - 0.5) * 5); ctx.lineTo(px - Math.cos(aa + 0.5) * 5, py - Math.sin(aa + 0.5) * 5); ctx.fill(); }
  ctx.font = '700 11px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; const tw = ctx.measureText(label).width + 8;
  ctx.fillStyle = 'rgba(255,255,255,.9)'; roundRect(ctx, mx - tw / 2, my - 8, tw, 16, 8); ctx.fill(); ctx.fillStyle = col; ctx.fillText(label, mx, my + 0.5); ctx.textBaseline = 'alphabetic';
}
function dots(st, key, n, dt) { const a = (st[key] ||= []); while (a.length < n) a.push({ p: Math.random(), o: Math.random() }); a.length = Math.min(a.length, n); return a; }
function bg(ctx, w, h, warm = true) {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, warm ? 'rgba(255,190,150,.55)' : 'rgba(200,230,255,.6)'); g.addColorStop(0.5, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(170,215,255,.6)');
  ctx.fillStyle = g; roundRect(ctx, 0, 0, w, h, 14); ctx.fill();
}

export const VIS = {
  // 푸리에: 재료 블록 하나. 두께(가로)=Δx, 높이=A, 질감=k, 왼쪽 불 세기=ΔT
  fourier(ctx, w, h, t, dt, st) {
    bg(ctx, w, h);
    const dx = M.P('fourier', 'dx'), A = M.P('fourier', 'A'), dTL = L('fourier', 'dT');
    const bw = sm(st, 'bw', w * (0.12 + 0.36 * Math.sqrt(dx / 0.5)), dt), bh = sm(st, 'bh', h * (0.32 + 0.56 * Math.min(1, Math.sqrt(A / 61))), dt);
    const x = w / 2 - bw / 2, y = h * 0.5 - bh / 2;
    const hot = Math.min(1, dTL / 20), fs = sm(st, 'fs', h * (0.14 + 0.16 * Math.min(1, dTL / 15)), dt);
    for (let i = 0; i < 3; i++) fire(ctx, w * 0.1 + i * w * 0.07, h * 0.8, fs * (1 - i * 0.15), t + i, hot);
    for (let i = 0; i < 3; i++) snowflake(ctx, w * (0.84 + 0.06 * (i % 2)), h * (0.3 + i * 0.22), 5, t * 0.5 + i);
    slab(ctx, x, y, bw, bh, MATS[L('fourier', 'k')], t, hot);
    const q = Math.log10(1 + M.rawOut(M.FMAP.fourier));
    dots(st, 'd', Math.min(14, 3 + Math.round(q * 2)), dt).forEach(d => {
      d.p += dt * (0.25 + q * 0.12); if (d.p > 1) { d.p = 0; d.o = Math.random(); }
      const px = w * 0.2 + d.p * w * 0.6, py = y + bh * (0.15 + 0.7 * d.o);
      ctx.fillStyle = `rgba(255,${Math.round(150 + 90 * d.p)},${Math.round(70 + 150 * d.p)},${Math.sin(d.p * Math.PI)})`; ctx.beginPath(); ctx.arc(px, py, 3.2, 0, TAU); ctx.fill();
    });
    dim(ctx, x, y + bh + 9, x + bw, y + bh + 9, 'Δx');
    dim(ctx, x + bw + Math.min(14, bw * 0.18, bh * 0.22) + 9, y, x + bw + Math.min(14, bw * 0.18, bh * 0.22) + 9, y + bh, 'A');
    this._pop(ctx, w, h, st, dt);
  },
  // 병렬: 산 만큼만 막대가 나타남 (새 막대는 튀어나오는 애니메이션)
  parallel(ctx, w, h, t, dt, st) {
    bg(ctx, w, h);
    const N = M.P('parallel', 'N'), show = Math.min(8, N);
    st.born ||= []; while (st.born.length < show) st.born.push(t);
    const top = h * 0.12, gap = (h * 0.76) / show, th = Math.min(16, gap * 0.6);
    for (let i = 0; i < show; i++) {
      const age = t - st.born[i], s = Math.min(1, age * 3), bounce = s < 1 ? s : 1 + Math.sin(Math.min(1, age * 2) * Math.PI) * 0.06;
      const y = top + gap * (i + 0.5), x0 = w * 0.16, x1 = w * 0.84, len = (x1 - x0) * Math.min(1, bounce);
      const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#ff8a4a'); g.addColorStop(1, '#5fb6ff');
      ctx.fillStyle = g; roundRect(ctx, x0, y - th / 2, len, th, th / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; roundRect(ctx, x0 + 4, y - th / 2 + 2, Math.max(0, len - 8), th * 0.22, 2); ctx.fill();
      const ph = (t * 0.5 + i * 0.37) % 1; ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(x0 + ph * len, y, th * 0.32, 0, TAU); ctx.fill();
    }
    fire(ctx, w * 0.08, h * 0.62, h * 0.18, t, 0.3);
    if (N > show) { ctx.fillStyle = '#5b55a0'; ctx.font = '800 13px Pretendard, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('×' + N, w - 8, h - 8); }
    this._pop(ctx, w, h, st, dt);
  },
  // 직렬: 단열층이 한 겹씩 쌓이는 벽 단면 + 효율 화살표
  series(ctx, w, h, t, dt, st) {
    bg(ctx, w, h);
    const n = L('series', 'Rt'), cols = ['#f1ece2', '#fff2b8', '#ffd98a', '#b9e3ff', '#d6c8ff', '#ffc2d6', '#c8f0d8'];
    const x0 = w * 0.18, layerW = Math.min(w * 0.09, (w * 0.5) / (n + 1));
    st.born ||= []; while (st.born.length < n + 1) st.born.push(t);
    for (let i = 0; i <= n; i++) {
      const age = t - st.born[i], s = Math.min(1, age * 3);
      const x = x0 + i * layerW, sk = h * 0.12; ctx.globalAlpha = s;
      ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.moveTo(x + sk, h * 0.1); ctx.lineTo(x + sk + layerW, h * 0.1); ctx.lineTo(x + layerW, h * 0.9); ctx.lineTo(x, h * 0.9); ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,120,.18)'; ctx.stroke(); ctx.globalAlpha = 1;
    }
    const eta = M.eta(), ex = w * 0.8, ey = h * 0.82, eh = h * 0.64 * sm(st, 'eta', eta, dt);
    const g = ctx.createLinearGradient(0, ey, 0, ey - eh); g.addColorStop(0, '#ffb000'); g.addColorStop(1, '#ffe27a');
    ctx.fillStyle = g; ctx.fillRect(ex - 7, ey - eh + 12, 14, eh - 12);
    ctx.beginPath(); ctx.moveTo(ex - 15, ey - eh + 14); ctx.lineTo(ex, ey - eh - 2 + Math.sin(t * 4) * 2); ctx.lineTo(ex + 15, ey - eh + 14); ctx.fill();
    ctx.fillStyle = '#5b55a0'; ctx.font = '800 12px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('η ' + Math.round(eta * 100) + '%', ex, h * 0.96);
    this._pop(ctx, w, h, st, dt);
  },
  // 대류: 흐름 방식(h)에 따라 그림이 바뀜, 핀 개수 = 면적 A, 판 색 = 온도차
  conv(ctx, w, h, t, dt, st) {
    const hL = L('conv', 'h'), A = M.P('conv', 'A'), dTL = L('conv', 'dT');
    const liquid = hL >= 3;
    const g0 = ctx.createLinearGradient(0, 0, 0, h); g0.addColorStop(0, liquid ? 'rgba(140,200,255,.55)' : 'rgba(220,235,255,.5)'); g0.addColorStop(1, liquid ? 'rgba(70,140,230,.55)' : 'rgba(255,255,255,.3)');
    ctx.fillStyle = g0; roundRect(ctx, 0, 0, w, h, 14); ctx.fill();
    const fins = Math.min(14, 1 + Math.round(Math.sqrt(A) * 1.6)), py = h * 0.8, pw = w * 0.7, px = w * 0.15;
    const hc = Math.min(1, dTL / 6), plate = `rgb(255,${Math.round(150 - 60 * hc)},${Math.round(90 - 50 * hc)})`;
    ctx.fillStyle = plate; roundRect(ctx, px, py, pw, h * 0.08, 4); ctx.fill();
    for (let i = 0; i < fins; i++) { const fx = px + pw * (i + 0.5) / fins; ctx.fillRect(fx - 2, py - h * 0.18, 4, h * 0.18); }
    const sp = [0.4, 0.6, 1.4, 0.5, 1.6, 2.2][hL];
    st.p ||= Array.from({ length: 22 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() }));
    st.p.forEach(p => {
      if (hL === 5) { p.y -= dt * (0.5 + p.r); if (p.y < 0) { p.y = 1; p.x = Math.random(); } ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(px + p.x * pw, h * 0.08 + p.y * (py - h * 0.1), 2 + p.r * 4, 0, TAU); ctx.stroke(); return; }
      if (hL === 2 || hL === 4) { p.x += dt * sp * (0.6 + p.r * 0.6); if (p.x > 1) { p.x = 0; p.y = Math.random(); } const yy = h * 0.1 + p.y * (py - h * 0.25); ctx.strokeStyle = liquid ? 'rgba(255,255,255,.8)' : 'rgba(110,150,230,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x * w, yy); ctx.lineTo(p.x * w + 14, yy); ctx.stroke(); return; }
      p.y -= dt * sp * (0.4 + p.r * 0.5); if (p.y < 0) { p.y = 1; p.x = Math.random(); }
      const xx = px + p.x * pw + Math.sin(p.y * 8 + t) * 5, yy = h * 0.06 + p.y * (py - h * 0.2);
      ctx.fillStyle = liquid ? 'rgba(255,255,255,.75)' : `rgba(255,140,90,${0.2 + 0.5 * p.y})`; ctx.beginPath(); ctx.arc(xx, yy, liquid ? 2.2 : 3, 0, TAU); ctx.fill();
    });
    if (hL === 2 || hL === 4) { // 팬 / 펌프
      const fx = w * 0.09, fy = h * 0.4, R = h * 0.16; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(fx, fy, R * 1.15, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(t * 10); ctx.fillStyle = '#6aa8ff'; for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.ellipse(R * 0.5, 0, R * 0.5, R * 0.2, 0.3, 0, TAU); ctx.fill(); } ctx.restore();
    }
    this._pop(ctx, w, h, st, dt);
  },
  // 열교: 벽을 뚫은 발코니 슬래브, 붉은 누설 = β, 업그레이드마다 단열 보강이 붙음
  bridge(ctx, w, h, t, dt, st) {
    bg(ctx, w, h, false);
    const b = M.beta(), lv = L('bridge', 'beta');
    const wx = w * 0.42, ww = w * 0.12;
    ctx.fillStyle = '#e9e2d4'; ctx.fillRect(wx - ww, 0, ww, h); ctx.fillStyle = '#ffe58a'; ctx.fillRect(wx, 0, ww * 0.7, h); ctx.fillStyle = '#d7d3df'; ctx.fillRect(wx + ww * 0.7, 0, ww * 0.6, h);
    const sy = h * 0.46, sh = h * 0.12;
    ctx.fillStyle = '#b9b6c6'; ctx.fillRect(wx - ww, sy, w * 0.55, sh);
    if (lv >= 1) { ctx.fillStyle = '#ffe58a'; ctx.fillRect(wx + ww * 0.7, sy - 4, w * 0.18, 4); ctx.fillRect(wx + ww * 0.7, sy + sh, w * 0.18, 4); }
    if (lv >= 2) { ctx.fillStyle = '#ffcf4a'; ctx.fillRect(wx, sy, ww * 0.7, sh); }
    const R = h * (0.12 + b * 2.4), gx = wx + ww * 0.35, gl = ctx.createRadialGradient(gx, sy + sh / 2, 0, gx, sy + sh / 2, R);
    gl.addColorStop(0, `rgba(255,60,50,${Math.min(0.85, b * 4 + 0.05 * Math.sin(t * 4))})`); gl.addColorStop(1, 'rgba(255,60,50,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(gx, sy + sh / 2, R, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5b55a0'; ctx.font = '800 12px Pretendard, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('β ' + Math.round(b * 100) + '%', 8, h - 8);
    this._pop(ctx, w, h, st, dt);
  },
  // 복사: 판 색 = 온도 T, 표면(ε) = 반짝이는 금속 → 무광 검정, 판 크기 = A, 파동 세기 ∝ εT⁴
  rad(ctx, w, h, t, dt, st) {
    ctx.fillStyle = 'rgba(40,30,80,.55)'; roundRect(ctx, 0, 0, w, h, 14); ctx.fill();
    const T = M.P('rad', 'T'), eps = M.P('rad', 'eps'), A = M.P('rad', 'A'), u = Math.min(1, (T - 400) / 2200);
    const col = u < 0.35 ? [200 + u * 150, 60 + u * 250, 40] : u < 0.7 ? [255, 150 + (u - 0.35) * 250, 60 + (u - 0.35) * 250] : [255, 245, 170 + (u - 0.7) * 250];
    const ph = sm(st, 'ph', h * (0.3 + 0.55 * Math.min(1, Math.sqrt(A / 61))), dt), px = w * 0.16;
    const c = `rgb(${col.map(Math.round).join(',')})`;
    ctx.shadowColor = c; ctx.shadowBlur = 10 + 30 * u; ctx.fillStyle = c; roundRect(ctx, px, h / 2 - ph / 2, w * 0.1, ph, 5); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(30,25,40,${eps * 0.55})`; roundRect(ctx, px, h / 2 - ph / 2, w * 0.1, ph, 5); ctx.fill();
    if (eps < 0.5) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(px + 3, h / 2 - ph / 2 + 4, 3, ph - 8); }
    const n = 3 + Math.round(eps * 5);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) { const yy = h / 2 - ph / 2 + ph * (i + 0.5) / n, p = (t * (0.4 + u) + i * 0.17) % 1; ctx.strokeStyle = `rgba(${col.map(Math.round).join(',')},${(1 - p) * (0.3 + 0.6 * u)})`; ctx.beginPath(); for (let k = 0; k <= 16; k++) { const xx = px + w * 0.12 + p * w * 0.55 + k * 3, y2 = yy + Math.sin(k * 0.9 - t * 9) * 3.5; k ? ctx.lineTo(xx, y2) : ctx.moveTo(xx, y2); } ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = '800 13px Pretendard, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(T + ' K', w - 10, 20);
    this._pop(ctx, w, h, st, dt);
  },
  // 햇빛: 지역별 배경, 판 색 = α, 판 개수 = A, 하루(60초) 해 움직임
  solar(ctx, w, h, t, dt, st) {
    const reg = L('solar', 'qpk'), s = M.sunFactor();
    const skies = [['#c9d3e6', '#eef2f8'], ['#8fc7ff', '#e6f4ff'], ['#7fd0ff', '#d8fbff'], ['#ffc78a', '#fff1cf']];
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, skies[reg][0]); g.addColorStop(1, skies[reg][1]);
    ctx.fillStyle = g; roundRect(ctx, 0, 0, w, h, 14); ctx.fill();
    if (s <= 0) { ctx.fillStyle = 'rgba(30,30,90,.45)'; roundRect(ctx, 0, 0, w, h, 14); ctx.fill(); }
    const ang = (M.simT % 60) / 60;
    if (ang < 0.5) { const sx = w * (0.1 + 0.8 * ang * 2), sy = h * (0.55 - 0.4 * s); ctx.fillStyle = '#ffd23f'; ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(sx, sy, 10, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; }
    if (reg === 0) { ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(w * (0.2 + i * 0.3) + Math.sin(t * 0.3 + i) * 6, h * 0.22, 10, 0, TAU); ctx.arc(w * (0.2 + i * 0.3) + 12, h * 0.24, 8, 0, TAU); ctx.fill(); } }
    if (reg === 2) { ctx.fillStyle = '#4fb3e8'; ctx.fillRect(0, h * 0.78, w, h * 0.22); }
    if (reg === 3) { ctx.fillStyle = '#f0b46a'; ctx.beginPath(); ctx.moveTo(0, h); ctx.quadraticCurveTo(w * 0.3, h * 0.68, w * 0.6, h * 0.84); ctx.quadraticCurveTo(w * 0.8, h * 0.72, w, h * 0.8); ctx.lineTo(w, h); ctx.fill(); }
    const al = M.P('solar', 'alpha'), n = Math.min(10, 1 + L('solar', 'A'));
    const c = `rgb(${Math.round(245 - al * 225)},${Math.round(245 - al * 220)},${Math.round(250 - al * 190)})`;
    const cw = Math.min(26, (w * 0.8) / n - 4);
    for (let i = 0; i < n; i++) { const x = w * 0.1 + i * (cw + 4), y = h * 0.6; ctx.fillStyle = c; ctx.strokeStyle = '#6aa0e0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + cw + 6, y); ctx.lineTo(x + cw, y + 16); ctx.lineTo(x, y + 16); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    this._pop(ctx, w, h, st, dt);
  },
  // 이슬점: 습한 공기 구름(φ) → 코일(온도) → 이슬점 아래면 물이 컵에 고임, 화살표 수 = 유량
  cond(ctx, w, h, t, dt, st) {
    bg(ctx, w, h, false);
    const RH = M.P('cond', 'RH'), T2 = M.P('cond', 'T2'), mL = L('cond', 'm'), wr = M.rawOut(M.FMAP.cond);
    const Td = (() => { const p1 = RH / 100 * 4246; let lo = -20, hi = 40; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; (610.5 * Math.exp(17.269 * m / (237.3 + m)) > p1 ? hi = m : lo = m); } return lo; })();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(w * 0.16, h * 0.42, 15, 0, TAU); ctx.arc(w * 0.27, h * 0.38, 18, 0, TAU); ctx.arc(w * 0.27, h * 0.52, 14, 0, TAU); ctx.arc(w * 0.12, h * 0.55, 11, 0, TAU); ctx.fill();
    const nd = Math.round((RH - 50) / 5);
    ctx.fillStyle = '#4ba8f0'; for (let i = 0; i < nd; i++) { ctx.beginPath(); ctx.arc(w * (0.1 + (i * 0.37) % 0.24), h * (0.32 + ((i * 0.53) % 0.3)), 2.2, 0, TAU); ctx.fill(); }
    const arrows = 1 + Math.min(4, Math.floor(mL / 2));
    ctx.fillStyle = 'rgba(90,120,200,.6)'; for (let i = 0; i < arrows; i++) { const p = (t * 0.8 + i / arrows) % 1, x = w * 0.36 + p * w * 0.12, y = h * (0.3 + i * 0.12); ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.fill(); }
    const cold = Math.max(0, Math.min(1, (25 - T2) / 24)), cc = `rgb(${Math.round(255 - 190 * cold)},${Math.round(130 + 60 * cold)},${Math.round(110 + 145 * cold)})`;
    ctx.strokeStyle = cc; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath(); for (let i = 0; i <= 6; i++) { const x = w * 0.54 + (i % 2) * w * 0.1, y = h * (0.15 + i * 0.1); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    const cupX = w * 0.58, cupY = h * 0.8; ctx.fillStyle = 'rgba(255,255,255,.85)'; roundRect(ctx, cupX - 4, cupY, 30, 18, 4); ctx.fill();
    const lvl = sm(st, 'lvl', wr > 0 ? 0.3 + 0.6 * Math.min(1, Math.log10(1 + wr) / 3) : 0, dt, 2);
    ctx.fillStyle = '#4ba8f0'; ctx.fillRect(cupX - 2, cupY + 16 - 14 * lvl, 26, 14 * lvl);
    if (wr > 0) { const p = (t * 1.5) % 1; ctx.beginPath(); ctx.arc(cupX + 11, h * 0.75 + p * h * 0.06, 2.5, 0, TAU); ctx.fill(); }
    // 온도계: 이슬점 눈금 vs 코일 온도
    const tx = w * 0.86, ty0 = h * 0.12, ty1 = h * 0.86, toY = (T) => ty1 - (T + 2) / 32 * (ty1 - ty0);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; roundRect(ctx, tx - 5, ty0, 10, ty1 - ty0, 5); ctx.fill();
    ctx.fillStyle = cc; roundRect(ctx, tx - 3, toY(T2), 6, ty1 - toY(T2), 3); ctx.fill();
    ctx.strokeStyle = '#2c8de6'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(tx - 14, toY(Td)); ctx.lineTo(tx + 14, toY(Td)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#2c8de6'; ctx.font = '700 10px Pretendard, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('이슬점', tx - 16, toY(Td) + 3);
    this._pop(ctx, w, h, st, dt);
  },
  // Fick: 습한 쪽(Δp 만큼 증기 점) → 막(두께 d, 구멍 크기 μ) → 건조한 쪽
  fick(ctx, w, h, t, dt, st) {
    bg(ctx, w, h, false);
    const dpL = L('fick', 'dp'), muL = L('fick', 'mu'), d = M.P('fick', 'd'), AL = L('fick', 'A');
    // 왼쪽: 습한 방 (구름 수 = Δp), 오른쪽: 마른 바깥
    const wet = ctx.createLinearGradient(0, 0, w * 0.5, 0); wet.addColorStop(0, 'rgba(120,180,255,.45)'); wet.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = wet; roundRect(ctx, 0, 0, w * 0.5, h, 14); ctx.fill();
    for (let i = 0; i <= Math.min(4, dpL); i++) cloud(ctx, w * (0.05 + 0.085 * i), h * (0.2 + 0.08 * (i % 2)) + Math.sin(t + i) * 2, 13 + i, 'rgba(255,255,255,.9)');
    // 막: 두께 = d, 높이 = A, 구멍 수·크기 = 1/μ
    const mw = sm(st, 'mw', w * (0.04 + 0.16 * Math.sqrt(d / 0.2)), dt), mx = w * 0.5 - mw / 2;
    const mh = sm(st, 'mh', h * (0.36 + 0.5 * Math.min(1, AL / 14)), dt), my = h * 0.55 - mh / 2;
    const dd = Math.min(8, mw * 0.4);
    ctx.fillStyle = '#b9b0dc'; ctx.beginPath(); ctx.moveTo(mx + mw, my); ctx.lineTo(mx + mw + dd, my - dd); ctx.lineTo(mx + mw + dd, my + mh - dd); ctx.lineTo(mx + mw, my + mh); ctx.fill();
    ctx.fillStyle = '#ece8fb'; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + dd, my - dd); ctx.lineTo(mx + mw + dd, my - dd); ctx.lineTo(mx + mw, my); ctx.fill();
    ctx.fillStyle = '#d7d0ec'; ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = 'rgba(255,255,255,.95)'; const holes = 2 + muL * 2;
    for (let i = 0; i < holes; i++) { ctx.beginPath(); ctx.ellipse(mx + mw / 2, my + mh * (i + 0.5) / holes, Math.max(1.2, mw * 0.3), 1.5 + muL * 0.9, 0, 0, TAU); ctx.fill(); }
    // 수증기 입자: 막 높이 안에서만 건너감
    const n = 10 + dpL * 6;
    st.v ||= []; while (st.v.length < n) st.v.push({ x: Math.random() * 0.4, y: Math.random(), cross: false });
    st.v.length = n;
    const rate = Math.log10(1 + M.rawOut(M.FMAP.fick) * 1000);
    st.v.forEach(p => {
      const py = h * (0.1 + p.y * 0.85), inBand = py > my + 4 && py < my + mh - 4;
      if (!p.cross) { p.x += Math.sin(t * 3 + p.y * 20) * dt * 0.05; if (inBand && Math.random() < dt * 0.3 * rate) p.cross = true; p.x = Math.min(0.42, Math.max(0.03, p.x)); }
      else { p.x += dt * (0.25 + 0.05 * rate); if (p.x > 0.97) { p.x = Math.random() * 0.4; p.cross = false; } }
      const a = p.x > 0.5 ? Math.max(0, 1 - (p.x - 0.5) * 1.6) : 1;
      ctx.globalAlpha = a; drop(ctx, p.x * w, py, 3.6, p.cross ? '#2f86ea' : '#5aa6f5'); ctx.globalAlpha = 1;
    });
    this._pop(ctx, w, h, st, dt);
  },
  // 잠열: 김 → 물방울로 응축하면서 열(반짝이)을 내놓음, 회수 효율 게이지
  latent(ctx, w, h, t, dt, st) {
    bg(ctx, w, h);
    const eff = M.P('latent', 'eff');
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); for (let k = 0; k <= 10; k++) { const x = w * (0.18 + i * 0.08) + Math.sin(k * 0.8 + t * 3 + i) * 4, y = h * 0.75 - k * h * 0.05; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    const p = (t * 0.6) % 1, dx = w * 0.5, dy = h * (0.25 + p * 0.45);
    ctx.fillStyle = '#4ba8f0'; ctx.beginPath(); ctx.moveTo(dx, dy - 10); ctx.quadraticCurveTo(dx + 8, dy + 2, dx, dy + 6); ctx.quadraticCurveTo(dx - 8, dy + 2, dx, dy - 10); ctx.fill();
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + t, r = 14 + p * 16; ctx.globalAlpha = 1 - p; ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(dx + Math.cos(a) * r, dy + Math.sin(a) * r, 2.5, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
    const gx = w * 0.8, gy0 = h * 0.15, gy1 = h * 0.85, e = sm(st, 'e', eff, dt);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; roundRect(ctx, gx - 8, gy0, 16, gy1 - gy0, 8); ctx.fill();
    const g = ctx.createLinearGradient(0, gy1, 0, gy0); g.addColorStop(0, '#4fb3ff'); g.addColorStop(1, '#ff9a3c');
    ctx.fillStyle = g; roundRect(ctx, gx - 6, gy1 - (gy1 - gy0) * e, 12, (gy1 - gy0) * e, 6); ctx.fill();
    this._pop(ctx, w, h, st, dt);
  },
  // Glaser: 벽 속 포화수증기압(빨강) vs 수증기압(파랑), 해결 횟수만큼 방패
  glaser(ctx, w, h, t, dt, st) {
    bg(ctx, w, h, true);
    const x0 = w * 0.3, x1 = w * 0.7, top = h * 0.12, bot = h * 0.88;
    // 실내(따뜻, 습함) | 벽 3층 | 실외(추움)
    cloud(ctx, w * 0.06, h * 0.3, 16); for (let i = 0; i < 3; i++) drop(ctx, w * (0.08 + 0.06 * i), h * (0.62 + 0.08 * Math.sin(t * 2 + i)), 4, '#5aa6f5');
    for (let i = 0; i < 3; i++) snowflake(ctx, w * (0.82 + 0.07 * (i % 2)), h * (0.28 + i * 0.22), 5, t * 0.5 + i);
    const cols = ['#e7d7c5', '#ffe58a', '#d0674a'], xs = [x0, x0 + (x1 - x0) * 0.25, x0 + (x1 - x0) * 0.75, x1];
    for (let i = 0; i < 3; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(xs[i], top, xs[i + 1] - xs[i], bot - top); }
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x0, top, x1 - x0, 2);
    // 방습층 (해결 횟수가 있으면 보라색 막으로 표시)
    const won = M.G.glaserWins > 0;
    if (won) { ctx.fillStyle = '#6c5ce7'; ctx.fillRect(xs[1] - 2, top, 4, bot - top); }
    // p_sat (빨강, 온도 따라 떨어짐) 과 p (파랑)
    const Y = (v) => bot - (bot - top) * v;
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.strokeStyle = '#e04848'; ctx.beginPath(); ctx.moveTo(x0, Y(0.9)); ctx.bezierCurveTo(x0 + (x1 - x0) * 0.4, Y(0.85), x0 + (x1 - x0) * 0.6, Y(0.3), x1, Y(0.18)); ctx.stroke();
    ctx.strokeStyle = '#2c8de6'; ctx.beginPath();
    if (won) { ctx.moveTo(x0, Y(0.6)); ctx.lineTo(xs[1], Y(0.58)); ctx.lineTo(xs[1] + 3, Y(0.16)); ctx.lineTo(x1, Y(0.12)); }
    else { ctx.moveTo(x0, Y(0.6)); ctx.lineTo(x1, Y(0.12)); }
    ctx.stroke();
    if (!won) { const cx = x0 + (x1 - x0) * 0.7, a = 0.6 + 0.4 * Math.sin(t * 5); ctx.globalAlpha = a; drop(ctx, cx, Y(0.3) + 14, 6, '#2f86ea'); ctx.globalAlpha = 1; }
    const tag = (txt, x, y, c) => { ctx.font = '800 11px Pretendard, sans-serif'; const tw = ctx.measureText(txt).width + 10; ctx.fillStyle = 'rgba(255,255,255,.92)'; roundRect(ctx, x, y - 9, tw, 18, 9); ctx.fill(); ctx.fillStyle = c; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x + 5, y + 0.5); ctx.textBaseline = 'alphabetic'; };
    tag('포화', x0 + 4, Y(0.9) - 13, '#e04848'); tag('수증기', x0 + 4, Y(0.6) + 14, '#2c8de6');
    const n = Math.min(8, M.G.glaserWins);
    for (let i = 0; i < n; i++) { ctx.fillStyle = '#9d8bff'; const x = w * 0.06 + i * 14, y = h * 0.88; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y - 3); ctx.lineTo(x + 5, y + 4); ctx.lineTo(x, y + 7); ctx.lineTo(x - 5, y + 4); ctx.lineTo(x - 6, y - 3); ctx.fill(); }
    this._pop(ctx, w, h, st, dt);
  },
  // 업그레이드 직후 반짝 효과
  _pop(ctx, w, h, st, dt) {
    if (!st.pop) return; st.pop = Math.max(0, st.pop - dt * 1.6);
    const a = st.pop; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; roundRect(ctx, 2, 2, w - 4, h - 4, 13); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,230,140,.25)'; roundRect(ctx, 0, 0, w, h, 14); ctx.fill(); ctx.restore();
    st.sp ||= []; if (st.pop > 0.95 && !st.sp.length) for (let i = 0; i < 14; i++) st.sp.push({ x: w / 2, y: h / 2, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.8) * 220, l: 0.8 });
    st.sp = st.sp.filter(p => (p.l -= dt) > 0); st.sp.forEach(p => { p.vy += 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt; ctx.globalAlpha = p.l; ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
  },
};
