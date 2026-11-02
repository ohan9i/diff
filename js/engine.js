/* ===========================================================
   계산 엔진 (강의 공식): U값·온도분포·Glaser 결로·상당외기온도·2D 열교
   =========================================================== */
'use strict';
const ENGINE = {
  wall(layers, { Ti, Te, RHi, RHe }) {
    const Ri = RHi / 100, Re = RHe / 100;
    const Rse = 0.04, Rsi = 0.13, sdS = 0;
    const Ls = layers.map(L => ({ ...L, R: L.d / 1000 / L.k, sd: L.mu * L.d / 1000, name: MATERIALS[L.mat].name }));
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
    // 하위 호환: 함수 끝
  },
  /** 여름 하루 열취득 [Wh/m²] — 상당외기온도 사용 */
  summer(layers, alpha, opt = {}) {
    const { Tm = 31, amp = 5, qmax = 800, qe = 20, ht = 17, eps = 0.9, Ti = 26 } = opt;
    const Rt = 1 / ht + layers.reduce((s, L) => s + L.d / 1000 / L.k, 0) + 0.13;
    const K = 1 / Rt;
    let gain = 0, Tmax = -99;
    for (let i = 0; i < 96; i++) {
      const t = i / 4;
      const Toa = Tm + amp * Math.cos(2 * Math.PI * (t - 15) / 24);
      const qs = qmax * Math.max(0, Math.sin(Math.PI * (t - 6) / 12));
      const Tsol = Toa + alpha / ht * qs - eps / ht * qe;
      Tmax = Math.max(Tmax, Tsol);
      gain += Math.max(0, K * (Tsol - Ti)) * 0.25;
    }
    return { K, Rt, gain, Tmax };
  },
  NX: 180, NY: 120, L: 0.01,
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
};
