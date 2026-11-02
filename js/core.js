/* ===========================================================
   공통 모듈: 물리 함수, 그래프 도구, UI 도우미
   =========================================================== */
'use strict';

/* ---------------- 물리 상수 / 함수 ---------------- */
const PHYS = {
  sigma: 5.67e-8,        // Stefan-Boltzmann [W/(m2K4)]
  Rv: 461.5,             // 수증기 기체상수 [J/(kg K)]
  Patm: 101325,          // 대기압 [Pa]
  delta0: 2e-10,         // 공기의 수증기 투과율 [kg/(m s Pa)]
  h: 6.626e-34, c: 2.998e8, kB: 1.381e-23,

  /** 포화수증기압 [Pa] — 강의 경험식 */
  psat(T) {
    return T >= 0
      ? 610.5 * Math.exp(17.269 * T / (237.3 + T))
      : 610.5 * Math.exp(21.875 * T / (265.5 + T));
  },
  /** 수증기압 p [Pa] 로부터 이슬점(포화온도) [°C] */
  dewPoint(p) {
    if (p <= 0) return -100;
    const L = Math.log(p / 610.5);
    return p >= 610.5 ? 237.3 * L / (17.269 - L) : 265.5 * L / (21.875 - L);
  },
  /** 수증기압 → 절대습도 x [g/kg(DA)] */
  xFromP(p, P = 101325) { return 622 * p / (P - p); },
  /** 절대습도 x [g/kg] → 수증기압 [Pa] */
  pFromX(x, P = 101325) { return x * P / (622 + x); },
  /** 수증기 질량농도 v [kg/m3] */
  vapConc(p, T) { return p / (this.Rv * (T + 273.15)); },
  /** 습공기 비엔탈피 [kJ/kg(DA)] */
  enthalpy(T, x) { return 1.006 * T + x / 1000 * (2501 + 1.86 * T); },
  /** 플랑크 법칙: 분광 방사 [W/(m2·μm)], lam [μm] */
  planck(lamUm, T) {
    const lam = lamUm * 1e-6;
    const a = 2 * Math.PI * this.h * this.c * this.c / Math.pow(lam, 5);
    const b = Math.exp(this.h * this.c / (lam * this.kB * T)) - 1;
    return a / b * 1e-6;
  },
};

/* ---------------- 포맷 ---------------- */
function fmt(v, d = 1) {
  if (!isFinite(v)) return '–';
  return Number(v).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtSci(v, d = 2) {
  if (!isFinite(v)) return '–';
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / Math.pow(10, e);
  return `${m.toFixed(d)}×10<sup>${e}</sup>`;
}
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------------- 색상 ---------------- */
const TEMP_STOPS = [
  [0.00, [33, 76, 160]],
  [0.25, [72, 151, 214]],
  [0.50, [240, 240, 236]],
  [0.75, [244, 152, 82]],
  [1.00, [190, 40, 30]],
];
function lerpStops(stops, t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1], [t1, c1] = stops[i];
      const u = (t - t0) / (t1 - t0);
      return c0.map((c, k) => Math.round(c + (c1[k] - c) * u));
    }
  }
  return stops[stops.length - 1][1];
}
function tempRGB(T, tmin, tmax) { return lerpStops(TEMP_STOPS, (T - tmin) / (tmax - tmin || 1)); }
function tempColor(T, tmin, tmax, a = 1) {
  const [r, g, b] = tempRGB(T, tmin, tmax);
  return `rgba(${r},${g},${b},${a})`;
}

/* ---------------- 캔버스 ---------------- */
/** 캔버스를 CSS 크기 × DPR 로 맞추고 ctx 반환 */
function fitCanvas(canvas, height) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || canvas.parentElement.clientWidth || 600;
  const h = height || canvas._h || 300;
  canvas._h = h;
  canvas.style.height = h + 'px';
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function niceTicks(min, max, n = 6) {
  const span = max - min;
  if (span <= 0) return [min];
  const raw = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const ticks = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-6; v += step) ticks.push(+v.toFixed(10));
  return ticks;
}

/**
 * 간단한 선 그래프. spec:
 *  x:[min,max], y:[min,max], xlabel, ylabel, xlog, ylog,
 *  series:[{pts:[[x,y]], color, width, dash, fill:'#rgba', step}],
 *  points:[{x,y,color,r,label}], vlines:[{x,color,label,dash}], hlines:[...],
 *  bands:[{x0,x1,color,label}], texts:[{x,y,text,color,align,baseline}]
 */
class Plot {
  constructor(canvas, height = 300) {
    this.canvas = canvas;
    this.height = height;
    this.spec = null;
    this.pad = { l: 58, r: 16, t: 14, b: 44 };
    new ResizeObserver(() => this.spec && this.draw(this.spec)).observe(canvas);
  }
  sx(x) { const s = this.spec; const [a, b] = s.xlog ? s.x.map(Math.log10) : s.x; const v = s.xlog ? Math.log10(x) : x; return this.pad.l + (v - a) / (b - a) * this.pw; }
  sy(y) { const s = this.spec; const [a, b] = s.ylog ? s.y.map(Math.log10) : s.y; const v = s.ylog ? Math.log10(Math.max(y, 1e-30)) : y; return this.pad.t + (1 - (v - a) / (b - a)) * this.ph; }
  ix(px) { const s = this.spec; const [a, b] = s.xlog ? s.x.map(Math.log10) : s.x; const v = a + (px - this.pad.l) / this.pw * (b - a); return s.xlog ? Math.pow(10, v) : v; }
  iy(py) { const s = this.spec; const [a, b] = s.ylog ? s.y.map(Math.log10) : s.y; const v = a + (1 - (py - this.pad.t) / this.ph) * (b - a); return s.ylog ? Math.pow(10, v) : v; }

  draw(spec) {
    this.spec = spec;
    if (spec.pad) Object.assign(this.pad, spec.pad);
    const { ctx, w, h } = fitCanvas(this.canvas, this.height);
    this.ctx = ctx; this.w = w; this.h = h;
    this.pw = w - this.pad.l - this.pad.r;
    this.ph = h - this.pad.t - this.pad.b;
    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px ' + getComputedStyle(document.body).fontFamily;

    // bands
    (spec.bands || []).forEach(b => {
      ctx.fillStyle = b.color;
      const x0 = this.sx(b.x0), x1 = this.sx(b.x1);
      ctx.fillRect(x0, this.pad.t, x1 - x0, this.ph);
      if (b.label) {
        ctx.fillStyle = b.labelColor || '#5d6679';
        ctx.textAlign = 'center';
        ctx.fillText(b.label, (x0 + x1) / 2, this.pad.t + 14);
      }
    });

    // grid + ticks
    ctx.strokeStyle = '#eceff5'; ctx.lineWidth = 1;
    ctx.fillStyle = '#5d6679';
    const xt = spec.xticks || (spec.xlog ? logTicks(spec.x) : niceTicks(spec.x[0], spec.x[1], spec.nx || 7));
    const yt = spec.yticks || (spec.ylog ? logTicks(spec.y) : niceTicks(spec.y[0], spec.y[1], spec.ny || 6));
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    xt.forEach(v => {
      const X = this.sx(v);
      ctx.beginPath(); ctx.moveTo(X, this.pad.t); ctx.lineTo(X, this.pad.t + this.ph); ctx.stroke();
      ctx.fillText(spec.xfmt ? spec.xfmt(v) : tickLabel(v), X, this.pad.t + this.ph + 6);
    });
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    yt.forEach(v => {
      const Y = this.sy(v);
      ctx.beginPath(); ctx.moveTo(this.pad.l, Y); ctx.lineTo(this.pad.l + this.pw, Y); ctx.stroke();
      ctx.fillText(spec.yfmt ? spec.yfmt(v) : tickLabel(v), this.pad.l - 6, Y);
    });
    ctx.strokeStyle = '#9aa3b5';
    ctx.strokeRect(this.pad.l, this.pad.t, this.pw, this.ph);

    // labels
    ctx.fillStyle = '#3a4357'; ctx.font = '600 12px ' + getComputedStyle(document.body).fontFamily;
    if (spec.xlabel) { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(spec.xlabel, this.pad.l + this.pw / 2, h - 4); }
    if (spec.ylabel) {
      ctx.save(); ctx.translate(13, this.pad.t + this.ph / 2); ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(spec.ylabel, 0, 0); ctx.restore();
    }
    ctx.font = '12px ' + getComputedStyle(document.body).fontFamily;

    ctx.save();
    ctx.beginPath(); ctx.rect(this.pad.l, this.pad.t, this.pw, this.ph); ctx.clip();

    // series
    (spec.series || []).forEach(s => {
      if (!s.pts || s.pts.length < 2) return;
      if (s.fill) {
        ctx.beginPath();
        const base = s.fillTo != null ? this.sy(s.fillTo) : this.pad.t + this.ph;
        ctx.moveTo(this.sx(s.pts[0][0]), base);
        s.pts.forEach(p => ctx.lineTo(this.sx(p[0]), this.sy(p[1])));
        ctx.lineTo(this.sx(s.pts[s.pts.length - 1][0]), base);
        ctx.closePath(); ctx.fillStyle = s.fill; ctx.fill();
      }
      ctx.beginPath();
      s.pts.forEach((p, i) => {
        const X = this.sx(p[0]), Y = this.sy(p[1]);
        if (i === 0) ctx.moveTo(X, Y);
        else if (s.step) { ctx.lineTo(X, this.sy(s.pts[i - 1][1])); ctx.lineTo(X, Y); }
        else ctx.lineTo(X, Y);
      });
      ctx.strokeStyle = s.color || '#333'; ctx.lineWidth = s.width || 2;
      ctx.setLineDash(s.dash || []); ctx.stroke(); ctx.setLineDash([]);
    });

    // v/h lines
    (spec.vlines || []).forEach(l => {
      const X = this.sx(l.x);
      ctx.strokeStyle = l.color || '#888'; ctx.lineWidth = l.width || 1; ctx.setLineDash(l.dash || [4, 4]);
      ctx.beginPath(); ctx.moveTo(X, this.pad.t); ctx.lineTo(X, this.pad.t + this.ph); ctx.stroke(); ctx.setLineDash([]);
      if (l.label) { ctx.fillStyle = l.color || '#555'; ctx.textAlign = l.align || 'left'; ctx.textBaseline = 'top'; ctx.fillText(l.label, X + (l.align === 'right' ? -4 : 4), this.pad.t + (l.dy || 4)); }
    });
    (spec.hlines || []).forEach(l => {
      const Y = this.sy(l.y);
      ctx.strokeStyle = l.color || '#888'; ctx.lineWidth = l.width || 1; ctx.setLineDash(l.dash || [4, 4]);
      ctx.beginPath(); ctx.moveTo(this.pad.l, Y); ctx.lineTo(this.pad.l + this.pw, Y); ctx.stroke(); ctx.setLineDash([]);
      if (l.label) { ctx.fillStyle = l.color || '#555'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(l.label, this.pad.l + this.pw - 4, Y - 2); }
    });

    // points
    (spec.points || []).forEach(p => {
      const X = this.sx(p.x), Y = this.sy(p.y);
      ctx.beginPath(); ctx.arc(X, Y, p.r || 5, 0, Math.PI * 2);
      ctx.fillStyle = p.color || '#e4572e'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
      if (p.label) {
        ctx.fillStyle = p.labelColor || '#1d2433'; ctx.font = '600 12px ' + getComputedStyle(document.body).fontFamily;
        ctx.textAlign = p.align || 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText(p.label, X + (p.align === 'right' ? -8 : p.align === 'center' ? 0 : 8), Y - 6);
        ctx.font = '12px ' + getComputedStyle(document.body).fontFamily;
      }
    });

    (spec.texts || []).forEach(t => {
      ctx.fillStyle = t.color || '#5d6679';
      if (t.bold) ctx.font = '600 12px ' + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = t.align || 'left'; ctx.textBaseline = t.baseline || 'middle';
      ctx.fillText(t.text, this.sx(t.x) + (t.dx || 0), this.sy(t.y) + (t.dy || 0));
      ctx.font = '12px ' + getComputedStyle(document.body).fontFamily;
    });
    ctx.restore();

    if (spec.after) spec.after(ctx, this);
  }
}
function tickLabel(v) {
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(0);
  return String(+v.toPrecision(6));
}
function logTicks([a, b]) {
  const t = [];
  for (let e = Math.floor(Math.log10(a)); e <= Math.ceil(Math.log10(b)); e++) {
    const v = Math.pow(10, e);
    if (v >= a * 0.999 && v <= b * 1.001) t.push(v);
  }
  return t;
}

/* ---------------- 화살표 ---------------- */
function arrow(ctx, x0, y0, x1, y1, color, width = 2, head = 9) {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(ang) * head * 0.6, y1 - Math.sin(ang) * head * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(ang - 0.4), y1 - head * Math.sin(ang - 0.4));
  ctx.lineTo(x1 - head * Math.cos(ang + 0.4), y1 - head * Math.sin(ang + 0.4));
  ctx.closePath(); ctx.fill();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/* ---------------- 슬라이더 바인딩 ---------------- */
/**
 * 페이지 안의 모든 range 입력에 대해 label <b> 값 표시를 자동 갱신하고
 * 변경 시 onChange 호출. 값 읽기는 V(id).
 */
function bindControls(root, onChange) {
  $$('input[type=range]', root).forEach(inp => {
    const lab = inp.closest('.ctrl') && $('label b', inp.closest('.ctrl'));
    const show = () => {
      if (!lab) return;
      const d = inp.dataset.d != null ? +inp.dataset.d : (String(inp.step).includes('.') ? String(inp.step).split('.')[1].length : 0);
      const val = inp.dataset.map ? window[inp.dataset.map](+inp.value) : +inp.value;
      lab.innerHTML = fmt(val, d) + (inp.dataset.u ? ' ' + inp.dataset.u : '');
    };
    inp._show = show;
    show();
    inp.addEventListener('input', () => { show(); onChange && onChange(inp); });
  });
  $$('select, input[type=checkbox], input[type=number]', root).forEach(el => {
    if (el.closest('table.layer-table')) return;
    el.addEventListener('input', () => onChange && onChange(el));
  });
}
function V(id) { const el = document.getElementById(id); return el.type === 'checkbox' ? el.checked : +el.value; }
function setV(id, v) { const el = document.getElementById(id); el.value = v; el._show && el._show(); }

/* ---------------- 공용 재료 DB ---------------- */
// k [W/mK], rho [kg/m3], c [J/kgK], mu [-], color
const MATERIALS = {
  concrete:   { name: '콘크리트',        k: 1.5,   rho: 2300, c: 900,  mu: 120,  color: '#a9adb3' },
  concrete1:  { name: '콘크리트(강의 예제)', k: 1.0, rho: 2300, c: 900,  mu: 120,  color: '#b5b9bf' },
  brick:      { name: '벽돌',            k: 0.7,   rho: 1800, c: 840,  mu: 10,   color: '#c4703f' },
  mortar:     { name: '모르타르/플라스터', k: 0.56,  rho: 1700, c: 1000, mu: 25,   color: '#d8cbb4' },
  gypsum:     { name: '석고보드',         k: 0.25,  rho: 900,  c: 1000, mu: 8,    color: '#ede7da' },
  wood:       { name: '목재',            k: 0.13,  rho: 500,  c: 1600, mu: 50,   color: '#c9a26b' },
  wood1:      { name: '목재(강의 예제)',   k: 0.1,   rho: 500,  c: 1600, mu: 50,   color: '#d1ad78' },
  eps:        { name: 'EPS 단열재',       k: 0.035, rho: 20,   c: 1450, mu: 60,   color: '#f4e04d' },
  xps:        { name: 'XPS 단열재(경질)',  k: 0.03,  rho: 35,   c: 1450, mu: 150,  color: '#f7b2c4' },
  pir:        { name: 'PIR 단열재',       k: 0.02,  rho: 32,   c: 1400, mu: 60,   color: '#f9d77e' },
  mineral:    { name: '미네랄울(연질)',    k: 0.039, rho: 60,   c: 1030, mu: 1,    color: '#e9c46a' },
  facade:     { name: '외장판',           k: 1.5,   rho: 2000, c: 900,  mu: 50,   color: '#8d99ae' },
  vb:         { name: '방습층(PE 필름)',   k: 0.4,   rho: 950,  c: 1800, mu: 400000, color: '#6c5ce7' },
  glass:      { name: '유리',            k: 1.0,   rho: 2500, c: 750,  mu: 1e7,  color: '#a8dadc' },
  steel:      { name: '강철',            k: 50,    rho: 7800, c: 450,  mu: 1e7,  color: '#576574' },
  alu:        { name: '알루미늄',         k: 200,   rho: 2700, c: 900,  mu: 1e7,  color: '#c8d6e5' },
  air:        { name: '정지 공기층',       k: 0.026, rho: 1.2,  c: 1000, mu: 1,    color: '#eaf4fb' },
  water:      { name: '물',              k: 0.6,   rho: 1000, c: 4200, mu: 1,    color: '#74b9ff' },
};
function materialOptions(selected) {
  return Object.entries(MATERIALS).map(([k, m]) => `<option value="${k}" ${k === selected ? 'selected' : ''}>${m.name}</option>`).join('');
}
