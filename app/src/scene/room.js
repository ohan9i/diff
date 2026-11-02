/* 배경 일러스트: 노을 지는 창가 방.
   정적인 층(하늘, 도시, 창틀·책상·소품)은 화면 크기가 바뀔 때만 오프스크린 캔버스에 그리고,
   구름·보케·도시 불빛 깜빡임만 매 프레임 그린다. */
import { roundRect } from '../game/core.js';

const off = () => document.createElement('canvas');
function mk(w, h, dpr) { const c = off(); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr); const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, x]; }
// 고정 시드 난수 (매번 같은 도시 모양)
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export class Room {
  constructor() { this.key = ''; this.clouds = []; this.bokeh = []; }

  layout(W, H, scene, dpr) {
    const key = [W, H, scene.x, scene.y, scene.w, scene.h, dpr].map(Math.round).join(',');
    if (key === this.key) return; this.key = key;
    this.W = W; this.H = H; this.S = scene; this.dpr = dpr;
    const u = Math.min(scene.w, scene.h * 1.5) / 100; this.u = u;
    this.deskY = scene.y + scene.h * 0.8;
    this.horizon = this.deskY - scene.h * 0.05;
    this.paintSky(); this.paintCity(); this.paintFront();
    const r = rng(7);
    this.clouds = Array.from({ length: 7 }, (_, i) => ({ x: r() * W, y: this.horizon * (0.12 + r() * 0.5), s: (0.7 + r() * 0.9) * u * 9, v: 3 + r() * 5, seed: i }));
    this.bokeh = Array.from({ length: 16 }, () => ({ x: r() * W, y: r() * H, r: (6 + r() * 26) * u * 0.25, ph: r() * 6, warm: r() < 0.6 }));
  }

  paintSky() {
    const { W, H, dpr, horizon } = this;
    const [c, x] = mk(W, H, dpr); this.sky = c;
    const g = x.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, '#4d5cc4'); g.addColorStop(0.35, '#8a82d6'); g.addColorStop(0.62, '#d9a1cf'); g.addColorStop(0.84, '#ffbf97'); g.addColorStop(1, '#ffe0ae');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // 지평선의 해 번짐
    const sx = W * 0.56, sy = horizon * 0.98;
    const sg = x.createRadialGradient(sx, sy, 0, sx, sy, Math.max(W, H) * 0.55);
    sg.addColorStop(0, 'rgba(255,236,190,.95)'); sg.addColorStop(0.12, 'rgba(255,200,150,.55)'); sg.addColorStop(0.45, 'rgba(255,160,170,.12)'); sg.addColorStop(1, 'rgba(255,160,170,0)');
    x.fillStyle = sg; x.fillRect(0, 0, W, H);
  }

  paintCity() {
    const { W, H, dpr, horizon, u } = this;
    const [c, x] = mk(W, H, dpr); this.city = c;
    const r = rng(42);
    this.lights = [];
    const layer = (col, hMin, hMax, wMin, wMax, lit) => {
      let px = -20;
      while (px < W + 20) {
        const bw = (wMin + r() * (wMax - wMin)) * u, bh = (hMin + r() * (hMax - hMin)) * u;
        x.fillStyle = col; x.fillRect(px, horizon - bh, bw, bh + 4);
        if (r() < 0.3) x.fillRect(px + bw * 0.4, horizon - bh - 2.2 * u, bw * 0.15, 2.2 * u); // 안테나
        if (lit) for (let yy = horizon - bh + 1.6 * u; yy < horizon - u; yy += 1.9 * u) for (let xx = px + 0.9 * u; xx < px + bw - 0.9 * u; xx += 1.6 * u) if (r() < 0.22) this.lights.push([xx, yy, r() * 6]);
        px += bw + r() * 1.2 * u;
      }
    };
    layer('rgba(150,135,210,.55)', 8, 20, 4, 9, false);
    layer('#7464b8', 4, 13, 3, 8, true);
    // 지평선 안개
    const fg = x.createLinearGradient(0, horizon - 6 * u, 0, horizon);
    fg.addColorStop(0, 'rgba(255,200,190,0)'); fg.addColorStop(1, 'rgba(255,205,185,.55)');
    x.fillStyle = fg; x.fillRect(0, horizon - 6 * u, W, 6 * u);
  }

  paintFront() {
    const { W, H, dpr, S, u, deskY } = this;
    const [c, x] = mk(W, H, dpr); this.front = c;
    // 창틀: 바깥 벽 + 세로/가로 창살
    const frame = '#3b316f', frameHi = '#5b4d9c';
    x.fillStyle = frame;
    const bar = (bx, by, bw, bh) => { x.fillStyle = frame; x.fillRect(bx, by, bw, bh); x.fillStyle = frameHi; x.fillRect(bx, by, Math.max(1.5, bw * 0.18), bh); };
    const cols = W > 900 ? [0.02, 0.24, 0.5, 0.76, 0.98] : [0.02, 0.5, 0.98];
    cols.forEach(f => bar(W * f - 1.1 * u, 0, 2.2 * u, deskY));
    x.fillStyle = frame; x.fillRect(0, S.y + S.h * 0.08, W, 1.6 * u); x.fillStyle = frameHi; x.fillRect(0, S.y + S.h * 0.08, W, 0.4 * u);
    // 창턱 겸 넓은 나무 책상 (원근감 있는 윗면이 화면 아래까지 이어짐)
    const top = deskY - Math.max(14, S.h * 0.07) * 0.2;
    let g = x.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, '#f6cfa6'); g.addColorStop(0.08, '#e9b48a'); g.addColorStop(0.45, '#c98a62');
    g.addColorStop(0.8, '#a2674a'); g.addColorStop(1, '#7c4b3a');
    x.fillStyle = g; x.fillRect(0, top, W, H - top);
    // 판자 이음새: 아래로 갈수록 간격이 넓어짐 (원근)
    let yy = top + 3 * u, gap = 2.2 * u;
    while (yy < H) {
      x.fillStyle = 'rgba(90,45,30,.16)'; x.fillRect(0, yy, W, Math.max(1, gap * 0.05));
      x.fillStyle = 'rgba(255,235,210,.14)'; x.fillRect(0, yy + Math.max(1, gap * 0.05), W, Math.max(1, gap * 0.04));
      yy += gap; gap *= 1.35;
    }
    // 소실점으로 모이는 세로 이음새
    const vx = W / 2, vy = top - H * 0.9;
    x.strokeStyle = 'rgba(90,45,30,.09)'; x.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      const bx = vx + i * W * 0.17; const t0 = (top - vy) / (H - vy);
      x.beginPath(); x.moveTo(vx + (bx - vx) * t0, top); x.lineTo(bx, H); x.stroke();
    }
    // 결 무늬
    const r = rng(19);
    for (let i = 0; i < 90; i++) {
      const gy = top + Math.pow(r(), 0.8) * (H - top), gl = (20 + r() * 80) * u * (0.4 + (gy - top) / (H - top));
      const gx = r() * W;
      x.strokeStyle = `rgba(${r() < 0.5 ? '120,60,40' : '255,230,200'},${0.05 + r() * 0.06})`;
      x.lineWidth = Math.max(1, 0.25 * u * (0.5 + (gy - top) / (H - top)));
      x.beginPath(); x.moveTo(gx, gy); x.bezierCurveTo(gx + gl * 0.3, gy - 0.6 * u, gx + gl * 0.6, gy + 0.6 * u, gx + gl, gy); x.stroke();
    }
    // 창에서 들어오는 노을빛 반사
    const rg = x.createRadialGradient(W * 0.38, top, 0, W * 0.38, top, Math.max(W, H) * 0.45);
    rg.addColorStop(0, 'rgba(255,214,160,.55)'); rg.addColorStop(0.5, 'rgba(255,190,140,.12)'); rg.addColorStop(1, 'rgba(255,190,140,0)');
    x.fillStyle = rg; x.fillRect(0, top, W, H - top);
    // 창턱 앞 모서리 하이라이트 + 그림자
    x.fillStyle = 'rgba(255,245,230,.75)'; x.fillRect(0, top, W, 2);
    g = x.createLinearGradient(0, top, 0, top + 4 * u); g.addColorStop(0, 'rgba(80,40,60,.18)'); g.addColorStop(1, 'rgba(80,40,60,0)');
    x.fillStyle = g; x.fillRect(0, top + 2, W, 4 * u);
    // 가장자리 비네트
    g = x.createLinearGradient(0, H - (H - top) * 0.5, 0, H); g.addColorStop(0, 'rgba(40,24,50,0)'); g.addColorStop(1, 'rgba(40,24,50,.45)');
    x.fillStyle = g; x.fillRect(0, top, W, H - top);
    // 창에 비친 빛 줄기
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const bx = W * (0.3 + i * 0.18);
      const lg = x.createLinearGradient(bx, 0, bx + 30 * u, deskY);
      lg.addColorStop(0, 'rgba(255,220,200,0)'); lg.addColorStop(0.6, 'rgba(255,220,200,.05)'); lg.addColorStop(1, 'rgba(255,220,200,0)');
      x.fillStyle = lg; x.beginPath(); x.moveTo(bx, 0); x.lineTo(bx + 8 * u, 0); x.lineTo(bx + 34 * u, deskY); x.lineTo(bx + 22 * u, deskY); x.fill();
    }
    x.restore();
    this.paintPlant(x, S.x - 2 * u, deskY, u);
    this.paintBooks(x, S.x + S.w * 0.04, deskY + 0.6 * u, u);
    // 세로 화면: 캔버스 아래 끝을 페이지 배경색으로 자연스럽게 이어줌
    const tall = H - (S.y + S.h) > S.h * 0.3;
    if (tall) {
      const fh = Math.min(120, (H - deskY) * 0.4);
      g = x.createLinearGradient(0, H - fh, 0, H); g.addColorStop(0, 'rgba(41,35,79,0)'); g.addColorStop(1, 'rgba(41,35,79,1)');
      x.fillStyle = g; x.fillRect(0, H - fh, W, fh);
    }
    // 앞쪽 흐린 잎사귀 (전경)
    x.save(); try { x.filter = `blur(${Math.round(3 * u)}px)`; } catch (e) { /* 미지원 */ }
    if (!tall) this.leafCluster(x, -4 * u, H + 2 * u, 1.5 * u, '#2c5a48', 7);
    
    x.restore();
  }

  leaf(x, cx, cy, len, wid, ang, col, vein = true) {
    x.save(); x.translate(cx, cy); x.rotate(ang);
    const g = x.createLinearGradient(0, -wid, 0, wid); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
    x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * 0.5, -wid, len, 0); x.quadraticCurveTo(len * 0.5, wid, 0, 0); x.fill();
    if (vein) { x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = Math.max(1, wid * 0.08); x.beginPath(); x.moveTo(len * 0.05, 0); x.lineTo(len * 0.9, 0); x.stroke(); }
    x.restore();
  }
  leafCluster(x, cx, cy, s, col, n) { for (let i = 0; i < n; i++) { const a = -Math.PI * (0.15 + 0.7 * i / (n - 1)); this.leaf(x, cx, cy, 26 * s, 7 * s, a, [col, col], false); } }

  paintPlant(x, px, deskY, u) {
    // 화분
    const pw = 12 * u, ph = 10 * u, py = deskY - ph;
    const g = x.createLinearGradient(px, 0, px + pw, 0); g.addColorStop(0, '#f2a27a'); g.addColorStop(1, '#c46a4d');
    x.fillStyle = g; x.beginPath(); x.moveTo(px, py); x.lineTo(px + pw, py); x.lineTo(px + pw * 0.86, deskY); x.lineTo(px + pw * 0.14, deskY); x.fill();
    x.fillStyle = '#d98060'; roundRect(x, px - u * 0.6, py - u * 1.4, pw + u * 1.2, u * 2, u * 0.8); x.fill();
    // 잎
    const base = [px + pw / 2, py];
    const leaves = [[-2.2, 34, 9], [-1.9, 30, 8], [-1.6, 36, 9], [-1.35, 32, 8], [-1.15, 26, 7], [-2.5, 26, 7], [-0.95, 22, 6], [-1.75, 22, 6]];
    leaves.forEach(([a, l, w], i) => this.leaf(x, base[0], base[1], l * u * 0.8, w * u * 0.8, a, i % 2 ? ['#5fb48a', '#2f7a5c'] : ['#4ea27b', '#256a50']));
  }

  paintBooks(x, bx, by, u) {
    const books = [['#b8a8f0', '#8f7fd6', 22, 4.2], ['#ffe7c4', '#e8c79c', 20, 3.8], ['#86a6f0', '#5f7fd0', 23, 4.4]];
    let y = by;
    books.forEach(([c1, c2, w, h], i) => {
      const bw = w * u, bh = h * u, xx = bx + (i % 2) * u * 1.2;
      y -= bh;
      x.fillStyle = c2; roundRect(x, xx, y, bw, bh, u * 0.8); x.fill();
      x.fillStyle = c1; roundRect(x, xx, y, bw, bh * 0.82, u * 0.8); x.fill();
      x.fillStyle = '#fffaf0'; x.fillRect(xx + bw - u * 1.6, y + bh * 0.18, u * 1.2, bh * 0.6);
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(xx + u * 2, y + bh * 0.3, bw * 0.5, u * 0.4);
    });
    this.mugAt = [bx + 5 * u, y];
  }

  drawMug(ctx, t) {
    // 머그컵 (얼굴 있음) + 김
    const u = this.u, [mx, my] = this.mugAt, mw = 11 * u, mh = 10 * u, top = my - mh;
    ctx.fillStyle = '#c9a5d8'; ctx.beginPath(); ctx.ellipse(mx + mw / 2, my, mw * 0.72, u * 1.4, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#f1ecfa'; ctx.lineWidth = u * 1.5; ctx.beginPath(); ctx.arc(mx + mw, top + mh * 0.45, mh * 0.26, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    const g = ctx.createLinearGradient(mx, 0, mx + mw, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#f3effa'); g.addColorStop(1, '#d9d0ea');
    ctx.fillStyle = g; roundRect(ctx, mx, top, mw, mh, u * 2.2); ctx.fill();
    ctx.fillStyle = '#e9e2f5'; ctx.beginPath(); ctx.ellipse(mx + mw / 2, top + u * 0.4, mw / 2 - u * 0.2, u * 1.1, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a4c3a'; ctx.beginPath(); ctx.ellipse(mx + mw / 2, top + u * 0.5, mw / 2 - u * 1.1, u * 0.6, 0, 0, 7); ctx.fill();
    const blink = (t % 5) < 0.12;
    ctx.fillStyle = '#3a2f5a';
    for (const d of [-1, 1]) { const ex = mx + mw / 2 + d * mw * 0.18, ey = top + mh * 0.5; if (blink) ctx.fillRect(ex - u * 0.5, ey, u, u * 0.25); else { ctx.beginPath(); ctx.arc(ex, ey, u * 0.55, 0, 7); ctx.fill(); } }
    ctx.fillStyle = 'rgba(255,120,150,.45)'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(mx + mw / 2 + d * mw * 0.3, top + mh * 0.63, u * 0.9, u * 0.5, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#3a2f5a'; ctx.lineWidth = u * 0.35; ctx.beginPath(); ctx.arc(mx + mw / 2, top + mh * 0.58, u * 0.7, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = u * 0.6; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) { ctx.beginPath(); const sx = mx + mw * (0.38 + i * 0.25); for (let k = 0; k <= 10; k++) { const yy = top - u - k * u * 0.7, xx = sx + Math.sin(t * 2 + k * 0.6 + i) * u * 0.8; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.lineCap = 'butt';
  }

  drawCloud(ctx, c) {
    const s = c.s, puffs = [[0, 0, 1], [0.9, 0.1, 0.8], [-0.9, 0.15, 0.75], [0.4, -0.45, 0.8], [-0.35, -0.35, 0.7], [1.6, 0.25, 0.55], [-1.6, 0.3, 0.5]];
    const g = ctx.createLinearGradient(0, c.y - s, 0, c.y + s * 0.8);
    g.addColorStop(0, 'rgba(255,236,240,.95)'); g.addColorStop(0.6, 'rgba(240,190,215,.85)'); g.addColorStop(1, 'rgba(190,160,220,.7)');
    ctx.fillStyle = g; ctx.beginPath();
    puffs.forEach(([dx, dy, r]) => { ctx.moveTo(c.x + dx * s + r * s, c.y + dy * s); ctx.arc(c.x + dx * s, c.y + dy * s, r * s, 0, 7); });
    ctx.fill();
  }

  draw(ctx, dt, t, night = 0) {
    const { W, H } = this;
    ctx.drawImage(this.sky, 0, 0, W, H);
    if (night > 0.01) { ctx.fillStyle = `rgba(30,30,90,${0.45 * night})`; ctx.fillRect(0, 0, W, this.horizon); }
    this.clouds.forEach(c => { c.x += c.v * dt; if (c.x - c.s * 3 > W) c.x = -c.s * 3; this.drawCloud(ctx, c); });
    ctx.drawImage(this.city, 0, 0, W, H);
    ctx.fillStyle = '#ffd98a';
    this.lights.forEach(([x, y, ph]) => { ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 0.8 + ph) * (0.5 + night); ctx.fillRect(x, y, this.u * 0.55, this.u * 0.75); });
    ctx.globalAlpha = 1;
    ctx.drawImage(this.front, 0, 0, W, H);
    this.drawMug(ctx, t);
  }

  drawBokeh(ctx, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    this.bokeh.forEach(b => {
      const a = 0.05 + 0.05 * Math.sin(t * 0.7 + b.ph);
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, b.warm ? `rgba(255,200,150,${a})` : `rgba(170,170,255,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    });
    ctx.restore();
  }
}
