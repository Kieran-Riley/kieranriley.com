/* kieranriley.com. Tiles open into a panel that grows out of the tile.
   The panel is never scaled: it slides from the tile while a rounded clip-path
   window widens from the tile's size, so the corners keep their true radius. */
(function () {
  'use strict';

  var root = document.documentElement;
  var board = document.getElementById('board');
  var details = document.getElementById('details');
  if (!board || !details) { root.classList.remove('js'); return; }

  var panels = Array.prototype.slice.call(details.querySelectorAll('.detail'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var canAnimate = typeof Element.prototype.animate === 'function';
  var EASE = 'cubic-bezier(.2,.7,.2,1)';

  var scrim = document.createElement('div');
  scrim.className = 'scrim';
  details.insertBefore(scrim, details.firstChild);

  /* Each panel becomes a dialog with its own close button (not needed
     without JS, where the panels are plain sections below the board). */
  var CLOSE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  panels.forEach(function (p) {
    p.hidden = true;
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-modal', 'true');
    p.tabIndex = -1;
    var c = document.createElement('button');
    c.className = 'close';
    c.type = 'button';
    c.setAttribute('aria-label', 'Close');
    c.innerHTML = CLOSE_ICON;
    c.addEventListener('click', requestClose);
    p.insertBefore(c, p.firstChild);
  });
  scrim.addEventListener('click', requestClose);

  var current = null;
  var lastTrigger = null;
  var running = [];

  function byId(id) {
    var el = id ? document.getElementById(id) : null;
    return panels.indexOf(el) > -1 ? el : null;
  }
  function tileFor(id) {
    var a = board.querySelector('a[href="#' + id + '"]');
    return a ? a.closest('.tile') : null;
  }
  function stop() {
    running.forEach(function (a) { a.cancel(); });
    running = [];
  }
  /* A hash can name a panel, or something inside one (e.g. #advice in services). */
  function byHash(id) {
    var el = id ? document.getElementById(id) : null;
    var panel = el && el.closest('.detail');
    return panel ? byId(panel.id) : null;
  }
  /* The panel is revealed through a rounded clip-path window that starts on the
     tile and widens to the full panel, so its corners never stretch. */
  var RADIUS = 28;
  var FULL = 'inset(0px 0px 0px 0px round ' + RADIUS + 'px)';
  function fromRect(panel, tile) {
    var p = panel.getBoundingClientRect();
    var t = tile.getBoundingClientRect();
    var minW = Math.min(p.width, 160), minH = Math.min(p.height, 120);
    var l = Math.max(0, Math.min(t.left - p.left, p.width - minW));
    var r = Math.max(0, Math.min(p.right - t.right, p.width - minW - l));
    var tp = Math.max(0, Math.min(t.top - p.top, p.height - minH));
    var bt = Math.max(0, Math.min(p.bottom - t.bottom, p.height - minH - tp));
    var px = function (n) { return Math.round(n) + 'px'; };
    return 'inset(' + px(tp) + ' ' + px(r) + ' ' + px(bt) + ' ' + px(l) + ' round ' + RADIUS + 'px)';
  }

  /* About: the tile's photo flies into the panel's portrait (and back on close),
     so it reads as the same picture. */
  function flyPhoto(panel, tile, opening, duration, easing) {
    var from = tile.querySelector('.tile-bg img');
    var portrait = panel.querySelector('.portrait');
    if (!from || !portrait) return;
    var a = tile.getBoundingClientRect();
    var b = portrait.getBoundingClientRect();
    var ra = getComputedStyle(tile).borderTopLeftRadius;
    var rb = getComputedStyle(portrait).borderTopLeftRadius;
    var start = opening ? a : b, end = opening ? b : a;
    var layer = document.createElement('div');
    layer.className = 'photo-flight';
    layer.setAttribute('aria-hidden', 'true');
    var img = document.createElement('img');
    img.alt = '';
    img.src = from.currentSrc || from.src;
    layer.appendChild(img);
    document.body.appendChild(layer);
    portrait.style.visibility = 'hidden';
    var box = function (r, radius) {
      return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: radius };
    };
    var anim = layer.animate(
      [box(start, opening ? ra : rb), box(end, opening ? rb : ra)],
      { duration: duration, easing: easing, fill: 'forwards' }
    );
    function done() { portrait.style.visibility = ''; layer.remove(); }
    anim.onfinish = done;
    anim.oncancel = done;
    running.push(anim);
  }

  function open(id, animate) {
    var panel = byId(id);
    if (!panel) return;
    stop();
    if (current && current !== panel) current.hidden = true;
    current = panel;
    panel.hidden = false;
    panel.scrollTop = 0;
    details.classList.remove('is-closing');
    details.classList.add('is-open');
    root.classList.add('locked');
    board.inert = true;

    var tile = tileFor(id);
    if (animate && tile && canAnimate && !reduce.matches) {
      var inner = panel.querySelector('.detail-in');
      flyPhoto(panel, tile, true, 600, EASE);
      running.push(panel.animate(
        [{ clipPath: fromRect(panel, tile), opacity: .5 }, { clipPath: FULL, opacity: 1 }],
        { duration: 560, easing: EASE }
      ));
      if (inner) running.push(inner.animate(
        [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 440, delay: 240, easing: EASE, fill: 'backwards' }
      ));
    }
    var c = panel.querySelector('.close');
    (c || panel).focus({ preventScroll: true });
  }

  function close(animate) {
    if (!current) return;
    var panel = current;
    var tile = tileFor(panel.id);
    current = null;
    stop();

    function done() {
      panel.hidden = true;
      details.classList.remove('is-open', 'is-closing');
    }
    root.classList.remove('locked');
    board.inert = false;
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
    else if (tile) { var a = tile.querySelector('a'); if (a) a.focus({ preventScroll: true }); }
    lastTrigger = null;

    if (animate && tile && canAnimate && !reduce.matches) {
      details.classList.add('is-closing');
      var shut = fromRect(panel, tile);
      flyPhoto(panel, tile, false, 420, 'cubic-bezier(.5,0,.3,1)');
      var anim = panel.animate(
        [{ clipPath: FULL, opacity: 1 }, { clipPath: shut, opacity: 1, offset: .7 }, { clipPath: shut, opacity: 0 }],
        { duration: 420, easing: 'cubic-bezier(.5,0,.3,1)' }
      );
      running.push(anim);
      anim.onfinish = done;
      anim.oncancel = function () { if (current !== panel) panel.hidden = true; };
    } else {
      done();
    }
  }

  function requestClose() {
    if (history.state && history.state.panel) history.back();
    else {
      history.replaceState(null, '', location.pathname + location.search);
      close(true);
    }
  }

  function sync(animate) {
    var id = decodeURIComponent(location.hash.slice(1));
    var p = id ? byHash(id) : null;
    if (p) {
      open(p.id, animate);
      var part = p.id !== id ? document.getElementById(id) : null;
      if (part) part.scrollIntoView({ block: 'start' });
    }
    else close(animate);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-open]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    var id = a.getAttribute('href').slice(1);
    if (!byId(id)) return;
    e.preventDefault();
    lastTrigger = a;
    history.pushState({ panel: id }, '', '#' + id);
    open(id, true);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current) { e.preventDefault(); requestClose(); }
  });

  window.addEventListener('popstate', function () { sync(true); });
  sync(false);

  /* Gentle tilt towards the pointer, on devices that have one */
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  Array.prototype.forEach.call(board.querySelectorAll('[data-tilt]'), function (tile) {
    var frame = 0, px = 0, py = 0;
    function apply() {
      frame = 0;
      var r = tile.getBoundingClientRect();
      var k = Math.min(7, 1500 / Math.max(r.width, 1));
      var x = (px - r.left) / r.width - .5;
      var y = (py - r.top) / r.height - .5;
      tile.style.setProperty('--ry', (x * k).toFixed(2) + 'deg');
      tile.style.setProperty('--rx', (-y * k).toFixed(2) + 'deg');
    }
    tile.addEventListener('pointermove', function (e) {
      if (!fine.matches || reduce.matches || e.pointerType === 'touch') return;
      px = e.clientX; py = e.clientY;
      tile.classList.add('tilting');
      if (!frame) frame = requestAnimationFrame(apply);
    });
    tile.addEventListener('pointerleave', function () {
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      tile.classList.remove('tilting');
      tile.style.removeProperty('--rx');
      tile.style.removeProperty('--ry');
    });
  });

  /* Light and dark mode. Follows the device until the visitor picks one;
     the choice is remembered on this device. */
  var toggle = document.querySelector('.theme');
  var themeColor = document.querySelector('meta[name="theme-color"]');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  function mode() {
    return root.getAttribute('data-theme') || (darkQuery.matches ? 'dark' : 'light');
  }
  function showMode() {
    var m = mode();
    root.setAttribute('data-mode', m);
    // Match the browser bar to the page, including after a manual switch.
    if (themeColor) themeColor.content = getComputedStyle(document.body).backgroundColor;
    if (toggle) toggle.setAttribute('aria-label', m === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', function () {
      var next = mode() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      showMode();
    });
  }
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', showMode);
  showMode();
})();
