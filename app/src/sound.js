/* 짧은 효과음 (Web Audio로 직접 합성, 파일 없음) */
let ac = null, muted = false;
try { muted = localStorage.getItem('heat-mute') === '1'; } catch (e) { /* 무시 */ }
function ctx() { if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); } if (ac.state === 'suspended') ac.resume(); return ac; }
function tone(freq, dur = 0.12, type = 'sine', vol = 0.12, when = 0, slide = 0) {
  if (muted) return; const a = ctx(); if (!a) return;
  const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
export const sfx = {
  tap: () => tone(520 + Math.random() * 80, 0.09, 'triangle', 0.08, 0, 1.6),
  buy: () => { tone(660, 0.1, 'triangle', 0.1); tone(990, 0.14, 'triangle', 0.09, 0.07); },
  unlock: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, i * 0.09)),
  coin: () => { tone(1320, 0.08, 'square', 0.04); tone(1760, 0.12, 'square', 0.04, 0.06); },
  wrong: () => tone(220, 0.25, 'sawtooth', 0.05, 0, 0.7),
  pop: () => tone(880, 0.06, 'sine', 0.06, 0, 0.5),
};
export const isMuted = () => muted;
export function setMuted(m) { muted = m; try { localStorage.setItem('heat-mute', m ? '1' : '0'); } catch (e) { /* 무시 */ } }
