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
  /* Start frame: the panel's centre sits on the tile's centre, clipped to the tile's size. */
  function fromTile(panel, tile) {
    var p = panel.getBoundingClientRect();
    var t = tile.getBoundingClientRect();
    var dx = (t.left + t.width / 2) - (p.left + p.width / 2);
    var dy = (t.top + t.height / 2) - (p.top + p.height / 2);
    var ix = Math.max(0, (p.width - t.width) / 2);
    var iy = Math.max(0, (p.height - t.height) / 2);
    var r = getComputedStyle(panel).borderTopLeftRadius || '28px';
    return {
      transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)',
      clipPath: 'inset(' + iy.toFixed(1) + 'px ' + ix.toFixed(1) + 'px round ' + r + ')',
      rest: 'inset(0px 0px round ' + r + ')'
    };
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
      var f = fromTile(panel, tile);
      running.push(panel.animate(
        [{ transform: f.transform, clipPath: f.clipPath, opacity: .5 }, { transform: 'translate(0px,0px)', clipPath: f.rest, opacity: 1 }],
        { duration: 560, easing: EASE }
      ));
      if (inner) running.push(inner.animate(
        [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, delay: 220, easing: EASE, fill: 'backwards' }
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
      var f = fromTile(panel, tile);
      var anim = panel.animate(
        [{ transform: 'translate(0px,0px)', clipPath: f.rest, opacity: 1 }, { transform: f.transform, clipPath: f.clipPath, opacity: 0 }],
        { duration: 360, easing: 'cubic-bezier(.5,0,.3,1)' }
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
