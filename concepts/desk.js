/* Concept: Desk. Lays the cards out on the photo, lets you drag, tidy, scatter and open them. */
(() => {
  'use strict';

  const root = document.documentElement;
  const desk = document.getElementById('desk');
  const heroText = document.getElementById('hero-text');
  const wrap = document.getElementById('cards');
  const tools = document.getElementById('tools');
  const win = document.getElementById('win');
  const cards = wrap ? Array.from(wrap.querySelectorAll('[data-card]')) : [];

  if (!desk || !heroText || !win || typeof win.showModal !== 'function' || !cards.length) {
    root.classList.remove('js');
    return;
  }

  const deskMq = window.matchMedia('(min-width: 720px) and (min-height: 520px)');
  const tallMq = window.matchMedia('(max-aspect-ratio: 11/10)');
  const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));

  /* Where each card sits when scattered: [centre x, centre y] as a fraction of the free area, then tilt. */
  const SPOTS = {
    side: {
      about: [0.2, 0.2, -4], ai: [0.69, 0.17, 2.5],
      services: [0.45, 0.57, 3], work: [0.84, 0.55, -3.5],
      agents: [0.3, 0.88, -2.5], contact: [0.74, 0.88, 4.5]
    },
    narrow: {
      about: [0.25, 0.19, -4], ai: [0.72, 0.16, 2.5],
      services: [0.24, 0.6, 3], work: [0.74, 0.5, -3],
      agents: [0.27, 0.9, -2.5], contact: [0.76, 0.84, 4.5]
    },
    below: {
      about: [0.16, 0.27, -3.5], ai: [0.5, 0.24, -1.5], services: [0.85, 0.27, 3],
      work: [0.18, 0.78, 2.5], agents: [0.52, 0.8, -2], contact: [0.84, 0.78, 4]
    }
  };

  const pos = new Map();
  let mode = 'scatter';
  let topZ = 10;

  /* ---------- Make each card openable ---------- */

  cards.forEach((card, i) => {
    const title = card.querySelector('.card__title');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card__btn';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.textContent = title.textContent;
    title.textContent = '';
    title.appendChild(btn);
    card.style.setProperty('--i', i);
    card.classList.add('is-dropping');
    pos.set(card, { x: 0, y: 0, r: 0 });
  });

  /* ---------- Layout ---------- */

  function freeArea() {
    const vw = desk.clientWidth;
    const vh = desk.clientHeight;
    const pad = clamp(vw * 0.02, 16, 30);
    const h = heroText.getBoundingClientRect();
    if (tallMq.matches) return { kind: 'below', l: pad, t: h.bottom + 22, r: vw - pad, b: vh - 66 };
    return { kind: 'side', l: h.right + 30, t: 70, r: vw - pad, b: vh - 66 };
  }

  function put(card, x, y, r, delay) {
    const p = pos.get(card);
    p.x = x; p.y = y; p.r = r;
    card.style.setProperty('--d', delay + 'ms');
    card.style.setProperty('--x', x.toFixed(1) + 'px');
    card.style.setProperty('--y', y.toFixed(1) + 'px');
    card.style.setProperty('--r', r + 'deg');
  }

  function layout(animate) {
    if (!deskMq.matches) {
      wrap.classList.remove('is-tidy');
      cards.forEach((card) => { card.removeAttribute('style'); card.style.setProperty('--i', cards.indexOf(card)); });
      return;
    }
    const a = freeArea();
    const W = a.r - a.l;
    const H = a.b - a.t;
    const fit = a.kind === 'side' ? Math.min(W / 800, H / 760) : Math.min(W / 900, H / 540);
    const s = clamp(fit, 0.85, 1.2);
    const em = 16 * s;
    wrap.style.setProperty('--s', s.toFixed(3));
    wrap.classList.toggle('is-tidy', mode === 'tidy');
    cards.forEach((card) => card.style.removeProperty('--th'));

    if (mode === 'tidy') {
      const gap = 0.85 * em;
      const cols = a.kind === 'below' || W / em >= 44 ? 3 : 2;
      const cw = Math.min((W - gap * (cols - 1)) / cols, 21 * em);
      wrap.style.setProperty('--tw', cw.toFixed(1) + 'px');
      const heights = cards.map((card) => card.firstElementChild.offsetHeight);
      const rows = [];
      for (let i = 0; i < cards.length; i += cols) rows.push(Math.max.apply(null, heights.slice(i, i + cols)));
      const totalH = rows.reduce((sum, h) => sum + h, 0) + gap * (rows.length - 1);
      const totalW = cols * cw + gap * (cols - 1);
      const ox = a.r - totalW;
      let y = a.t + Math.max(0, (H - totalH) / 2);
      cards.forEach((card, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        if (col === 0 && row > 0) y += rows[row - 1] + gap;
        card.style.setProperty('--th', rows[row] + 'px');
        put(card, ox + col * (cw + gap), y, 0, animate ? i * 45 : 0);
      });
    } else {
      const spots = SPOTS[a.kind === 'below' ? 'below' : (W / em >= 44 ? 'side' : 'narrow')];
      cards.forEach((card, i) => {
        const spot = spots[card.id];
        const w = card.offsetWidth;
        const h = card.offsetHeight;
        const x = clamp(a.l + spot[0] * W - w / 2, a.l, a.r - w);
        const y = clamp(a.t + spot[1] * H - h / 2, a.t, a.b - h);
        put(card, x, y, spot[2], animate ? i * 45 : 0);
      });
    }
  }

  function setMode(next) {
    mode = next;
    tools.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    layout(true);
  }

  tools.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (b) setMode(b.dataset.mode);
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => layout(false), 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout(false));

  /* ---------- Dragging ---------- */

  let drag = null;
  let swallowClick = false;

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.moved) {
      d.card.classList.remove('is-drag');
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 0);
    }
  }

  cards.forEach((card) => {
    card.addEventListener('pointerdown', (e) => {
      swallowClick = false;
      if (!deskMq.matches || e.button !== 0 || drag) return;
      const p = pos.get(card);
      drag = { card, id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false };
      card.style.zIndex = ++topZ;
    });

    card.addEventListener('pointermove', (e) => {
      if (!drag || drag.card !== card || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.sx;
      const dy = e.clientY - drag.sy;
      if (!drag.moved) {
        if (Math.hypot(dx, dy) < 6) return;
        drag.moved = true;
        card.classList.add('is-drag');
        try { card.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      }
      const p = pos.get(card);
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      p.x = clamp(drag.ox + dx, -w * 0.5, desk.clientWidth - w * 0.5);
      p.y = clamp(drag.oy + dy, 8, desk.clientHeight - Math.min(h, 90));
      card.style.setProperty('--d', '0ms');
      card.style.setProperty('--x', p.x.toFixed(1) + 'px');
      card.style.setProperty('--y', p.y.toFixed(1) + 'px');
    });

    card.addEventListener('pointerup', endDrag);
    card.addEventListener('pointercancel', endDrag);
    card.addEventListener('lostpointercapture', endDrag);
    card.addEventListener('dragstart', (e) => e.preventDefault());

    card.addEventListener('click', (e) => {
      if (swallowClick) { swallowClick = false; e.preventDefault(); return; }
      openCard(card);
    });

    card.addEventListener('animationend', (e) => {
      if (e.target === card.firstElementChild) card.classList.remove('is-dropping');
    });
  });

  /* ---------- The window ---------- */

  const winTitle = document.getElementById('win-title');
  const winLead = document.getElementById('win-lead');
  const winName = document.getElementById('win-name');
  const winSlot = document.getElementById('win-slot');
  let current = null;
  let closing = false;

  function fly(rect, reverse) {
    if (reduceMq.matches || !win.animate) return null;
    const d = win.getBoundingClientRect();
    if (!d.width || !d.height) return null;
    const small = {
      transform: 'translate(' + (rect.left - d.left) + 'px,' + (rect.top - d.top) + 'px) scale(' + (rect.width / d.width) + ',' + (rect.height / d.height) + ')',
      opacity: 0
    };
    const mid = { opacity: 1, offset: reverse ? 0.6 : 0.4 };
    const full = { transform: 'none', opacity: 1 };
    return win.animate(reverse ? [full, mid, small] : [small, mid, full], {
      duration: reverse ? 300 : 460,
      easing: reverse ? 'cubic-bezier(.5,0,.8,.4)' : 'cubic-bezier(.2,.8,.2,1)'
    });
  }

  function openCard(card) {
    if (current) return;
    current = card;
    const detail = card.querySelector('.card__detail');
    winTitle.textContent = card.querySelector('.card__btn').textContent;
    const lead = card.querySelector('.card__lead');
    winLead.textContent = lead ? lead.textContent : '';
    winLead.hidden = !lead;
    winName.textContent = card.dataset.name || card.id;
    win.dataset.kind = card.id;
    win.classList.toggle('t-dark', card.classList.contains('t-dark'));
    winSlot.appendChild(detail);
    const from = card.getBoundingClientRect();
    win.showModal();
    win.scrollTop = 0;
    root.classList.add('is-open');
    card.classList.add('is-away');
    fly(from, false);
  }

  function closeWin() {
    if (!current || closing) return;
    closing = true;
    root.classList.remove('is-open');
    const anim = fly(current.getBoundingClientRect(), true);
    if (anim) anim.onfinish = anim.oncancel = () => win.close();
    else win.close();
  }

  win.addEventListener('close', () => {
    const card = current;
    closing = false;
    current = null;
    root.classList.remove('is-open');
    if (!card) return;
    card.firstElementChild.appendChild(winSlot.firstElementChild);
    card.classList.remove('is-away');
    card.querySelector('.card__btn').focus({ preventScroll: true });
  });
  win.addEventListener('cancel', (e) => { e.preventDefault(); closeWin(); });
  win.addEventListener('click', (e) => { if (e.target === win) closeWin(); });
  document.getElementById('win-close').addEventListener('click', closeWin);

  /* ---------- Go ---------- */

  const onModeChange = () => { if (!current) layout(false); };
  if (deskMq.addEventListener) {
    deskMq.addEventListener('change', onModeChange);
    tallMq.addEventListener('change', onModeChange);
  }

  layout(false);
  root.classList.add('ready');
})();
