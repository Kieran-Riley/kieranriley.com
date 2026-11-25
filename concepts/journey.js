/* Journey: vertical scrolling drives a horizontal track (sticky-track technique).
   No wheel hijacking: the page is simply as tall as the track is wide, and a
   requestAnimationFrame loop eases the track towards the native scroll position. */
(function () {
  'use strict';
  window.__journey = true;

  var root = document.documentElement;
  var journey = document.getElementById('journey');
  var viewport = document.getElementById('viewport');
  var track = document.getElementById('track');
  var bar = document.getElementById('progress');
  if (!journey || !viewport || !track) return;

  var panels = Array.prototype.slice.call(track.querySelectorAll('.panel'));
  var links = Array.prototype.slice.call(document.querySelectorAll('.stops a'));
  var movers = Array.prototype.slice.call(track.querySelectorAll('[data-speed]')).map(function (el) {
    return { el: el, speed: parseFloat(el.getAttribute('data-speed')) || 0, panel: panels.indexOf(el.closest('.panel')) };
  });

  var mqSize = window.matchMedia('(min-width: 720px) and (min-height: 540px)');
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var animate = !mqReduce.matches;

  var horizontal = false;
  var vw = 0, max = 0;
  var x = 0, target = 0;          // rendered and wanted track offset
  var geo = [];                   // [{left, width, start}] per panel
  var stops = [];                 // offsets the arrow keys move between
  var raf = 0, io = null, current = -1;

  /* Stagger index for arriving elements. */
  panels.forEach(function (p) {
    Array.prototype.forEach.call(p.querySelectorAll('[data-r]'), function (el, i) {
      el.style.setProperty('--i', i);
    });
  });

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function top() { return journey.getBoundingClientRect().top + window.scrollY; }

  /* ---------- measuring ---------- */

  function measure() {
    vw = viewport.clientWidth;
    max = Math.max(0, track.scrollWidth - vw);
    journey.style.height = (max + window.innerHeight) + 'px';
    var pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    stops = [];
    geo = panels.map(function (p) {
      var g = { left: p.offsetLeft, width: p.offsetWidth };
      g.start = clamp(g.left - pad, 0, max);
      stops.push(g.start);
      if (g.width > vw + 40) stops.push(clamp(g.left + g.width + pad - vw, 0, max));
      return g;
    });
    stops = stops.sort(function (a, b) { return a - b; }).filter(function (s, i, a) { return !i || s - a[i - 1] > 4; });
  }

  /* If a panel's content cannot fit the viewport height (zoom, big text), fall back to the vertical page. */
  function fits() {
    return panels.every(function (p) {
      var inner = p.querySelector('.inner');
      return !inner || inner.scrollHeight <= p.clientHeight + 2;
    });
  }

  function setMode() {
    var want = mqSize.matches && !mqReduce.matches;
    var ratio = max ? target / max : 0;
    if (want) {
      root.classList.add('h');
      if (!fits()) want = false;
    }
    root.classList.toggle('h', want);
    if (want) {
      measure();
      if (!horizontal) {
        if (io) { io.disconnect(); io = null; }
        horizontal = true;
        window.scrollTo(0, top() + ratio * max);
      }
      target = x = clamp(window.scrollY - top(), 0, max);
      render();
    } else {
      horizontal = false;
      journey.style.height = '';
      track.style.transform = '';
      movers.forEach(function (m) { m.el.style.transform = ''; });
      watchVertical();
      renderVertical();
    }
  }

  /* ---------- horizontal rendering ---------- */

  function render() {
    track.style.transform = 'translate3d(' + (-x).toFixed(2) + 'px,0,0)';
    if (bar) bar.style.transform = 'scaleX(' + (max ? x / max : 0).toFixed(4) + ')';

    var centre = x + vw / 2;
    for (var i = 0; i < movers.length; i++) {
      var m = movers[i], g = geo[m.panel];
      if (g.left - x > vw * 1.5 || g.left + g.width - x < -vw * 0.5) continue;   // far off screen
      var d = clamp(g.left + g.width / 2 - centre, -vw * 1.2, vw * 1.2);
      m.el.style.transform = 'translate3d(' + (d * m.speed).toFixed(2) + 'px,0,0)';
    }

    var now = 0;
    for (var j = 0; j < panels.length; j++) {
      if (geo[j].left - x < vw * 0.8) panels[j].classList.add('in');
      if (geo[j].left - x <= vw * 0.5) now = j;
    }
    mark(now);
  }

  function tick() {
    raf = 0;
    var diff = target - x;
    x = Math.abs(diff) < 0.4 ? target : x + diff * 0.16;
    render();
    if (x !== target) raf = requestAnimationFrame(tick);
  }

  /* ---------- vertical rendering (phones, reduced motion, tight viewports) ---------- */

  function watchVertical() {
    if (io || !animate) { if (!animate) panels.forEach(function (p) { p.classList.add('in'); }); return; }
    if (!('IntersectionObserver' in window)) { panels.forEach(function (p) { p.classList.add('in'); }); return; }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    panels.forEach(function (p) { if (!p.classList.contains('in')) io.observe(p); });
  }

  function renderVertical() {
    raf = 0;
    var room = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (room > 0 ? clamp(window.scrollY / room, 0, 1) : 0).toFixed(4) + ')';
    var line = window.innerHeight * 0.45, now = 0;
    for (var j = 0; j < panels.length; j++) {
      if (panels[j].getBoundingClientRect().top <= line) now = j;
    }
    mark(now);
  }

  /* ---------- navigator ---------- */

  function mark(i) {
    if (i === current) return;
    current = i;
    var id = panels[i].id === 'building' ? 'about' : panels[i].id;
    links.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  function scrollToOffset(offset, instant) {
    window.scrollTo({ top: top() + clamp(offset, 0, max), behavior: instant ? 'auto' : 'smooth' });
  }

  function goToPanel(i, instant) {
    if (i < 0 || i >= panels.length) return;
    if (horizontal) scrollToOffset(geo[i].start, instant);
    else panels[i].scrollIntoView({ behavior: instant || !animate ? 'auto' : 'smooth', block: 'start' });
  }

  function panelFromHash(hash) {
    if (!hash || hash.length < 2) return -1;
    var el = document.getElementById(decodeURIComponent(hash.slice(1)));
    return el ? panels.indexOf(el) : -1;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-go]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var i = panelFromHash(a.getAttribute('href'));
    if (i < 0) return;
    e.preventDefault();
    goToPanel(i);
    if (history.replaceState) history.replaceState(null, '', i ? a.getAttribute('href') : location.pathname + location.search);
    /* Move focus with the jump so keyboard users carry on from the new panel. */
    var p = panels[i];
    p.setAttribute('tabindex', '-1');
    p.focus({ preventScroll: true });
  });

  window.addEventListener('hashchange', function () {
    var i = panelFromHash(location.hash);
    if (i >= 0) goToPanel(i, true);
  });

  /* Left and Right arrows walk between stops. */
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var dir = e.key === 'ArrowRight' ? 1 : -1;
    e.preventDefault();
    if (horizontal) {
      var next = null, k;
      if (dir > 0) { for (k = 0; k < stops.length; k++) if (stops[k] > target + 4) { next = stops[k]; break; } }
      else { for (k = stops.length - 1; k >= 0; k--) if (stops[k] < target - 4) { next = stops[k]; break; } }
      if (next !== null) scrollToOffset(next);
    } else {
      goToPanel(clamp(current + dir, 0, panels.length - 1));
    }
  });

  /* Tabbing into an off-screen panel brings it into view. */
  track.addEventListener('focusin', function (e) {
    if (!horizontal) return;
    viewport.scrollLeft = 0;
    if (window.scrollX) window.scrollTo(0, window.scrollY);
    var el = e.target;
    if (panels.indexOf(el) >= 0) return;
    var r = el.getBoundingClientRect();
    var left = r.left + x - target;          // where it will be once the track settles
    if (left >= 16 && left + r.width <= vw - 16) return;
    var abs = r.left + x;
    var i = panels.indexOf(el.closest('.panel'));
    var dest = abs + r.width / 2 - vw / 2;
    if (i >= 0 && abs - geo[i].start >= 16 && abs + r.width - geo[i].start <= vw - 16) dest = geo[i].start;
    scrollToOffset(dest, true);
  });

  /* ---------- events ---------- */

  window.addEventListener('scroll', function () {
    if (horizontal) {
      target = clamp(window.scrollY - top(), 0, max);
      if (!raf) raf = requestAnimationFrame(tick);
    } else if (!raf) {
      raf = requestAnimationFrame(renderVertical);
    }
  }, { passive: true });

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setMode, 120);
  });
  [mqSize, mqReduce].forEach(function (mq) {
    var fn = function () { animate = !mqReduce.matches; root.classList.toggle('anim', animate); setMode(); };
    if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn);
  });

  /* ---------- start ---------- */

  setMode();
  var first = panelFromHash(location.hash);
  if (first > 0) goToPanel(first, true);
  requestAnimationFrame(function () { panels[0].classList.add('in'); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setMode);
  window.addEventListener('load', setMode);
})();
