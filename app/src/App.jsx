import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, useCallback } from 'react';
import katex from 'katex';
import * as M from './game/model.js';
import { Scene } from './scene/scene.js';
import { VIS } from './scene/visuals.js';
import { Icon, FIcon } from './ui/icons.jsx';
import { Quiz, BridgeGame, GlaserGame } from './ui/Minigames.jsx';
import { sfx, isMuted, setMuted } from './sound.js';

/* ---------- 공식별 이름·색 ---------- */
export const LOOK = {
  fourier: ['전도', '#ff7a45', '#ffb36b'], parallel: ['병렬', '#5b8cff', '#8fd0ff'], series: ['직렬 단열', '#f0a43a', '#ffd88a'],
  conv: ['대류', '#7b5cff', '#c08cff'], bridge: ['열교', '#e0567a', '#ff9db5'], rad: ['복사', '#ff5a4a', '#ffb07a'],
  solar: ['햇빛', '#ffad1f', '#ffe27a'], cond: ['이슬점', '#2c9be6', '#8fd8ff'], fick: ['확산', '#3a6bff', '#8fb4ff'],
  latent: ['잠열', '#ff7a45', '#7fd3ff'], glaser: ['결로', '#6c5ce7', '#a99bff'],
};
const SHORT = {
  'fourier.k': ['k', '재료'], 'fourier.dT': ['ΔT', '온도차'], 'fourier.dx': ['Δx', '두께'], 'fourier.A': ['A', '면적'],
  'parallel.N': ['N', '막대 수'], 'series.Rt': ['R', '단열층'], 'conv.h': ['h', '흐름'], 'conv.dT': ['ΔT', '온도차'], 'conv.A': ['A', '면적'],
  'bridge.beta': ['β', '누설'], 'rad.T': ['T', '온도'], 'rad.eps': ['ε', '표면'], 'rad.A': ['A', '면적'],
  'solar.alpha': ['α', '색'], 'solar.qpk': ['q', '지역'], 'solar.A': ['A', '면적'], 'cond.RH': ['φ', '습도'], 'cond.T2': ['T', '코일'], 'cond.m': ['ṁ', '바람'],
  'fick.dp': ['Δp', '압력차'], 'fick.mu': ['μ', '막'], 'fick.d': ['d', '두께'], 'fick.A': ['A', '면적'], 'latent.eff': ['η', '회수'],
};
const tex = (s, display = false) => { try { return katex.renderToString(s, { throwOnError: false, displayMode: display }); } catch (e) { return s; } };
const mainTex = (f) => f.tex.split(/\\qquad|,\\quad/)[0].replace(/,\s*$/, '');
const why = (p) => p.why.split(':').slice(1).join(':').trim() || p.why;
const TIPS = ['열은 뜨거운 곳에서 차가운 곳으로만 흘러요', '온도차가 클수록 열이 더 많이 흘러요', '얇을수록, 넓을수록 열이 잘 통해요', '직렬은 저항을 더하고, 병렬은 열류를 더해요', '조금만 더 힘내요!', '나를 톡톡 눌러 줘!'];

/* ---------- 10Hz 상태 구독 ---------- */
let ver = 0; const subs = new Set();
const bump = () => { ver++; subs.forEach(f => f()); };
const useTick = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => ver);

/* ---------- 카드 그림 루프 ---------- */
const visCanvases = new Map(); // id -> {cv, st}
const visState = {};

export default function App() {
  useTick();
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [say, setSay] = useState({ text: '안녕! 나를 톡 눌러 줘', id: 0 });
  const [quizOn, setQuizOn] = useState(false);
  const [event, setEvent] = useState(null);
  const [muted, setMute] = useState(isMuted());
  const [ready, setReady] = useState(false);
  const cvRef = useRef(null), stageRef = useRef(null), appRef = useRef(null), sceneRef = useRef(null), bubbleRef = useRef(null), shakeRef = useRef(null);
  const moneyRef = useRef(null), waterRef = useRef(null);

  const toast = useCallback((text, kind = '') => { const id = Math.random(); setToasts(t => [...t.slice(-2), { id, text, kind }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2400); }, []);
  const speak = useCallback((text) => setSay({ text, id: Math.random() }), []);
  const shake = useCallback(() => { const el = shakeRef.current; if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }, []);

  // 게임 시작
  useEffect(() => {
    const r = M.startGame();
    const dbg = new URLSearchParams(location.search).get('open');
    if (dbg && ['quiz', 'bridge', 'glaser', 'dex'].includes(dbg)) setModal({ type: dbg });
    else if (r.fresh || !M.G.seenHelp) setModal({ type: 'help' });
    else if (r.offline) setModal({ type: 'offline', gain: r.offline, minutes: r.minutes });
    setReady(true);
  }, []);

  // 무대(캔버스) 준비
  useEffect(() => {
    if (!ready) return;
    const sc = new Scene(cvRef.current, {
      tap: (x, y) => doTap(x, y),
      deliver: () => { const r = M.deliver(); sfx.coin(); speak('배달 완료! 열은 뜨거운 데서 차가운 데로!'); bump(); return r; },
      shake,
      anchor: (bx, by) => { const b = bubbleRef.current; if (b) { b.style.left = bx + 'px'; b.style.top = by + 'px'; } },
    });
    sceneRef.current = sc;
    const offs = [
      M.on('upgrade', (f, p, ratio) => { (visState[f.id] ||= {}).pop = 1; const s = SHORT[f.id + '.' + p.id] || [p.id, p.label]; speak(`${s[0]} ↑ ${why(p)}`); toast(ratio ? `${s[1]} 업그레이드 · 출력 ×${ratio.toFixed(2)}` : `${s[1]} 업그레이드!`); sfx.buy(); sc.celebrate(); bump(); }),
      M.on('unlock', (f) => { sfx.unlock(); sc.celebrate(true); shake(); setModal({ type: 'unlock', f }); speak(`새 공식 ‘${LOOK[f.id][0]}’ 해금!`); bump(); }),
      M.on('quest', (r) => { sfx.coin(); toast(`목표 달성 보상 +${M.fJ(r)}`, 'gold'); sc.celebrate(); }),
      M.on('ach', (name, r) => { sfx.unlock(); toast(`업적 ‘${name}’ 달성! +${M.fJ(r)}`, 'gold'); sc.celebrate(true); }),
    ];
    return () => offs.forEach(o => o());
  }, [ready]);

  function doTap(x, y) {
    const v = M.tap(); sfx.tap();
    sceneRef.current && sceneRef.current.onTap(x, y, v);
    if (M.G.clicks % 25 === 0) speak(['좋아요! 더 더!', '따뜻해지고 있어요!', '열이 집으로 가고 있어요', '최고예요!'][Math.floor(Math.random() * 4)]);
  }

  // 레이아웃 측정 → 무대에 전달
  useEffect(() => {
    if (!ready) return;
    const measure = () => {
      const app = appRef.current, st = stageRef.current, sc = sceneRef.current; if (!app || !st || !sc) return;
      const ar = app.getBoundingClientRect(), sr = st.getBoundingClientRect();
      const mobile = window.innerWidth < 900;
      const bt = app.querySelector('.bottom');
      const W = ar.width, H = mobile ? Math.round((bt ? bt.getBoundingClientRect().bottom : sr.bottom) - ar.top + 28) : window.innerHeight;
      sc.setLayout({ W, H, S: { x: sr.left - ar.left, y: sr.top - ar.top, w: sr.width, h: sr.height }, mobile });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(appRef.current); ro.observe(stageRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [ready]);

  // 메인 루프
  useEffect(() => {
    if (!ready) return;
    let last = performance.now(), acc = 0, raf, quizT = 30, blobT = 14, evT = 60, saveT = 0, tipT = 10, shownJ = M.G.J, shownW = M.G.Wg, lastLv = M.levelInfo().L;
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now; const t = now / 1000;
      M.advance(dt);
      shownJ = M.G.J < shownJ ? M.G.J : shownJ + (M.G.J - shownJ) * Math.min(1, dt * 8);
      shownW = M.G.Wg < shownW ? M.G.Wg : shownW + (M.G.Wg - shownW) * Math.min(1, dt * 8);
      if (moneyRef.current) moneyRef.current.textContent = M.fJ(shownJ);
      if (waterRef.current) waterRef.current.textContent = M.fG(shownW);
      sceneRef.current && sceneRef.current.frame(dt, t);
      visCanvases.forEach(({ cv }, id) => {
        if (!cv.isConnected || !VIS[id]) return; const r = cv.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || !r.width) return;
        const dpr = Math.min(2, devicePixelRatio || 1), w = r.width, h = r.height;
        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
        VIS[id](ctx, w, h, t, dt, (visState[id] ||= {}));
      });
      acc += dt;
      if (acc > 0.1) {
        acc = 0; bump(); M.checkAch();
        const L = M.levelInfo().L; if (L > lastLv) { lastLv = L; sfx.unlock(); toast(`레벨 업! Lv.${L}`, 'gold'); speak(`레벨 ${L} 달성! 🎉`); sceneRef.current && sceneRef.current.celebrate(true); }
      }
      quizT -= dt; if (quizT <= 0) { quizT = 50 + Math.random() * 30; setQuizOn(true); }
      blobT -= dt; if (blobT <= 0) { blobT = 25 + Math.random() * 25; sceneRef.current && sceneRef.current.spawnBlob(); speak('불덩이를 집으로 끌어다 줘!'); }
      if (M.has('bridge') || M.has('glaser')) { evT -= dt; if (evT <= 0) { evT = 75 + Math.random() * 40; const o = []; if (M.has('bridge')) o.push('bridge'); if (M.has('glaser')) o.push('glaser'); setEvent(o[Math.floor(Math.random() * o.length)]); } }
      tipT -= dt; if (tipT <= 0) { tipT = 14 + Math.random() * 8; speak(TIPS[Math.floor(Math.random() * TIPS.length)]); }
      saveT += dt; if (saveT > 5) { saveT = 0; M.save(); }
      if (!M.G.ended && M.G.life >= 1e12) { M.G.ended = true; setModal({ type: 'end' }); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onHide = () => { if (document.hidden) M.save(); };
    window.addEventListener('beforeunload', M.save); document.addEventListener('visibilitychange', onHide);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('beforeunload', M.save); document.removeEventListener('visibilitychange', onHide); };
  }, [ready]);

  if (!ready) return null;
  const G = M.G, li = M.levelInfo(), inc = M.incomeJ(), q = M.questInfo(), ach = M.achInfo(), nf = M.nextFormula();
  const list = M.FORMULAS.filter(f => M.has(f.id)).reverse();
  const closeModal = () => { if (modal && modal.type === 'help') { G.seenHelp = true; M.save(); } setModal(null); };

  return (
    <div className="app" ref={appRef}>
      <canvas className="scene" ref={cvRef} />
      <div className="shell" ref={shakeRef}>
        <section className="left">
          <header className="topbar">
            <div className="glass dark lvl" onClick={() => setModal({ type: 'help' })} role="button">
              <div className="avatar"><Icon.flame /></div>
              <div><div className="lv">Lv.{li.L}</div><div className="sub">{li.L < 3 ? '열공장 견습생' : li.L < 8 ? '열공장 기술자' : li.L < 14 ? '열공장 공장장' : '열공장 마스터'}</div></div>
            </div>
            <div className="glass dark xp">
              <div className="bar"><i style={{ width: li.pct * 100 + '%' }} /></div>
              <div className="xpnum">{M.fJ(li.cur)} / {M.fJ(li.need)}</div>
            </div>
            <div className="glass dark income">
              <div className="coin"><Icon.flame /></div>
              <div><b ref={moneyRef}>{M.fJ(G.J)}</b><div className="rate">+{M.fW(inc)}</div></div>
              <div className="mini-chart"><Icon.chart /></div>
            </div>
          </header>

          <div className="stage" ref={stageRef}>
            <div className="glass quest" onClick={() => q.done && M.claimQuest()} role="button">
              <div className="q-top"><span className="q-ico"><Icon.target /></span><b>오늘의 목표</b><Icon.chevron className="chev" /></div>
              <div className="q-text">{q.text}</div>
              <div className="q-row"><div className="bar"><i style={{ width: Math.min(1, q.have / q.n) * 100 + '%' }} /></div><span>{q.have} / {q.n}</span><span className={'q-gift ' + (q.done ? 'ready' : '')}><Icon.gift /></span></div>
            </div>
            {G.unlocked.includes('cond') && <div className="glass dark water"><Icon.drop /><div><b ref={waterRef}>{M.fG(G.Wg)}</b><span>+{M.fG(M.waterRate())}/s</span></div></div>}
            <div className="side-btns">
              <button className="glass dark round" onClick={() => setModal({ type: 'dex' })} aria-label="공식 도감"><Icon.book /></button>
              <button className="glass dark round" onClick={() => { setMuted(!muted); setMute(!muted); }} aria-label="소리">{muted ? <Icon.mute /> : <Icon.sound />}</button>
            </div>
            <div className="events">
              {quizOn && <button className="pill-btn quiz" onClick={() => { setQuizOn(false); setModal({ type: 'quiz' }); }}><Icon.quiz />공식 퀴즈</button>}
              {event && <button className="pill-btn event" onClick={() => { setModal({ type: event }); setEvent(null); }}>{event === 'bridge' ? <><Icon.camera />열교 찾기</> : <><Icon.drop />결로 위기</>}</button>}
            </div>
          </div>

          <footer className="bottom">
            <NextCard nf={nf} onOpen={(f) => { if (G.J >= f.cost) M.unlock(f); else toast(`해금까지 ${M.fJ(f.cost - G.J)} 더 필요해요`); }} />
            <div className="center">
              <div className="stats">
                <span className="glass dark stat" title="한 번 탭할 때 버는 열"><Icon.coin />{M.fJ(M.clickValue())}</span>
                <span className="glass dark stat" title="배송 효율 η (직렬 단열·열교로 올림)"><Icon.chart />{(M.eta() * 100).toFixed(1)}%</span>
                <span className="glass dark stat" title="전역 배수 (결로 위기 해결로 올림)"><Icon.star />×{G.mult.toFixed(2)}</span>
              </div>
              <button className="charge" onClick={(e) => { const r = cvRef.current.getBoundingClientRect(), g = sceneRef.current.geom(); doTap(g.mx - r.left * 0, g.my - g.ms * 0.7); }}>
                <span className="orbit" /><Icon.flame className="ci" />
                <span><b>+{M.fJ(M.clickValue())}</b><small>탭해서 충전하기</small></span>
              </button>
            </div>
          </footer>
          <div className="bubble" ref={bubbleRef}><div key={say.id} className="bubble-in">{say.text}</div></div>
        </section>

        <section className="right">
          <div className="cards">
            {list.map(f => <FormulaCard key={f.id} f={f} onInfo={() => setModal({ type: 'info', f })} onPlay={() => setModal({ type: 'glaser' })} />)}
          </div>
          <div className="right-foot">
            <div className="glass ach">
              <span className="a-ico"><Icon.gift /></span>
              <div className="a-main"><div className="a-t">{ach ? <>업적 <b>{ach.name}</b>까지 {Math.floor(ach.pct * 100)}%</> : '모든 업적 달성!'}</div><div className="bar"><i style={{ width: (ach ? ach.pct : 1) * 100 + '%' }} /></div></div>
            </div>
            <div className="glass out-card"><Icon.bolt /><div><b>{M.fW(inc)}</b><span>현재 출력</span></div></div>
          </div>
        </section>
      </div>

      {modal && <Modal onClose={closeModal} kind={modal.type}><ModalBody m={modal} close={closeModal} /></Modal>}
      <div className="toasts">{toasts.map(t => <div key={t.id} className={'toast ' + t.kind}>{t.text}</div>)}</div>
    </div>
  );
}

function NextCard({ nf, onOpen }) {
  if (!nf) return <div className="glass next done"><span className="tile big" style={tileStyle('glaser')}><Icon.trophy /></span><div><div className="k">모든 공식 해금!</div><div className="n">누적 1 TJ 도전</div></div></div>;
  const pct = Math.min(1, M.G.J / nf.cost), ready = pct >= 1;
  return (
    <button className={'glass next ' + (ready ? 'ready' : '')} onClick={() => onOpen(nf)}>
      <span className="ring" style={{ '--p': pct * 100 }}><span className="tile" style={tileStyle(nf.id, !ready)}>{ready ? FIcon[nf.id]() : <Icon.lock />}</span></span>
      <div className="nx"><div className="k">다음 공식{nf.tag === '습기' && !M.has('cond') ? ' · 습기 시작' : ''}</div><div className="n">{LOOK[nf.id][0]}</div><div className="c">{ready ? '눌러서 해금!' : `${M.fJ(nf.cost)} 필요`}</div></div>
      <span className="go"><Icon.chevron /></span>
    </button>
  );
}
const tileStyle = (id, grey) => grey ? { '--c1': '#b9b3d9', '--c2': '#e3def5' } : { '--c1': LOOK[id][1], '--c2': LOOK[id][2] };

function Vis({ id, className }) {
  const ref = useRef(null);
  useEffect(() => { visCanvases.set(id, { cv: ref.current }); return () => visCanvases.delete(id); }, [id]);
  return <canvas className={'vis ' + (className || '')} ref={ref} />;
}

function FormulaCard({ f, onInfo, onPlay }) {
  const out = f.heat ? M.fW(M.rawOut(f) * M.eta() * M.G.mult) : f.water ? M.fG(M.rawOut(f) * M.G.mult) + '/s' : f.id === 'glaser' ? '×' + M.G.mult.toFixed(2) : f.id === 'series' || f.id === 'bridge' ? 'η ' + (M.eta() * 100).toFixed(0) + '%' : f.id === 'parallel' ? '×' + M.P('parallel', 'N') : f.id === 'latent' ? M.fW(M.latentW()) : '';
  const wide = f.params.length >= 3 || f.params.length === 0;
  return (
    <article className={'glass card ' + (wide ? 'wide' : 'narrow')} style={tileStyle(f.id)}>
      <header className="c-head">
        <span className="tile">{FIcon[f.id]()}</span>
        <div className="c-ttl"><div className="c-name">{LOOK[f.id][0]}<button className="qbtn" onClick={onInfo} aria-label="원리 보기">?</button></div><div className="c-eq" dangerouslySetInnerHTML={{ __html: tex(mainTex(f)) }} /></div>
        {out && <span className={'c-out ' + (f.water ? 'w' : '')}>{out}<Icon.up /></span>}
      </header>
      <div className="c-body">
        {wide && <Vis id={f.id} className="top" />}
        {f.params.length > 0 && <div className={'tiles n' + f.params.length}>{f.params.map(p => <Tile key={p.id} f={f} p={p} />)}</div>}
        {!wide && <Vis id={f.id} className="side" />}
        {f.id === 'glaser' && <button className="play" onClick={onPlay}>결로 위기 해결하기</button>}
      </div>
    </article>
  );
}

function Tile({ f, p }) {
  const L = M.lvl(f.id, p.id), Mx = M.maxL(p), cur = f.cur || 'J', s = SHORT[f.id + '.' + p.id] || [p.id, p.label];
  const v = M.param(f, p), next = L < Mx ? (p.values ? p.values[L + 1] : p.fn(L + 1)) : null;
  const nm = p.names ? p.names[Math.min(L, p.names.length - 1)] : null;
  const val = nm ? (next != null ? `${nm} → ${p.names[L + 1]}` : nm) : `${M.num(v)}${next != null ? ' → ' + M.num(next) : ''} ${p.unit}`;
  const cost = L < Mx ? M.upCost(f, p, L) : 0, can = L < Mx && M.canPay(cost, cur), have = cur === 'W' ? M.G.Wg : M.G.J;
  return (
    <button className={'tile-up ' + (L >= Mx ? 'max' : can ? 'can' : '')} disabled={L >= Mx} onClick={() => { if (!M.buy(f, p)) { sfx.wrong(); } }} title={p.label + ' · ' + p.why}>
      <div className="t-sym"><b>{s[0]}</b><span>{s[1]}</span></div>
      <div className="t-val">{val}</div>
      <div className="t-foot">
        {L >= Mx ? <span className="t-cost max">MAX</span> : <span className="t-cost">{cur === 'W' ? <Icon.drop /> : <Icon.flame />}{cur === 'W' ? M.fG(cost) : M.fJ(cost)}</span>}
        {L < Mx && <span className="t-go"><Icon.up /></span>}
      </div>
      {L < Mx && !can && <span className="t-fill" style={{ width: Math.min(100, have / cost * 100) + '%' }} />}
    </button>
  );
}

function Modal({ children, onClose, kind }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return <div className="modal" onPointerDown={(e) => e.target === e.currentTarget && onClose()}><div className={'modal-box glass m-' + kind}><button className="close" onClick={onClose} aria-label="닫기"><Icon.close /></button>{children}</div></div>;
}

function ModalBody({ m, close }) {
  const [resetArm, setArm] = useState(false);
  if (m.type === 'quiz') return <Quiz />;
  if (m.type === 'bridge') return <BridgeGame />;
  if (m.type === 'glaser') return <GlaserGame />;
  if (m.type === 'unlock' || m.type === 'info') {
    const f = m.f;
    return (
      <div className="fx" style={tileStyle(f.id)}>
        <div className="burst">{m.type === 'unlock' && <span className="rays" />}<span className="tile huge">{FIcon[f.id]()}</span></div>
        <div className="m-kick center">{m.type === 'unlock' ? '새 공식 해금!' : f.tag + ' · ' + LOOK[f.id][0]}</div>
        <h2 className="center">{f.name}</h2>
        <div className="formula" dangerouslySetInnerHTML={{ __html: tex(f.tex, true) }} />
        {m.type === 'info' && <div className="subst">{f.subst(M.pvals(f))}</div>}
        <p className="desc" dangerouslySetInnerHTML={{ __html: f.desc }} />
        <button className="cta" onClick={close}>{m.type === 'unlock' ? '좋아요!' : '닫기'}</button>
      </div>
    );
  }
  if (m.type === 'dex') return (
    <div>
      <div className="m-head"><span className="m-ico"><Icon.book /></span><div><div className="m-kick">공식 도감 · {M.G.unlocked.length} / {M.FORMULAS.length}</div><h2>지금까지 모은 공식</h2></div></div>
      <div className="dex-grid">
        {M.FORMULAS.map(f => M.has(f.id)
          ? <div key={f.id} className="dex-it" style={tileStyle(f.id)}><span className="tile">{FIcon[f.id]()}</span><div><b>{LOOK[f.id][0]}</b><div className="c-eq" dangerouslySetInnerHTML={{ __html: tex(mainTex(f)) }} /></div></div>
          : <div key={f.id} className="dex-it lock" style={tileStyle(f.id, true)}><span className="tile"><Icon.lock /></span><div><b>???</b><div className="c-eq">{M.fJ(f.cost)}</div></div></div>)}
      </div>
    </div>
  );
  if (m.type === 'offline') return (
    <div className="fx center"><div className="burst"><span className="rays" /><span className="tile huge" style={tileStyle('fourier')}><Icon.flame /></span></div><div className="m-kick center">다시 왔군요!</div><h2 className="center">+{M.fJ(m.gain)}</h2><p className="desc center">자리를 비운 {m.minutes}분 동안 불꽃이가 열을 모아 뒀어요.</p><button className="cta" onClick={close}>받기</button></div>
  );
  if (m.type === 'end') return (
    <div className="fx center"><div className="burst"><span className="rays" /><span className="tile huge" style={tileStyle('glaser')}><Icon.trophy /></span></div><h2 className="center">열공장 마스터!</h2><p className="desc center">누적 1 TJ 달성. 전도·대류·복사부터 습기와 결로까지 두 강의의 핵심 공식을 모두 손에 넣었어요.</p><button className="cta" onClick={close}>계속하기</button></div>
  );
  // 도움말
  return (
    <div className="help">
      <div className="burst"><span className="rays" /><span className="tile huge" style={tileStyle('fourier')}><Icon.flame /></span></div>
      <h2 className="center">열공장 타이쿤</h2>
      <p className="desc center">불꽃이의 열을 집으로 보내 열(J)을 모으고,<br />공식을 하나씩 해금해 보세요.</p>
      <div className="steps">
        <div><span className="tile sm" style={tileStyle('fourier')}><Icon.flame /></span><b>톡!</b>불꽃이나 충전 버튼을 누르면 열이 모여요</div>
        <div><span className="tile sm" style={tileStyle('parallel')}><Icon.up /></span><b>업그레이드</b>카드의 k·ΔT·A… 를 올리면 그림이 바로 바뀌어요</div>
        <div><span className="tile sm" style={tileStyle('conv')}>{FIcon.series()}</span><b>해금</b>열을 모아 다음 공식을 열어요</div>
        <div><span className="tile sm" style={tileStyle('bridge')}><Icon.gift /></span><b>보너스</b>불덩이 배달 · 퀴즈 · 미니게임</div>
      </div>
      <button className="cta" onClick={close}>시작하기</button>
      <button className={'reset ' + (resetArm ? 'arm' : '')} onClick={() => resetArm ? M.resetGame() : setArm(true)}>{resetArm ? '정말 처음부터? 한 번 더 누르세요' : '처음부터 다시 하기'}</button>
    </div>
  );
}
