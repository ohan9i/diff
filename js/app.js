/* ===========================================================
   라우터 · 애니메이션 루프 · 홈 화면
   =========================================================== */
'use strict';

PAGES['home'] = {
  t: 0,
  init() { bindControls($('#home')); },
  tick(dt) {
    this.t += dt;
    const H = V('homeH') / 100, R = V('homeR');
    const { ctx, w, h } = fitCanvas($('#homeCanvas'), 200);
    ctx.clearRect(0, 0, w, h);
    const tw = w * 0.3, base = h - 20, maxH = h - 50;
    const hl = maxH * H, hr = maxH * 0.25;
    const flow = (hl - hr) / R;
    // 탱크
    [[10, hl, '왼쪽 (높은 포텐셜)'], [w - 10 - tw, hr, '오른쪽 (낮은 포텐셜)']].forEach(([x, lv, lab]) => {
      ctx.fillStyle = 'rgba(46,134,222,.55)'; ctx.fillRect(x, base - lv, tw, lv);
      ctx.strokeStyle = '#1d2433'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, base - maxH); ctx.lineTo(x, base); ctx.lineTo(x + tw, base); ctx.lineTo(x + tw, base - maxH); ctx.stroke();
      ctx.fillStyle = '#5d6679'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(lab, x + tw / 2, base - maxH - 6);
    });
    // 관
    const py = base - 14, pth = Math.max(3, 18 / R * 2.2);
    ctx.fillStyle = '#d7dbe2'; ctx.fillRect(10 + tw, py - pth / 2, w - 20 - 2 * tw, pth);
    ctx.fillStyle = 'rgba(46,134,222,.75)'; ctx.fillRect(10 + tw, py - pth / 2, w - 20 - 2 * tw, pth);
    // 흐름 점
    if (Math.abs(flow) > 0.5) {
      const n = 8, L = w - 20 - 2 * tw;
      ctx.fillStyle = '#fff';
      for (let i = 0; i < n; i++) {
        const f = ((this.t * flow / 40 + i / n) % 1 + 1) % 1;
        ctx.beginPath(); ctx.arc(10 + tw + f * L, py, Math.min(3, pth / 2.5), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = '#1d2433'; ctx.font = '700 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(Math.abs(flow) < 0.5 ? '수위 차 없음 → 흐름 없음' : `흐름 ∝ 수위차 / 저항 = ${fmt(Math.abs(flow), 1)}`, w / 2, 24);
  },
};

const Router = {
  current: null,
  inited: new Set(),
  go() {
    const id = (location.hash || '#home').slice(1);
    const page = document.getElementById(id) ? id : 'home';
    $$('section.page').forEach(s => s.classList.toggle('active', s.id === page));
    $$('.nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + page));
    $('#sidebar').classList.remove('open');
    this.current = page;
    const P = PAGES[page];
    if (P && !this.inited.has(page)) {
      this.inited.add(page);
      try { P.init(); } catch (e) { console.error(page, e); }
    } else if (P && P.update) {
      P.update(); // 숨겨진 상태에서 크기가 0이었던 캔버스 재그리기
    }
    window.scrollTo(0, 0);
  },
};

function renderMath() {
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
      throwOnError: false,
    });
  }
}

window.addEventListener('hashchange', () => Router.go());
window.addEventListener('DOMContentLoaded', () => {
  $('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
  Router.go();
});
window.addEventListener('load', renderMath);

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const P = PAGES[Router.current];
  if (P && P.tick && !document.hidden) {
    try { P.tick(dt); } catch (e) { console.error(e); }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
