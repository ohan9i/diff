/* 메인 무대: 배경 방 + 불꽃이(마스코트) + 고객 집 + 열 방울 + 탭/드래그 상호작용.
   업그레이드가 무대에도 바로 보이게: ΔT↑ 불꽃이가 커지고 하얗게 달아오름, 직렬 단열 → 집 벽에 단열층,
   열교 → 발코니에서 새는 열, 햇빛 → 지붕 태양판, 이슬점 → 제습기, 대류 → 불꽃이 주변 바람/물/기포, 복사 → 열 파동 고리 */
import { roundRect } from '../game/core.js';
import { Room } from './room.js';
import * as M from '../game/model.js';

const TAU = Math.PI * 2;
const ease = (a, b, k) => a + (b - a) * k;

function flamePath(ctx, x, y, s, t, sx = 1, sy = 1, lean = 0) {
  const w = Math.sin(t * 5.3) * s * 0.07 + lean * s;
  ctx.beginPath();
  ctx.moveTo(x + w * 1.4, y - s * 1.62 * sy);
  ctx.bezierCurveTo(x + s * 0.22 * sx + w, y - s * 1.25 * sy, x + s * 0.86 * sx, y - s * 0.92 * sy, x + s * 0.86 * sx, y - s * 0.45 * sy);
  ctx.bezierCurveTo(x + s * 0.86 * sx, y - s * 0.02, x + s * 0.4 * sx, y + s * 0.04, x, y + s * 0.04);
  ctx.bezierCurveTo(x - s * 0.4 * sx, y + s * 0.04, x - s * 0.86 * sx, y - s * 0.02, x - s * 0.86 * sx, y - s * 0.45 * sy);
  ctx.bezierCurveTo(x - s * 0.86 * sx, y - s * 0.95 * sy, x - s * 0.3 * sx + w, y - s * 1.05 * sy, x - s * 0.08 * sx + w * 0.6, y - s * 1.28 * sy);
  ctx.bezierCurveTo(x - s * 0.02 + w, y - s * 1.4 * sy, x + w * 1.2, y - s * 1.5 * sy, x + w * 1.4, y - s * 1.62 * sy);
  ctx.closePath();
}
function sparkle(ctx, x, y, r, a = 1, col = '#fff') {
  ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill(); ctx.globalAlpha = 1;
}
// 불꽃이 그리기 (3D 느낌: 방사형 그라데이션 몸통, 안쪽 음영, 하이라이트, 반짝이는 눈)
export function drawFlameBuddy(ctx, x, y, s, t, o = {}) {
  const sq = o.squash || 0, heat = o.heat || 0, mouth = o.mouth || 0;
  const sx = 1 + sq * 0.22, sy = 1 - sq * 0.2 + Math.sin(t * 2.6) * 0.025;
  ctx.save();
  // 뒤쪽 불꽃 혀
  for (const d of [-1, 1]) {
    ctx.save(); ctx.translate(x + d * s * 0.55, y - s * 0.35); ctx.rotate(d * (0.45 + Math.sin(t * 4 + d) * 0.08));
    flamePath(ctx, 0, 0, s * 0.5, t + d, 1, 1); ctx.fillStyle = 'rgba(255,120,50,.85)'; ctx.fill(); ctx.restore();
  }
  // 몸통
  const cy = y - s * 0.55 * sy;
  let g = ctx.createRadialGradient(x - s * 0.1, cy + s * 0.1, s * 0.05, x, cy, s * 1.15);
  g.addColorStop(0, heat > 0.5 ? '#ffffff' : '#fff7cf'); g.addColorStop(0.3, heat > 0.5 ? '#fff3b0' : '#ffd968'); g.addColorStop(0.68, '#ffa23f'); g.addColorStop(1, '#ff6a2a');
  ctx.shadowColor = 'rgba(255,130,50,.75)'; ctx.shadowBlur = s * 0.55;
  flamePath(ctx, x, y, s, t, sx, sy); ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
  // 입체감: 오른쪽 아래 음영 + 가장자리 림라이트
  ctx.save(); flamePath(ctx, x, y, s, t, sx, sy); ctx.clip();
  g = ctx.createLinearGradient(x - s * 0.8, cy - s * 0.8, x + s * 0.9, y);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(214,70,20,.45)');
  ctx.fillStyle = g; ctx.fillRect(x - s * 1.2, y - s * 2, s * 2.4, s * 2.2);
  ctx.strokeStyle = 'rgba(255,240,200,.55)'; ctx.lineWidth = s * 0.06; flamePath(ctx, x - s * 0.02, y - s * 0.02, s * 0.97, t, sx, sy); ctx.stroke();
  ctx.restore();
  // 하이라이트
  ctx.save(); ctx.translate(x - s * 0.42 * sx, cy - s * 0.25); ctx.rotate(-0.6);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.3); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.16, 0, 0, TAU); ctx.fill(); ctx.restore();
  // 얼굴
  const fy = cy + s * 0.08, ex = s * 0.3 * sx, blink = (t % 3.7) < 0.13 || o.blink;
  for (const d of [-1, 1]) {
    const px = x + d * ex;
    if (blink || o.happy) { ctx.strokeStyle = '#4a1d10'; ctx.lineWidth = s * 0.065; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(px, fy + (o.happy ? s * 0.05 : 0), s * 0.12, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); continue; }
    const look = (o.look || 0) * s * 0.03;
    g = ctx.createLinearGradient(0, fy - s * 0.2, 0, fy + s * 0.2); g.addColorStop(0, '#2b1209'); g.addColorStop(1, '#6b2f17');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px + look, fy, s * 0.135, s * 0.18, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,90,.55)'; ctx.beginPath(); ctx.ellipse(px + look, fy + s * 0.1, s * 0.08, s * 0.05, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px + look + s * 0.045, fy - s * 0.065, s * 0.06, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(px + look - s * 0.05, fy + s * 0.06, s * 0.025, 0, TAU); ctx.fill();
  }
  for (const d of [-1, 1]) {
    g = ctx.createRadialGradient(x + d * s * 0.5, fy + s * 0.2, 0, x + d * s * 0.5, fy + s * 0.2, s * 0.15);
    g.addColorStop(0, 'rgba(255,90,110,.55)'); g.addColorStop(1, 'rgba(255,90,110,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + d * s * 0.5, fy + s * 0.2, s * 0.15, 0, TAU); ctx.fill();
  }
  ctx.lineCap = 'round';
  if (mouth > 0.05) { ctx.fillStyle = '#7a2412'; ctx.beginPath(); ctx.ellipse(x, fy + s * 0.22, s * 0.09, s * 0.06 + s * 0.06 * mouth, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ff7f8a'; ctx.beginPath(); ctx.ellipse(x, fy + s * 0.26 + s * 0.03 * mouth, s * 0.05, s * 0.03, 0, 0, TAU); ctx.fill(); }
  else { ctx.strokeStyle = '#4a1d10'; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.arc(x, fy + s * 0.15, s * 0.08, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  ctx.restore();
}

export class Scene {
  constructor(canvas, hooks) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.hooks = hooks;
    this.room = new Room();
    this.orbs = []; this.floats = []; this.sparks = []; this.rings = []; this.drops = []; this.smoke = []; this.bub = [];
    this.squash = 0; this.mouth = 0; this.happy = 0; this.housePulse = 0; this.blob = null; this.drag = false; this.spawnAcc = 0;
    this.heatShown = 0; this.lastLv = {};
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', () => { this.drag = false; });
  }

  setLayout(L) { this.L = L; }

  geom() {
    const { S } = this.L, r = this.room, u = r.u;
    const ms = Math.min(S.w * 0.145, S.h * 0.21) * (1 + 0.2 * (1 - Math.exp(-M.lvl('fourier', 'dT') / 8)));
    const mx = S.x + S.w * (this.L.mobile ? 0.47 : 0.42), my = r.deskY - S.h * 0.045;
    const hw = Math.min(S.w * 0.21, S.h * 0.33), hx = S.x + S.w * 0.8 - hw / 2, hy = r.deskY;
    return { u, ms, mx, my, hw, hx, hy, door: [hx + hw * 0.5, hy - hw * 0.35] };
  }

  pos(e) { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  inScene(p) { const S = this.L.S; return p.x >= S.x && p.x <= S.x + S.w && p.y >= S.y && p.y <= S.y + S.h; }
  down(e) {
    const p = this.pos(e);
    if (this.blob && Math.hypot(p.x - this.blob.x, p.y - this.blob.y) < this.blob.r * 1.8) { this.drag = true; this.cv.setPointerCapture(e.pointerId); return; }
    if (!this.inScene(p)) return;
    this.hooks.tap(p.x, p.y);
  }
  move(e) { if (this.drag && this.blob) { const p = this.pos(e); this.blob.x = p.x; this.blob.y = p.y; } }
  up() {
    if (!this.drag || !this.blob) return; this.drag = false;
    const g = this.geom(), b = this.blob;
    if (b.x > g.hx - g.hw * 0.3 && b.x < g.hx + g.hw * 1.4 && b.y > g.hy - g.hw * 1.4 && b.y < g.hy + 20) {
      const r = this.hooks.deliver(); this.burst(b.x, b.y, 34, ['#8fd3ff', '#ffffff', '#ffd23f']); this.float(b.x, b.y - 30, '+' + M.fJ(r), '#7ff0c0', 1.4); this.housePulse = 1; this.blob = null; this.hooks.shake();
    }
  }

  // 외부에서 부르는 연출
  onTap(x, y, v) {
    const g = this.geom();
    this.squash = 1; this.mouth = 1;
    this.float(g.mx + g.ms * 0.9, g.my - g.ms * 1.3, '+' + M.fJ(v), '#ffd84d', 1);
    this.burst(x ?? g.mx, y ?? g.my - g.ms * 0.6, 8);
    this.rings.push({ x: x ?? g.mx, y: y ?? g.my - g.ms * 0.6, life: 0.5 });
    this.launch(1 + Math.min(3, Math.floor(Math.log10(1 + v))), true);
  }
  celebrate(big = false) { const g = this.geom(); this.happy = 2; this.burst(g.mx, g.my - g.ms, big ? 60 : 28, ['#ffd23f', '#ff9fc6', '#9d8bff', '#7fe0ff', '#ffffff']); }
  float(x, y, text, col, life = 1) { this.floats.push({ x, y, text, col, life, max: life }); }
  burst(x, y, n, cols = ['#ffe27a', '#ffb347', '#ff7a45', '#fff6d0']) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 90 + Math.random() * 220; this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.6 + Math.random() * 0.5, c: cols[i % cols.length], r: 2 + Math.random() * 3, star: Math.random() < 0.35 }); }
  }
  launch(n, fromTap = false) {
    const leakP = (1 - M.eta()) * 0.7;
    for (let i = 0; i < n; i++) this.orbs.push({ t: -i * 0.08, sp: 0.55 + Math.random() * 0.3, leak: !fromTap && Math.random() < leakP, off: (Math.random() - 0.5) * 0.4, big: fromTap });
  }
  spawnBlob() { if (this.blob) return; const g = this.geom(); this.blob = { x: g.mx - g.ms * 1.6, y: g.my - g.ms * 1.9, r: g.ms * 0.32, life: 14 }; }

  frame(dt, t) {
    const { ctx, cv } = this, L = this.L; if (!L) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = L.W, H = L.H;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.room.layout(W, H, L.S, dpr);
    const night = M.has('solar') ? Math.max(0, -Math.sin(TAU * (M.simT % 60) / 60)) * 0.6 : 0;
    this.room.draw(ctx, dt, t, night);
    const g = this.geom(), u = g.u;
    this.squash = Math.max(0, this.squash - dt * 5); this.mouth = Math.max(0, this.mouth - dt * 3); this.happy = Math.max(0, this.happy - dt); this.housePulse = Math.max(0, this.housePulse - dt * 1.5);

    // 수입에 비례해 열 방울 발사
    const inc = M.heatRate();
    this.spawnAcc += dt * Math.min(7, 0.6 + 1.1 * Math.log10(1 + inc));
    while (this.spawnAcc > 1) { this.spawnAcc--; this.launch(1); }

    this.drawHouse(ctx, g, t, dt);
    this.drawPedestal(ctx, g, t);
    this.drawConv(ctx, g, t, dt);
    this.drawRad(ctx, g, t);
    const dTL = M.lvl('fourier', 'dT');
    drawFlameBuddy(ctx, g.mx, g.my - g.ms * 0.05, g.ms, t, { squash: this.squash, mouth: this.mouth, heat: Math.min(1, dTL / 20), happy: this.happy > 0.3, look: Math.sin(t * 0.6) });
    // 반짝이 (마스코트 주변)
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * 0.25, rr = g.ms * (1.15 + 0.15 * Math.sin(t * 1.3 + i)); sparkle(ctx, g.mx + Math.cos(a) * rr, g.my - g.ms * 0.75 + Math.sin(a) * rr * 0.85, g.ms * (0.05 + 0.04 * Math.sin(t * 3 + i * 2)), 0.5 + 0.5 * Math.sin(t * 3 + i * 2)); }

    this.drawOrbs(ctx, g, dt);
    this.drawSign(ctx, g);
    this.drawBlob(ctx, g, t, dt);
    this.drawFx(ctx, dt);
    this.room.drawBokeh(ctx, t);
    // 말풍선 위치를 화면 요소에 알려줌
    this.hooks.anchor && this.hooks.anchor(g.mx, g.my - g.ms * 1.95, g.mx + g.ms * 1.1, g.my - g.ms * 1.2);
  }

  drawPedestal(ctx, g, t) {
    const { mx, my, ms } = g, rw = ms * 1.25, rh = ms * 0.26, th = ms * 0.22;
    let gr = ctx.createLinearGradient(0, my, 0, my + th + rh);
    gr.addColorStop(0, '#9b5a3a'); gr.addColorStop(1, '#6b3a26');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(mx, my + th, rw, rh, 0, 0, Math.PI); ctx.lineTo(mx - rw, my); ctx.ellipse(mx, my, rw, rh, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
    gr = ctx.createRadialGradient(mx, my, 0, mx, my, rw);
    gr.addColorStop(0, '#f7c79c'); gr.addColorStop(0.7, '#e2a274'); gr.addColorStop(1, '#c47f55');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(mx, my, rw, rh, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(150,85,50,.35)'; ctx.lineWidth = 1.2;
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(mx, my, rw * i / 4, rh * i / 4, 0, 0, TAU); ctx.stroke(); }
    // 바닥 빛
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    gr = ctx.createRadialGradient(mx, my, 0, mx, my, rw * 1.1); gr.addColorStop(0, `rgba(255,170,80,${0.45 + 0.1 * Math.sin(t * 3)})`); gr.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(mx, my, rw * 1.1, rh * 1.3, 0, 0, TAU); ctx.fill(); ctx.restore();
  }

  drawHouse(ctx, g, t, dt) {
    const { hx, hy, hw } = g, fw = hw * 0.72, sw = hw * 0.28, wh = hw * 0.55, dep = hw * 0.12;
    const fx = hx, fy = hy - wh; // 정면
    const warm = Math.min(1, Math.log10(1 + M.heatRate()) / 7) + this.housePulse * 0.5;
    // 단열층 (직렬): 정면 둘레에 겹겹이
    const sL = M.has('series') ? M.lvl('series', 'Rt') : 0;
    const layerCols = ['#fff2b8', '#ffd98a', '#b9e3ff', '#d6c8ff', '#ffc2d6', '#c8f0d8'];
    for (let i = sL; i >= 1; i--) { const p = i * hw * 0.022; ctx.fillStyle = layerCols[(i - 1) % layerCols.length]; roundRect(ctx, fx - p, fy - p * 0.5, fw + sw + p * 2, wh + p * 0.5, hw * 0.05 + p); ctx.fill(); }
    // 그림자
    ctx.fillStyle = 'rgba(80,40,60,.25)'; ctx.beginPath(); ctx.ellipse(hx + hw * 0.5, hy + 2, hw * 0.62, hw * 0.06, 0, 0, TAU); ctx.fill();
    // 옆면
    ctx.fillStyle = '#e9c9a8'; ctx.beginPath(); ctx.moveTo(fx + fw, fy); ctx.lineTo(fx + fw + sw, fy - dep); ctx.lineTo(fx + fw + sw, hy - dep); ctx.lineTo(fx + fw, hy); ctx.fill();
    // 정면
    let gr = ctx.createLinearGradient(fx, 0, fx + fw, 0); gr.addColorStop(0, '#fff8ec'); gr.addColorStop(1, '#f6e4cc');
    ctx.fillStyle = gr; ctx.fillRect(fx, fy, fw, wh);
    // 지붕 (박공 + 옆 지붕)
    const rh = hw * 0.36;
    ctx.fillStyle = '#b8473c'; ctx.beginPath(); ctx.moveTo(fx + fw / 2, fy - rh); ctx.lineTo(fx + fw / 2 + sw, fy - rh - dep); ctx.lineTo(fx + fw + sw + hw * 0.05, fy - dep + hw * 0.03); ctx.lineTo(fx + fw + hw * 0.05, fy + hw * 0.03); ctx.fill();
    ctx.fillStyle = '#fff8ec'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + fw / 2, fy - rh); ctx.lineTo(fx + fw, fy); ctx.fill();
    ctx.strokeStyle = '#d9584a'; ctx.lineWidth = hw * 0.07; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(fx - hw * 0.04, fy + hw * 0.02); ctx.lineTo(fx + fw / 2, fy - rh); ctx.lineTo(fx + fw + hw * 0.04, fy + hw * 0.02); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = hw * 0.03; ctx.beginPath(); ctx.moveTo(fx + fw / 2, fy - rh - hw * 0.02); ctx.lineTo(fx + fw / 2 + sw, fy - rh - dep - hw * 0.02); ctx.stroke(); ctx.lineCap = 'butt';
    // 지붕 태양판 (햇빛 공식: 면적 레벨만큼, 색은 흡수율 α)
    if (M.has('solar')) {
      const n = Math.min(6, 1 + Math.floor(M.lvl('solar', 'A') / 2)), al = M.P('solar', 'alpha');
      const c = `rgb(${Math.round(240 - al * 220)},${Math.round(245 - al * 215)},${Math.round(255 - al * 190)})`;
      for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, px = fx + fw / 2 + sw * k * 0.95 + hw * 0.03, py = fy - rh - dep * k + (fy + hw * 0.03 - (fy - rh)) * 0.45; ctx.fillStyle = c; ctx.strokeStyle = '#7ab8ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - sw * 0.07, py); ctx.lineTo(px + sw * 0.07, py - dep * 0.07); ctx.lineTo(px + sw * 0.07, py - dep * 0.07 + hw * 0.1); ctx.lineTo(px - sw * 0.07, py + hw * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
    // 굴뚝 + 연기
    const cx = fx + fw / 2 + sw * 0.55, cy = fy - rh * 0.72 - dep * 0.5;
    ctx.fillStyle = '#9c4a3c'; ctx.fillRect(cx, cy - hw * 0.2, hw * 0.1, hw * 0.24); ctx.fillStyle = '#fff'; roundRect(ctx, cx - hw * 0.015, cy - hw * 0.23, hw * 0.13, hw * 0.05, hw * 0.02); ctx.fill();
    if (Math.random() < dt * (1.5 + 4 * warm)) this.smoke.push({ x: cx + hw * 0.05, y: cy - hw * 0.24, r: hw * 0.04, life: 2.6 });
    this.smoke = this.smoke.filter(s => (s.life -= dt) > 0);
    this.smoke.forEach(s => { s.y -= hw * 0.18 * dt; s.x += hw * 0.06 * dt; s.r += hw * 0.035 * dt; ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, s.life / 2.6)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); });
    // 창문 (수입이 늘수록 따뜻하게)
    for (const k of [0.13, 0.57]) {
      const wx = fx + fw * k, wy = fy + wh * 0.18, ww = fw * 0.3, whh = wh * 0.36;
      ctx.fillStyle = `rgba(255,${Math.round(205 + 30 * Math.min(1, warm))},${Math.round(120 + 40 * Math.min(1, warm))},${0.35 + 0.65 * Math.min(1, warm)})`;
      ctx.shadowColor = '#ffc86a'; ctx.shadowBlur = hw * 0.25 * Math.min(1.2, warm); roundRect(ctx, wx, wy, ww, whh, hw * 0.02); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#a4553e'; ctx.lineWidth = Math.max(1.2, hw * 0.018); ctx.strokeRect(wx, wy, ww, whh); ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + whh); ctx.moveTo(wx, wy + whh / 2); ctx.lineTo(wx + ww, wy + whh / 2); ctx.stroke();
    }
    ctx.fillStyle = '#b5653f'; roundRect(ctx, fx + fw * 0.38, hy - wh * 0.42, fw * 0.24, wh * 0.42, hw * 0.04); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(fx + fw * 0.56, hy - wh * 0.2, hw * 0.012, 0, TAU); ctx.fill();
    // 열교 발코니: 누설률 β 만큼 빨간 열이 새어 나감
    const b = M.beta();
    if (M.has('bridge')) { const bx = fx + fw + sw * 0.4, by = fy + wh * 0.45 - dep * 0.4;
      ctx.fillStyle = '#c9c4d6'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + hw * 0.22, by - hw * 0.03); ctx.lineTo(bx + hw * 0.22, by - hw * 0.03 + hw * 0.05); ctx.lineTo(bx, by + hw * 0.05); ctx.fill();
      if (M.has('bridge') && M.lvl('bridge', 'beta') > 0) { ctx.fillStyle = '#ffe58a'; ctx.fillRect(bx - hw * 0.015, by - hw * 0.01, hw * 0.035, hw * 0.07); }
      const gl = ctx.createRadialGradient(bx + hw * 0.05, by + hw * 0.02, 0, bx + hw * 0.05, by + hw * 0.02, hw * (0.1 + b * 1.2));
      gl.addColorStop(0, `rgba(255,70,60,${Math.min(0.85, b * 3.5)})`); gl.addColorStop(1, 'rgba(255,70,60,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(bx + hw * 0.05, by + hw * 0.02, hw * (0.1 + b * 1.2), 0, TAU); ctx.fill(); }
    // 제습기 (이슬점): 코일이 이슬점보다 차가우면 물방울이 떨어짐
    if (M.has('cond')) {
      const dx = fx + fw + sw + hw * 0.06, dw = hw * 0.2, dh = hw * 0.3, dy = hy - dh;
      ctx.fillStyle = '#eef6ff'; roundRect(ctx, dx, dy, dw, dh, hw * 0.04); ctx.fill(); ctx.strokeStyle = '#9fc9ef'; ctx.lineWidth = 1.5; ctx.stroke();
      const wr = M.rawOut(M.FMAP.cond); ctx.fillStyle = wr > 0 ? '#3fa7ff' : '#b8c4d8';
      for (let i = 0; i < 3; i++) ctx.fillRect(dx + dw * 0.18, dy + dh * (0.2 + i * 0.16), dw * 0.64, dh * 0.06);
      if (wr > 0 && Math.random() < dt * 4) this.drops.push({ x: dx + dw * 0.5, y: dy + dh, v: 0 });
    }
    this.drops = this.drops.filter(d => d.y < hy + 6);
    this.drops.forEach(d => { d.v += 300 * dt; d.y += d.v * dt; ctx.fillStyle = '#3fa7ff'; ctx.beginPath(); ctx.arc(d.x, d.y, hw * 0.018, 0, TAU); ctx.fill(); });
  }

  drawConv(ctx, g, t, dt) {
    if (!M.has('conv')) return;
    const hL = M.lvl('conv', 'h'), { mx, my, ms } = g;
    ctx.save(); ctx.lineCap = 'round';
    if (hL <= 1) { // 기체 자연대류: 위로 올라가는 공기 줄기
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = ms * 0.04;
      for (let i = 0; i < 3 + hL * 2; i++) { const ph = (t * 0.6 + i / 5) % 1, x0 = mx + (i - 2) * ms * 0.45; ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8; ctx.beginPath(); for (let k = 0; k < 8; k++) { const yy = my - ms * (0.2 + ph * 2.2) - k * ms * 0.07, xx = x0 + Math.sin(k * 0.8 + t * 3) * ms * 0.06; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    } else if (hL === 2) { // 기체 강제대류: 선풍기 + 바람
      const fx = mx - ms * 1.9, fy = my - ms * 0.9, R = ms * 0.38;
      ctx.fillStyle = '#e9edff'; ctx.beginPath(); ctx.arc(fx, fy, R * 1.25, 0, TAU); ctx.fill(); ctx.fillStyle = '#c5cdf2'; ctx.fillRect(fx - R * 0.12, fy, R * 0.24, ms * 0.9); ctx.fillRect(fx - R * 0.6, my - ms * 0.02, R * 1.2, R * 0.2);
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(t * 12); ctx.fillStyle = '#7fb6ff'; for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.ellipse(R * 0.5, 0, R * 0.5, R * 0.22, 0.3, 0, TAU); ctx.fill(); } ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = ms * 0.035;
      for (let i = 0; i < 4; i++) { const ph = (t * 1.6 + i / 4) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI); ctx.beginPath(); ctx.moveTo(fx + R + ph * ms * 1.2, fy - R * 0.6 + i * R * 0.4); ctx.lineTo(fx + R + ph * ms * 1.2 + ms * 0.35, fy - R * 0.6 + i * R * 0.4); ctx.stroke(); }
    } else { // 액체 (자연/강제) → 비등: 받침대 둘레 물결 + 기포
      const boil = hL >= 5, fast = hL >= 4;
      ctx.strokeStyle = `rgba(120,200,255,${0.55})`; ctx.lineWidth = ms * 0.06;
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(mx, my, ms * (1.45 + i * 0.2 + 0.05 * Math.sin(t * (fast ? 8 : 3) + i)), ms * (0.32 + i * 0.05), 0, 0, TAU); ctx.stroke(); }
      if (Math.random() < dt * (boil ? 30 : fast ? 10 : 4)) this.bub.push({ x: mx + (Math.random() - 0.5) * ms * 2.6, y: my, r: ms * (0.04 + Math.random() * (boil ? 0.08 : 0.04)), life: 1.2 });
    }
    this.bub = this.bub.filter(b => (b.life -= dt) > 0);
    ctx.strokeStyle = 'rgba(200,235,255,.9)'; ctx.lineWidth = 1.5;
    this.bub.forEach(b => { b.y -= ms * 0.9 * dt; b.x += Math.sin(b.life * 9) * 0.5; ctx.globalAlpha = Math.min(1, b.life); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); });
    ctx.restore();
  }

  drawRad(ctx, g, t) {
    if (!M.has('rad')) return;
    const T = M.P('rad', 'T'), eps = M.P('rad', 'eps'), u = Math.min(1, (T - 400) / 2200);
    const col = u < 0.35 ? [255, 90 + u * 300, 60] : u < 0.7 ? [255, 200 + (u - 0.35) * 150, 90 + (u - 0.35) * 300] : [255, 250, 200 + (u - 0.7) * 180];
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = g.ms * 0.05;
    for (let i = 0; i < 3; i++) { const ph = (t * 0.45 + i / 3) % 1, r = g.ms * (0.95 + ph * 0.75); ctx.strokeStyle = `rgba(${col.map(Math.round).join(',')},${(1 - ph) * (0.15 + 0.35 * eps)})`; ctx.beginPath(); ctx.arc(g.mx, g.my - g.ms * 0.7, r, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }

  drawOrbs(ctx, g, dt) {
    const sx = g.mx + g.ms * 0.3, sy = g.my - g.ms * 1.3, [ex, ey] = g.door, cx = (sx + ex) / 2, cy = Math.min(sy, ey) - g.ms * 1.3;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    this.orbs = this.orbs.filter(o => {
      o.t += dt * o.sp; if (o.t < 0) return true;
      if (o.leak && o.t > 0.55) { // 새는 열: 아래로 떨어져 사라짐
        o.lx ??= null; if (o.lx === null) { const k = 0.55; o.lx = (1 - k) ** 2 * sx + 2 * (1 - k) * k * cx + k * k * ex; o.ly = (1 - k) ** 2 * sy + 2 * (1 - k) * k * cy + k * k * ey; o.vy = 0; }
        o.vy += 400 * dt; o.ly += o.vy * dt; const a = Math.max(0, 1 - (o.t - 0.55) * 2.5);
        const gr = ctx.createRadialGradient(o.lx, o.ly, 0, o.lx, o.ly, g.ms * 0.12); gr.addColorStop(0, `rgba(255,90,80,${a})`); gr.addColorStop(1, 'rgba(255,60,60,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(o.lx, o.ly, g.ms * 0.12, 0, TAU); ctx.fill(); return a > 0;
      }
      if (o.t >= 1) { this.housePulse = Math.min(1, this.housePulse + 0.15); return false; }
      const k = o.t, x = (1 - k) ** 2 * sx + 2 * (1 - k) * k * cx + k * k * ex, y = (1 - k) ** 2 * sy + 2 * (1 - k) * k * (cy + o.off * g.ms) + k * k * ey;
      const r = g.ms * (o.big ? 0.17 : 0.11);
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2); gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(0.35, 'rgba(255,190,90,.9)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, TAU); ctx.fill();
      return true;
    });
    ctx.restore();
  }

  drawSign(ctx, g) {
    // 나무 표지판: 레벨업까지 남은 열
    const li = M.levelInfo(), x = g.hx - g.hw * 0.62, base = g.hy, w = Math.max(70, g.hw * 0.62), h = Math.max(34, g.hw * 0.3), top = base - g.hw * 0.62;
    ctx.fillStyle = '#7a4a30'; ctx.fillRect(x + w / 2 - 3, top + h - 4, 6, base - top - h + 4);
    let gr = ctx.createLinearGradient(0, top, 0, top + h); gr.addColorStop(0, '#b97a4f'); gr.addColorStop(1, '#8e5534');
    ctx.fillStyle = gr; roundRect(ctx, x, top, w, h, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(60,30,15,.35)'; ctx.lineWidth = 1; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 5, top + h * i / 3); ctx.lineTo(x + w - 5, top + h * i / 3); ctx.stroke(); }
    ctx.fillStyle = '#fff6e6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(h * 0.26)}px Pretendard, sans-serif`; ctx.fillText('레벨업까지', x + w / 2, top + h * 0.3);
    ctx.font = `800 ${Math.round(h * 0.34)}px Pretendard, sans-serif`; ctx.fillText(M.fJ(Math.max(0, li.toNext)), x + w / 2, top + h * 0.7);
    ctx.textBaseline = 'alphabetic';
  }

  drawBlob(ctx, g, t, dt) {
    const b = this.blob; if (!b) return;
    b.life -= dt; if (b.life <= 0 && !this.drag) { this.blob = null; return; }
    if (this.drag) { ctx.save(); ctx.strokeStyle = `rgba(160,220,255,${0.6 + 0.3 * Math.sin(t * 8)})`; ctx.setLineDash([8, 7]); ctx.lineWidth = 3; roundRect(ctx, g.hx - g.hw * 0.3, g.hy - g.hw * 1.35, g.hw * 1.65, g.hw * 1.4, 18); ctx.stroke(); ctx.restore(); }
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(b.x, b.y - b.r * 0.2, b.r * 1.6, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, b.life) / 14); ctx.stroke(); ctx.restore();
    drawFlameBuddy(ctx, b.x, b.y + b.r * 0.75, b.r, t * 1.6, { squash: this.drag ? 0.3 : 0, mouth: this.drag ? 0.6 : 0 });
    if (!this.drag) { // 집 쪽 화살표
      const ax = b.x + b.r * 2.2 + Math.sin(t * 6) * 5, ay = b.y;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(ax + 16, ay); ctx.lineTo(ax, ay - 10); ctx.lineTo(ax, ay - 4); ctx.lineTo(ax - 14, ay - 4); ctx.lineTo(ax - 14, ay + 4); ctx.lineTo(ax, ay + 4); ctx.lineTo(ax, ay + 10); ctx.closePath(); ctx.fill();
    }
  }

  drawFx(ctx, dt) {
    this.rings = this.rings.filter(r => (r.life -= dt) > 0);
    this.rings.forEach(r => { ctx.strokeStyle = `rgba(255,220,140,${r.life * 2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, (0.5 - r.life) * 110 + 10, 0, TAU); ctx.stroke(); });
    this.sparks = this.sparks.filter(s => (s.life -= dt) > 0);
    this.sparks.forEach(s => { s.vy += 420 * dt; s.x += s.vx * dt; s.y += s.vy * dt; const a = Math.min(1, s.life * 2); if (s.star) sparkle(ctx, s.x, s.y, s.r * 2, a, s.c); else { ctx.globalAlpha = a; ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; } });
    this.floats = this.floats.filter(f => (f.life -= dt) > 0);
    this.floats.forEach(f => {
      const age = f.max - f.life; f.y -= 42 * dt;
      const sc = age < 0.15 ? 0.5 + age / 0.15 * 0.7 : 1.2 - Math.min(0.2, (age - 0.15));
      ctx.save(); ctx.translate(f.x, f.y); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, f.life * 2.5);
      ctx.font = '800 28px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255,170,60,.8)'; ctx.shadowBlur = 16; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(120,50,20,.55)'; ctx.strokeText(f.text, 0, 0);
      const gr = ctx.createLinearGradient(0, -22, 0, 4); gr.addColorStop(0, '#fff6c2'); gr.addColorStop(1, f.col); ctx.fillStyle = gr; ctx.fillText(f.text, 0, 0);
      ctx.restore();
    });
  }
}
