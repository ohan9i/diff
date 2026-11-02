/* 퀴즈 · 열교 찾기 · Glaser 결로 위기 (모달 안에서 실행) */
import { useEffect, useRef, useState } from 'react';
import * as M from '../game/model.js';
import { fitCanvas, lerpStops, Plot, PHYS, MATERIALS } from '../game/core.js';
import { ENGINE } from '../game/engine.js';
import { sfx } from '../sound.js';
import { Icon } from './icons.jsx';

export const QUIZ = [
  { f: 'fourier', q: 'ΔT를 2배로 올리면 전도 열류 q는?', o: ['그대로', '2배', '4배', '절반'], a: 1, e: 'q = kΔT/Δx 이므로 ΔT에 비례해서 2배.' },
  { f: 'fourier', q: '벽 두께 Δx를 2배로 하면 q는?', o: ['2배', '절반', '4배', '그대로'], a: 1, e: 'q ∝ 1/Δx 라서 절반. 그래서 단열재는 두꺼울수록 좋아요.' },
  { f: 'fourier', q: '열전도율 k의 단위는?', o: ['W/m²', 'W/(m·K)', 'm²K/W', 'J/kg'], a: 1, e: 'k [W/(m·K)]: 단위 두께·단위 온도차당 흐르는 열.' },
  { f: 'fourier', q: '두께 60 mm, k=0.03 인 단열재의 열저항 R은?', o: ['0.5', '2.0', '0.0018', '18'], a: 1, e: 'R = d/k = 0.06/0.03 = 2.0 m²K/W.' },
  { f: 'parallel', q: '병렬로 연결된 두 경로의 전체 열류는?', o: ['두 열류의 곱', '두 열류의 합', '작은 쪽 열류', '평균'], a: 1, e: '병렬이면 컨덕턴스(1/R)가 더해지고 열류도 더해져요.' },
  { f: 'parallel', q: '단열벽 면적의 5%만 콘크리트가 관통하면?', o: ['영향 거의 없음', '열손실이 크게 늘 수 있다', '열손실이 준다', '5%만 늘어난다'], a: 1, e: '콘크리트 컨덕턴스가 수십 배 커서 작은 면적도 전체 손실을 좌우해요.' },
  { f: 'series', q: '직렬로 쌓인 층들의 전체 열저항은?', o: ['각 R의 합', '각 R의 곱', '가장 큰 R', '1/R의 합'], a: 0, e: 'R_t = R₁ + R₂ + … (직렬은 저항이 더해짐).' },
  { f: 'series', q: '정상상태 다층벽에서 각 층을 지나는 열류 q는?', o: ['층마다 다르다', '모두 같다', '바깥층이 크다', '두꺼운 층이 크다'], a: 1, e: '에너지가 쌓이지 않으니 모든 층에서 같은 q. 대신 R이 큰 층에서 온도가 많이 떨어져요.' },
  { f: 'series', q: 'U값과 총 열저항 R_t의 관계는?', o: ['U = R_t', 'U = 1/R_t', 'U = R_t²', '관계 없음'], a: 1, e: 'U = 1/R_t (표면 열전달 저항까지 포함).' },
  { f: 'conv', q: 'h_c 가 가장 큰 것은?', o: ['기체 자연대류', '기체 강제대류', '액체 강제대류', '비등·응축'], a: 3, e: '비등·응축은 2,500–100,000 W/(m²K).' },
  { f: 'conv', q: '표면에서 유체 속도가 0이 되는 이유는?', o: ['중력', '마찰(점성)', '복사', '압력'], a: 1, e: '점성 때문에 표면에서 v=0, 그래서 경계층이 생겨요.' },
  { f: 'conv', q: '건물 외표면의 h가 내표면보다 큰 이유는?', o: ['바람에 의한 강제대류', '외부가 더 추워서', '복사가 없어서', '재료가 달라서'], a: 0, e: '외표면은 바람 때문에 강제대류, 내표면은 주로 자연대류.' },
  { f: 'bridge', q: '열교가 실내 쪽에 만드는 문제는?', o: ['표면온도 상승', '표면온도 저하 → 결로·곰팡이', '소음', '일사 증가'], a: 1, e: '열이 몰려 빠져나가 내표면이 차가워지고 결로·곰팡이 위험이 커져요.' },
  { f: 'bridge', q: '발코니 슬래브 열교의 해결책이 아닌 것은?', o: ['슬래브 외부 단열', '단열 브레이크 부재', '단열재를 더 두껍게만 하기', '슬래브 분리'], a: 2, e: '열교가 남아 있으면 두꺼운 단열은 소용없어요.' },
  { f: 'rad', q: '절대온도를 2배로 하면 흑체 방사량은?', o: ['2배', '4배', '8배', '16배'], a: 3, e: 'q = σT⁴ 이므로 2⁴ = 16배.' },
  { f: 'rad', q: '키르히호프 법칙은?', o: ['ε = α', 'ρ = τ', 'α + ε = 1', 'ε = 1 − τ'], a: 0, e: '같은 파장에서 방사율 = 흡수율.' },
  { f: 'rad', q: 'Low-e 유리가 겨울에 좋은 이유는?', o: ['가시광을 막아서', '장파를 반사해 실내 열을 지켜서', '자외선만 막아서', '두꺼워서'], a: 1, e: '가시광은 통과, 장파는 반사해서 실내 복사열 손실을 줄여요.' },
  { f: 'solar', q: '상당외기온도를 높이는 요인은?', o: ['흰색 외벽', '큰 일사 흡수율 α', '큰 h_t', '야간'], a: 1, e: 'T_sol = T_oa + αq_sol/h_t … 이므로 α가 크면 올라가요.' },
  { f: 'solar', q: '여름 옥상 열취득을 줄이는 가장 쉬운 방법은?', o: ['검은 방수층', '흰색(고반사) 마감', '창문 크게', '환기 끄기'], a: 1, e: '흡수율 α를 낮추면 상당외기온도가 내려가요.' },
  { f: 'cond', q: '온도는 그대로, 수증기만 늘리면 상대습도는?', o: ['감소', '증가', '그대로', '0'], a: 1, e: 'p_sat(컵 크기)는 그대로, p(물)가 늘어서 φ 증가.' },
  { f: 'cond', q: '응축기에서 물이 나오려면 코일 온도가?', o: ['공기온도보다 높게', '이슬점보다 낮게', '0 °C 이하', '상관없음'], a: 1, e: '이슬점 아래로 내려가야 φ=100%에 도달해 응축돼요.' },
  { f: 'cond', q: '절대습도 x 는?', o: ['온도에 따라 변한다', '건공기 1 kg당 수증기 질량', '항상 100% 이하', '%로 표시'], a: 1, e: 'x [g/kg(DA)] = 수증기 질량 / 건공기 질량.' },
  { f: 'fick', q: 'Fick 법칙에서 μ(투습저항계수)는 항상?', o: ['0보다 작다', '1 이상', '0~1 사이', '음수'], a: 1, e: '정지 공기가 가장 잘 통과시키므로 μ ≥ 1.' },
  { f: 'fick', q: '등가공기층두께 s_d 는?', o: ['μ/d', 'μ·d', 'd/μ', 'μ+d'], a: 1, e: 's_d = μd [m], 열의 R=d/k 에 해당.' },
  { f: 'latent', q: '상변화 중 열을 가하면 온도는?', o: ['계속 오른다', '일정하다', '내려간다', '진동한다'], a: 1, e: '잠열은 결합을 끊는 데 쓰여 온도가 그대로예요.' },
  { f: 'latent', q: '물 1 kg 을 증발시키는 데 필요한 잠열은 약?', o: ['334 kJ', '2265 kJ', '4.2 kJ', '100 kJ'], a: 1, e: '기화 잠열 ≈ 2265 kJ/kg (100 °C). 융해는 334 kJ/kg.' },
  { f: 'glaser', q: '내단열 벽에서 방습층을 둘 위치는?', o: ['단열재의 실내측', '단열재의 외기측', '맨 바깥', '아무 데나'], a: 0, e: '수증기는 따뜻하고 습한 실내에서 오므로 따뜻한 쪽에서 막아요.' },
  { f: 'glaser', q: 'Glaser 선도의 가로축은?', o: ['실제 두께', '등가공기층두께 s_d', '온도', '시간'], a: 1, e: 's_d 축이면 수증기압 분포가 직선이 돼요.' },
];

export function Quiz({ onDone }) {
  const [Q] = useState(() => { const pool = QUIZ.filter(q => M.has(q.f)); return pool[Math.floor(Math.random() * pool.length)]; });
  const [reward] = useState(() => Math.max(40, 30 * M.incomeJ()));
  const [pick, setPick] = useState(null);
  const choose = (i) => {
    if (pick !== null) return; setPick(i);
    if (i === Q.a) { M.earn(reward); M.G.quizRight++; sfx.coin(); } else sfx.wrong();
    onDone && onDone(i === Q.a, reward);
  };
  return (
    <div>
      <div className="m-head"><span className="m-ico"><Icon.quiz /></span><div><div className="m-kick">공식 퀴즈 · 보상 {M.fJ(reward)}</div><h2>{Q.q}</h2></div></div>
      <div className="choices">
        {Q.o.map((o, i) => <button key={i} className={pick === null ? '' : i === Q.a ? 'right' : i === pick ? 'wrong' : 'dim'} onClick={() => choose(i)}><b>{'ABCD'[i]}</b>{o}</button>)}
      </div>
      {pick !== null && <div className={'explain ' + (pick === Q.a ? '' : 'bad')}><b>{pick === Q.a ? '정답!' : '아쉬워요'}</b> {Q.e}</div>}
    </div>
  );
}

export function BridgeGame() {
  const cv = useRef(null), [left, setLeft] = useState(1), [res, setRes] = useState(null);
  const [reward] = useState(() => Math.max(200, 40 * M.incomeJ()));
  useEffect(() => {
    const c = cv.current; const { ctx, w, h } = fitCanvas(c, 240);
    const floors = 3, cols = 4, fh = h / floors;
    const target = { f: 1 + Math.floor(Math.random() * (floors - 1)), side: Math.random() < 0.5 ? 0 : 1 };
    const tx = target.side ? w - 14 : 14, ty = target.f * fh;
    const W = Math.ceil(w), Hh = Math.ceil(h), img = ctx.createImageData(W, Hh);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      let T = 0.15 + 0.05 * Math.sin(x * 0.05) * Math.cos(y * 0.07);
      for (let f = 1; f < floors; f++) T += 0.25 * Math.exp(-((y - f * fh) ** 2) / 30);
      for (let cc = 0; cc < cols; cc++) for (let f = 0; f < floors; f++) { const wx = (cc + 0.5) * w / cols, wy = (f + 0.5) * fh; if (Math.abs(x - wx) < w / cols * 0.22 && Math.abs(y - wy) < fh * 0.25) T += 0.3; }
      T += 0.65 * Math.exp(-(((x - tx) ** 2) + ((y - ty) ** 2)) / 260);
      const [r, g, b] = lerpStops([[0, [20, 20, 90]], [0.3, [120, 30, 140]], [0.55, [230, 60, 50]], [0.8, [255, 180, 40]], [1, [255, 255, 200]]], T);
      const i = (y * W + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
    const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = Hh; tmp.getContext('2d').putImageData(img, 0, 0); ctx.drawImage(tmp, 0, 0, w, h);
    let done = false; const t0 = performance.now();
    const finish = (ok) => {
      done = true; clearInterval(timer);
      ctx.strokeStyle = '#3ddc97'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx, ty, 18, 0, Math.PI * 2); ctx.stroke();
      if (ok) { M.earn(reward); sfx.coin(); } else sfx.wrong();
      setRes(ok);
    };
    const timer = setInterval(() => { const l = 1 - (performance.now() - t0) / 6000; setLeft(Math.max(0, l)); if (l <= 0 && !done) finish(false); }, 100);
    const down = (e) => { if (done) return; const r = c.getBoundingClientRect(); finish(Math.hypot(e.clientX - r.left - tx, e.clientY - r.top - ty) < 30); };
    c.addEventListener('pointerdown', down);
    return () => { clearInterval(timer); c.removeEventListener('pointerdown', down); };
  }, []);
  return (
    <div>
      <div className="m-head"><span className="m-ico"><Icon.camera /></span><div><div className="m-kick">열교 찾기 · 보상 {M.fJ(reward)}</div><h2>가장 뜨겁게 보이는 곳을 6초 안에!</h2></div></div>
      <div className="timer"><i style={{ width: left * 100 + '%' }} /></div>
      <canvas className="mg-canvas" ref={cv} />
      {res !== null && <div className={'explain ' + (res ? '' : 'bad')}><b>{res ? '찾았다!' : '놓쳤어요'}</b> 초록 원이 발코니 슬래브가 벽을 뚫은 모서리예요. 열이 몰려 빠져나가 실내 표면이 차가워지고 결로·곰팡이가 생기기 쉬워요.</div>}
    </div>
  );
}

export function GlaserGame() {
  const cv = useRef(null), plot = useRef(null), [out, setOut] = useState(null);
  const [cfg] = useState(() => ({ Ti: 20, Te: -10 + Math.round(Math.random() * 6), RHi: 55 + Math.round(Math.random() * 15), RHe: 80, reward: Math.max(500, 60 * M.incomeJ()) }));
  useEffect(() => {
    const c = cv.current, H = 210; const { ctx, w } = fitCanvas(c, H);
    const base = [['brick', 200, '벽돌'], ['mineral', 100, '단열재'], ['gypsum', 12.5, '석고']];
    const x0 = 56, x1 = w - 56, widths = [0.38, 0.42, 0.2], xs = [x0]; widths.forEach(f => xs.push(xs[xs.length - 1] + f * (x1 - x0)));
    const cols = ['#d0674a', '#ffe58a', '#efe8dc'];
    ctx.fillStyle = '#7fb6ff'; ctx.fillRect(0, 16, x0, H - 56); ctx.fillStyle = '#ffb38a'; ctx.fillRect(x1, 16, w - x1, H - 56);
    base.forEach((b, i) => { ctx.fillStyle = cols[i]; ctx.fillRect(xs[i], 16, xs[i + 1] - xs[i], H - 56); ctx.fillStyle = '#3b2f5a'; ctx.font = '700 12px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(b[2], (xs[i] + xs[i + 1]) / 2, 34); });
    ctx.font = '800 12px Pretendard, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#2e86de'; ctx.fillText(`← 바깥 ${cfg.Te} °C`, 4, H - 16); ctx.textAlign = 'right'; ctx.fillStyle = '#e0682e'; ctx.fillText(`실내 ${cfg.Ti} °C · 습함 →`, w - 4, H - 16); ctx.textAlign = 'center'; if (w > 420) { ctx.fillStyle = '#8a86b0'; ctx.font = '700 12px Pretendard, sans-serif'; ctx.fillText('A~D 중 하나를 눌러요', w / 2, H - 16); }
    xs.forEach((x, i) => { ctx.fillStyle = '#6c5ce7'; ctx.beginPath(); ctx.arc(x, H / 2, 14, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '800 13px Pretendard, sans-serif'; ctx.fillText(String.fromCharCode(65 + i), x, H / 2 + 4.5); });
    let done = false;
    const down = (e) => {
      if (done) return; const r = c.getBoundingClientRect(), px = e.clientX - r.left;
      let best = 0; xs.forEach((x, i) => { if (Math.abs(px - x) < Math.abs(px - xs[best])) best = i; });
      if (Math.abs(px - xs[best]) > 32) return; done = true;
      const mk = (m, d) => ({ mat: m, d, k: MATERIALS[m].k, mu: MATERIALS[m].mu });
      const Ls = base.map(b => mk(b[0], b[1])); Ls.splice(best, 0, mk('vb', 0.2));
      const res = ENGINE.wall(Ls, cfg), none = ENGINE.wall(base.map(b => mk(b[0], b[1])), cfg), ok = res.cond.length === 0;
      ctx.fillStyle = '#6c5ce7'; ctx.fillRect(xs[best] - 3, 16, 6, H - 56);
      if (ok) { M.G.glaserWins++; M.G.mult = Math.min(3, M.G.mult + 0.1); M.earn(cfg.reward); sfx.unlock(); } else sfx.wrong();
      setOut({ ok, res, none });
    };
    c.addEventListener('pointerdown', down);
    return () => c.removeEventListener('pointerdown', down);
  }, [cfg]);
  useEffect(() => { if (out && plot.current) drawGlaser(plot.current, out.res); }, [out]);
  const gd = (v) => (v * 86400 * 1000).toFixed(1);
  return (
    <div>
      <div className="m-head"><span className="m-ico glaser"><svg viewBox="0 0 24 24"><path d="M12 2.8 19.5 6v5.2c0 4.6-3.2 8.2-7.5 10-4.3-1.8-7.5-5.4-7.5-10V6z" fill="#9d8bff" /><path d="m8.5 12 2.4 2.4 4.6-4.8" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" /></svg></span>
        <div><div className="m-kick">결로 위기 · 실내 {cfg.Ti} °C / {cfg.RHi}% · 외기 {cfg.Te} °C</div><h2>방습층(PE 필름)은 어디에?</h2></div></div>
      <canvas className="mg-canvas light" ref={cv} />
      {out && <div className={'explain ' + (out.ok ? '' : 'bad')}><b>{out.ok ? `정답! 배수 ×${M.G.mult.toFixed(2)}` : `벽 속 결로 ${gd(out.res.gc)} g/(m²·day)`}</b> 방습층이 없으면 {gd(out.none.gc)} g/(m²·day) 결로. 수증기는 따뜻하고 습한 실내에서 오니까 단열재의 따뜻한 쪽(C, D)에서 막아야 해요.</div>}
      {out && <canvas className="mg-canvas light" ref={plot} style={{ marginTop: 10 }} />}
      {out && <div className="legend"><i style={{ background: '#e04848' }} />포화수증기압 p<sub>sat</sub> <i style={{ background: '#2e86de' }} />수증기압 p</div>}
    </div>
  );
}
function drawGlaser(cv, c) {
  const pl = new Plot(cv, 190);
  const xm = c.xn[c.xn.length - 1];
  const s2x = (s) => { for (let i = 0; i < c.Ls.length; i++) if (s <= c.sn[i + 1] + 1e-12) return c.xn[i] + (s - c.sn[i]) / ((c.sn[i + 1] - c.sn[i]) || 1) * (c.xn[i + 1] - c.xn[i]); return xm; };
  const hp = [];
  for (let i = 0; i < c.hull.length - 1; i++) { const A = c.hull[i], B = c.hull[i + 1]; [A.s, ...c.sn.filter(s => s > A.s && s < B.s), B.s].forEach(s => hp.push([s2x(s), A.p + (B.p - A.p) * (s - A.s) / ((B.s - A.s) || 1)])); }
  const sat = c.samp.map(p => [p.x, p.ps]); sat.unshift([0, PHYS.psat(c.Tse)]); sat.push([xm, PHYS.psat(c.Tsi)]);
  pl.draw({ x: [0, xm], y: [0, Math.max(...sat.map(p => p[1])) * 1.1], xlabel: '두께 [mm]', ylabel: 'Pa',
    bands: c.Ls.map((L, i) => ({ x0: c.xn[i], x1: c.xn[i + 1], color: (MATERIALS[L.mat].color) + '40' })),
    series: [{ pts: sat, color: '#e04848', width: 2.5 }, { pts: hp, color: '#2e86de', width: 2.5 }],
    points: c.cond.length ? [{ x: s2x(c.cond[0].s), y: c.cond[0].p, color: '#2e86de', label: '결로!' }] : [] });
}
