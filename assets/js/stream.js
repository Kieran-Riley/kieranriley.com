// Code stream: a soft river of code characters drifting down a curved path.
// Draws on any <canvas data-stream>. Pauses when off screen or in a background
// tab, and draws a single still frame if the visitor prefers reduced motion.
(function () {
  const canvases = document.querySelectorAll('canvas[data-stream]');
  if (!canvases.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GLYPHS = '{}[]()<>/=;:+*-_.01#$&|~'.split('');

  canvases.forEach((canvas) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // data-stream="0.62" sets where the river sits horizontally (0 to 1).
    const centre = parseFloat(canvas.dataset.stream) || 0.6;
    // data-band="0.14" sets how wide the river is, as a share of the width.
    const bandShare = parseFloat(canvas.dataset.band) || 0.12;
    let width = 0;
    let height = 0;
    let particles = [];
    let running = false;
    let visible = true;
    let last = 0;
    const pointer = { x: -9999, y: -9999 };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(650, (width * height) / 1700));
      particles = Array.from({ length: count }, makeParticle);
    }

    function gaussian() {
      // Roughly normal distribution, so most characters sit near the middle of the river.
      return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    }

    function makeParticle() {
      return {
        t: Math.random(),
        spread: gaussian(),
        speed: 0.012 + Math.random() * 0.03,
        glyph: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        swap: Math.random() * 4,
        size: 10 + Math.random() * 3,
        bright: Math.random() < 0.06,
      };
    }

    // Position on the curved path for progress t (0 top, 1 bottom).
    function pathX(t, time) {
      // On narrow screens the text fills the width, so keep the stream to the right edge.
      const narrow = width < 720;
      const c = narrow ? 0.9 : centre;
      const drift = Math.sin(t * Math.PI * 1.6 + time * 0.15) * (narrow ? 0.04 : 0.09);
      const slant = (t - 0.5) * (narrow ? 0.06 : 0.18);
      return width * (c + drift + slant);
    }

    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      const band = width < 720 ? 28 : Math.max(50, width * bandShare);
      for (const p of particles) {
        const x0 = pathX(p.t, time) + p.spread * band * (0.6 + Math.sin(p.t * 6 + time * 0.3) * 0.4);
        const y0 = p.t * (height + 40) - 20;
        // Characters near the pointer drift gently away from it.
        const dx = x0 - pointer.x;
        const dy = y0 - pointer.y;
        const dist = Math.hypot(dx, dy);
        const push = dist < 120 ? (120 - dist) / 120 : 0;
        const x = x0 + (dx / (dist || 1)) * push * 24;
        const y = y0 + (dy / (dist || 1)) * push * 24;

        const edgeFade = Math.min(1, p.t * 6, (1 - p.t) * 6);
        const centreFade = 1 - Math.min(1, Math.abs(p.spread));
        const alpha = p.bright ? 0.75 * edgeFade : (0.08 + centreFade * 0.32) * edgeFade;
        ctx.fillStyle = p.bright ? `rgba(163, 186, 240, ${alpha})` : `rgba(244, 244, 242, ${alpha})`;
        ctx.font = `${p.size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
        ctx.fillText(p.glyph, x, y);
      }
    }

    function step(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      const time = now / 1000;
      for (const p of particles) {
        p.t += p.speed * dt;
        if (p.t > 1) Object.assign(p, makeParticle(), { t: 0 });
        p.swap -= dt;
        if (p.swap < 0) {
          p.glyph = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          p.swap = 1 + Math.random() * 4;
        }
      }
      draw(time);
      requestAnimationFrame(step);
    }

    function start() {
      if (running || reduceMotion || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(step);
    }

    function stop() {
      running = false;
    }

    resize();
    draw(0);

    if (reduceMotion) return;

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      visible ? start() : stop();
    }).observe(canvas);

    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        draw(performance.now() / 1000);
      }, 150);
    });

    const host = canvas.parentElement;
    host.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    });
    host.addEventListener('pointerleave', () => {
      pointer.x = pointer.y = -9999;
    });

    start();
  });
})();
