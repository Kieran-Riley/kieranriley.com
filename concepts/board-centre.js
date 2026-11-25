/* Concept: Board, centre. Tiles open into a panel that grows out of the tile.
   The panel is revealed with a clip-path window that starts on the tile and
   widens to the full panel, so the rounded corners never stretch. */
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

  panels.forEach(function (p) {
    p.hidden = true;
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-modal', 'true');
    p.tabIndex = -1;
    var c = p.querySelector('.close');
    if (c) { c.hidden = false; c.addEventListener('click', requestClose); }
  });
  scrim.addEventListener('click', requestClose);

  var current = null;
  var lastTrigger = null;
  var running = [];

  function byId(id) {
    for (var i = 0; i < panels.length; i++) if (panels[i].id === id) return panels[i];
    return null;
  }
  function tileFor(id) {
    var a = board.querySelector('a[href="#' + id + '"]');
    return a ? a.closest('.tile') : null;
  }
  function stop() {
    running.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    running = [];
  }
  var FULL = 'inset(0px 0px 0px 0px round 28px)';
  // The tile's box, expressed as an inset window on the panel.
  function fromRect(panel, tile) {
    var p = panel.getBoundingClientRect();
    var t = tile.getBoundingClientRect();
    var minW = Math.min(p.width, 160), minH = Math.min(p.height, 120);
    var l = Math.max(0, Math.min(t.left - p.left, p.width - minW));
    var r = Math.max(0, Math.min(p.right - t.right, p.width - minW - l));
    var tp = Math.max(0, Math.min(t.top - p.top, p.height - minH));
    var bt = Math.max(0, Math.min(p.bottom - t.bottom, p.height - minH - tp));
    var px = function (n) { return Math.round(n) + 'px'; };
    return 'inset(' + px(tp) + ' ' + px(r) + ' ' + px(bt) + ' ' + px(l) + ' round 28px)';
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
      var anim = panel.animate(
        [{ clipPath: FULL, opacity: 1 }, { clipPath: fromRect(panel, tile), opacity: 1, offset: .7 }, { clipPath: fromRect(panel, tile), opacity: 0 }],
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
    if (id && byId(id)) open(id, animate);
    else close(animate);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-open]') : null;
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
})();
