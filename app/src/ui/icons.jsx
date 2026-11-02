/* 직접 그린 SVG 아이콘. 이모지 대신 써서 화면 톤을 통일한다. */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const Icon = {
  flame: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <defs>
        <linearGradient id="gFl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe27a" /><stop offset=".55" stopColor="#ff9a3c" /><stop offset="1" stopColor="#ff5a24" /></linearGradient>
      </defs>
      <path d="M12 2.5c.6 3.2 4.9 5.2 4.9 10.3A4.9 4.9 0 0 1 12 21.5a5.4 5.4 0 0 1-5.4-5.6c0-2.6 1.5-4.2 2.6-5.3.3 1.5.9 2.4 1.9 2.9C11 10.6 10.6 6 12 2.5z" fill="url(#gFl)" />
      <path d="M12 12.5c.3 1.6 2.4 2.5 2.4 4.6A2.4 2.4 0 0 1 12 19.6a2.5 2.5 0 0 1-2.5-2.6c0-1.3.9-2.1 1.5-2.6.1.6.4 1 .8 1.2-.2-1 .1-2.2.2-3.1z" fill="#fff4c2" />
    </svg>
  ),
  drop: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <defs><linearGradient id="gDr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a8e4ff" /><stop offset="1" stopColor="#2c8de6" /></linearGradient></defs>
      <path d="M12 2.8C9 7.2 5.8 10.6 5.8 14.6a6.2 6.2 0 0 0 12.4 0c0-4-3.2-7.4-6.2-11.8z" fill="url(#gDr)" />
      <path d="M9.2 14.2a3 3 0 0 0 2.4 3.3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".8" />
    </svg>
  ),
  bolt: (p) => <svg viewBox="0 0 24 24" {...p}><path d="M13.5 2 4.8 13.3h6.1L9.9 22l9.3-12.2h-6.3z" fill="#ffd23f" stroke="#e69a00" strokeWidth="1.2" strokeLinejoin="round" /></svg>,
  star: (p) => <svg viewBox="0 0 24 24" {...p}><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" fill="#ffd23f" stroke="#eaa300" strokeWidth="1.2" strokeLinejoin="round" /></svg>,
  coin: (p) => <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9" fill="#ffc94a" stroke="#e39b12" strokeWidth="1.6" /><circle cx="12" cy="12" r="5.6" fill="none" stroke="#e39b12" strokeWidth="1.4" /><path d="M9.6 9.4a3.4 3.4 0 0 1 3.6-.8" stroke="#fff6d0" strokeWidth="1.4" fill="none" strokeLinecap="round" /></svg>,
  chart: (p) => <svg viewBox="0 0 24 24" {...p}><rect x="4" y="13" width="4" height="7" rx="1.3" fill="#ff9fc6" /><rect x="10" y="9" width="4" height="11" rx="1.3" fill="#9d8bff" /><rect x="16" y="4.5" width="4" height="15.5" rx="1.3" fill="#5fa8ff" /></svg>,
  truck: (p) => <svg viewBox="0 0 24 24" {...p}><rect x="2.5" y="7" width="11" height="9" rx="2" fill="#9d8bff" /><path d="M13.5 10h4l3 3.4V16h-7z" fill="#5fa8ff" /><circle cx="7" cy="17.3" r="2" fill="#2d2a5a" /><circle cx="17" cy="17.3" r="2" fill="#2d2a5a" /></svg>,
  gift: (p) => (
    <svg viewBox="0 0 24 24" {...p}>
      <rect x="3.5" y="10" width="17" height="10.5" rx="2" fill="#ff7aa8" /><rect x="2.5" y="7" width="19" height="4.5" rx="1.6" fill="#ff9ec0" />
      <rect x="10.6" y="7" width="2.8" height="13.5" fill="#ffd23f" />
      <path d="M12 7c-1.4-3.4-5.4-3.6-5.2-1.4C7 7.2 10 7 12 7zm0 0c1.4-3.4 5.4-3.6 5.2-1.4C17 7.2 14 7 12 7z" fill="#ffd23f" stroke="#eaa300" strokeWidth="1" />
    </svg>
  ),
  target: (p) => <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9" fill="#ff6b8b" /><circle cx="12" cy="12" r="6" fill="#fff" /><circle cx="12" cy="12" r="3" fill="#ff6b8b" /><path d="m12 12 7-7m0 0v3.2M19 5h-3.2" stroke="#2d2a5a" strokeWidth="1.8" strokeLinecap="round" fill="none" /></svg>,
  trophy: (p) => <svg viewBox="0 0 24 24" {...p}><path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="#ffd23f" stroke="#e39b12" strokeWidth="1.3" /><path d="M7 6H4.5a3 3 0 0 0 3 4M17 6h2.5a3 3 0 0 1-3 4" stroke="#e39b12" strokeWidth="1.6" fill="none" /><rect x="10.5" y="13.5" width="3" height="3.5" fill="#e39b12" /><rect x="7.5" y="17" width="9" height="3" rx="1" fill="#b77a10" /></svg>,
  book: (p) => <svg viewBox="0 0 24 24" {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" fill="#9d8bff" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A1 1 0 0 1 4 20.5z" fill="#fff" /><path d="M9 7.5h7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  help: (p) => <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9.5" fill="#5fa8ff" /><path d="M9.4 9.4a2.7 2.7 0 1 1 3.6 2.6c-.7.3-1 .8-1 1.5v.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" /><circle cx="12" cy="17.2" r="1.3" fill="#fff" /></svg>,
  sound: (p) => <svg viewBox="0 0 24 24" {...p} {...S}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>,
  mute: (p) => <svg viewBox="0 0 24 24" {...p} {...S}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" /><path d="m16 9.5 5 5m0-5-5 5" /></svg>,
  up: (p) => <svg viewBox="0 0 24 24" {...p} {...S} strokeWidth="2.8"><path d="M12 19V6m-5.5 5.5L12 6l5.5 5.5" /></svg>,
  chevron: (p) => <svg viewBox="0 0 24 24" {...p} {...S} strokeWidth="2.6"><path d="m9 5.5 6.5 6.5L9 18.5" /></svg>,
  lock: (p) => <svg viewBox="0 0 24 24" {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.6" fill="#b9b3d9" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="#b9b3d9" strokeWidth="2.4" fill="none" /><circle cx="12" cy="15.5" r="1.6" fill="#6f68a8" /></svg>,
  close: (p) => <svg viewBox="0 0 24 24" {...p} {...S} strokeWidth="2.6"><path d="m6.5 6.5 11 11m0-11-11 11" /></svg>,
  quiz: (p) => <svg viewBox="0 0 24 24" {...p}><path d="M12 2.8a6.6 6.6 0 0 0-3.7 12.1c.6.4.9 1 .9 1.7v.9h5.6v-.9c0-.7.3-1.3.9-1.7A6.6 6.6 0 0 0 12 2.8z" fill="#ffd23f" stroke="#e39b12" strokeWidth="1.2" /><rect x="9.2" y="18.4" width="5.6" height="2.8" rx="1.2" fill="#9d8bff" /><path d="M10 9.5a2 2 0 0 1 2-2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" /></svg>,
  camera: (p) => <svg viewBox="0 0 24 24" {...p}><rect x="2.5" y="6.5" width="19" height="13" rx="3" fill="#ff7a59" /><path d="M8 6.5 9.4 4h5.2L16 6.5" fill="#ff9e80" /><circle cx="12" cy="13" r="4.2" fill="#2d2a5a" /><circle cx="12" cy="13" r="2.4" fill="#ffd23f" /></svg>,
};

/* 공식 아이콘 (흰 선 그림, 반짝이는 타일 위에 얹힘) */
const W = { fill: 'none', stroke: '#fff', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
export const FIcon = {
  fourier: () => <svg viewBox="0 0 24 24"><g {...W}><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M3.5 9.7h17M3.5 14.3h17M9 5v4.7M15 9.7v4.6M9 14.3V19" /></g></svg>,
  parallel: () => <svg viewBox="0 0 24 24"><g {...W}><path d="M3.5 7h4.2c2.4 0 3.4 1.6 4.3 3.5s1.9 3.5 4.3 3.5h4.2m0 0-2.6-2.6m2.6 2.6-2.6 2.6M3.5 17h4.2c1.2 0 2-.4 2.7-1.1M20.5 7h-4.2c-1.2 0-2 .4-2.7 1.1m6.9-1.1-2.6-2.6m2.6 2.6-2.6 2.6" /></g></svg>,
  series: () => <svg viewBox="0 0 24 24"><g {...W}><path d="m12 3.5 8.5 4.3L12 12 3.5 7.8z" /><path d="m3.5 12 8.5 4.3 8.5-4.3M3.5 16.2l8.5 4.3 8.5-4.3" /></g></svg>,
  conv: () => <svg viewBox="0 0 24 24"><g {...W}><path d="M12 12c0-2 1.6-3 3-3s3.5 1.2 3.5 3.5C18.5 16 15.5 19 12 19S4.5 16 4.5 11.5 8 4.5 12 4.5c5.2 0 7.5 3 7.5 3" /><path d="M12 12c0 1.4-1 2.2-2 2.2" /></g></svg>,
  bridge: () => <svg viewBox="0 0 24 24"><g {...W}><path d="M2.5 15h19M4 15v4.5M20 15v4.5M4 15c2-5 5-7.5 8-7.5s6 2.5 8 7.5M8 15V10.6M12 15V7.5M16 15v-4.4" /></g></svg>,
  rad: () => <svg viewBox="0 0 24 24"><g {...W}><circle cx="12" cy="12" r="3.6" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></g></svg>,
  solar: () => <svg viewBox="0 0 24 24"><g {...W}><path d="M3 20.5h18M5 20.5l2-8h10l2 8M9.6 12.5l-.8 8M14.4 12.5l.8 8M6 16.5h12" /><circle cx="12" cy="6" r="2.4" /><path d="M12 1.8v.8M16.6 6h.8M7.4 6h-.8" /></g></svg>,
  cond: () => <svg viewBox="0 0 24 24"><g {...W}><path d="M12 3v11M8 5l4 3 4-3M8 12l4-3 4 3" /><path d="M12 15.5c-1.6 2-2.6 3-2.6 4a2.6 2.6 0 0 0 5.2 0c0-1-1-2-2.6-4z" fill="#fff" /></g></svg>,
  fick: () => <svg viewBox="0 0 24 24"><g {...W}><path d="M12 3v18" strokeDasharray="2.4 2.4" /><circle cx="6" cy="8" r="2" /><circle cx="7" cy="15" r="2.5" /><circle cx="17.5" cy="11" r="1.6" /><path d="M9.5 11.5h5m0 0-1.8-1.8m1.8 1.8-1.8 1.8" /></g></svg>,
  latent: () => <svg viewBox="0 0 24 24"><g {...W}><path d="M8 3.5c-1.5 1.6 1.5 2.4 0 4.2M12 2.5c-1.5 1.6 1.5 2.4 0 4.2M16 3.5c-1.5 1.6 1.5 2.4 0 4.2" /><path d="M4.5 11h15l-1.6 7.2a2.5 2.5 0 0 1-2.4 2H8.5a2.5 2.5 0 0 1-2.4-2z" /></g></svg>,
  glaser: () => <svg viewBox="0 0 24 24"><g {...W}><path d="M12 2.8 19.5 6v5.2c0 4.6-3.2 8.2-7.5 10-4.3-1.8-7.5-5.4-7.5-10V6z" /><path d="m8.5 12 2.4 2.4 4.6-4.8" /></g></svg>,
};
