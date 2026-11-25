/* Concept: Rooftop board. Chips and nav links open one sheet; each answer is a small board of tiles, and some tiles open in place. */
(function () {
  'use strict';

  var root = document.documentElement;
  var stage = document.getElementById('stage');
  var home = document.getElementById('home');
  var sheets = document.getElementById('sheets');
  if (!stage || !home || !sheets || !('content' in document.createElement('template'))) { root.classList.remove('js'); return; }

  var bar = sheets.querySelector('.bar');
  var body = sheets.querySelector('.sheet-body');
  var closeBtn = sheets.querySelector('.close');
  var boards = Array.prototype.slice.call(sheets.querySelectorAll('.board'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var canAnimate = typeof Element.prototype.animate === 'function';
  var EASE = 'cubic-bezier(.2,.7,.2,1)';
  var current = null;
  var lastTrigger = null;
  var hideTimer = 0;
  var expanded = null;
  var running = [];
  var uid = 0;

  /* Drop the shared About and Contact tiles into each board */
  Array.prototype.forEach.call(sheets.querySelectorAll('[data-tile]'), function (slot) {
    var tpl = document.getElementById('tile-' + slot.getAttribute('data-tile'));
    if (tpl) slot.parentNode.replaceChild(tpl.content.firstElementChild.cloneNode(true), slot);
  });

  var links = Array.prototype.slice.call(document.querySelectorAll('a[data-open]'));

  bar.hidden = false;
  closeBtn.hidden = false;
  boards.forEach(function (b) { b.hidden = true; });
  sheets.setAttribute('role', 'dialog');
  sheets.tabIndex = -1;

  /* ---------- Tiles that open in place ---------- */

  Array.prototype.forEach.call(sheets.querySelectorAll('[data-expand]'), function (tile) {
    var btn = tile.querySelector('.more');
    var more = tile.querySelector('.tile-more');
    var less = tile.querySelector('.less');
    more.id = 'more-' + (++uid);
    more.hidden = true;
    more.tabIndex = -1;
    btn.hidden = false;
    btn.setAttribute('aria-controls', more.id);
    if (less) less.hidden = false;
    btn.addEventListener('click', function () {
      if (expanded === tile) collapse(true); else expand(tile);
    });
    if (less) less.addEventListener('click', function () { collapse(true); });
  });

  function stop() {
    running.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    running = [];
  }

  /* On a wide sheet the detail covers the whole board; on a narrow one it opens inside the tile */
  function covers(more) { return getComputedStyle(more).position === 'absolute'; }

  /* The tile's box, as a clip on the board-sized detail layer. Clipping keeps the corners true, unlike scaling. */
  function clipFor(tile, more) {
    var t = tile.getBoundingClientRect();
    var m = more.getBoundingClientRect();
    return 'inset(' + Math.max(0, t.top - m.top) + 'px ' + Math.max(0, m.right - t.right) + 'px ' +
      Math.max(0, m.bottom - t.bottom) + 'px ' + Math.max(0, t.left - m.left) + 'px round 20px)';
  }
  var OPEN_CLIP = 'inset(0px 0px 0px 0px round 20px)';

  function setCovered(tile, on) {
    var board = tile.parentNode;
    Array.prototype.forEach.call(board.children, function (el) { if (el !== tile) el.inert = on; });
    tile.querySelector('.face').inert = on;
  }

  function expand(tile) {
    if (expanded) collapse(false);
    var btn = tile.querySelector('.more');
    var more = tile.querySelector('.tile-more');
    stop();
    expanded = tile;
    more.hidden = false;
    more.classList.remove('inline-in');
    btn.setAttribute('aria-expanded', 'true');
    tile.classList.add('is-expanded');

    if (covers(more)) {
      tile.dataset.covering = '1';
      setCovered(tile, true);
      more.scrollTop = 0;
      if (canAnimate && !reduce.matches) {
        running.push(more.animate([{ clipPath: clipFor(tile, more) }, { clipPath: OPEN_CLIP }], { duration: 560, easing: EASE }));
        Array.prototype.forEach.call(more.children, function (el) {
          running.push(el.animate(
            [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
            { duration: 440, delay: 200, easing: EASE, fill: 'backwards' }
          ));
        });
      }
      more.focus({ preventScroll: true });
      if (more.scrollIntoView) more.scrollIntoView({ block: 'nearest' });
    } else {
      void more.offsetWidth;
      more.classList.add('inline-in');
    }
  }

  function collapse(animate) {
    if (!expanded) return;
    var tile = expanded;
    var btn = tile.querySelector('.more');
    var more = tile.querySelector('.tile-more');
    var wasCovering = tile.dataset.covering === '1';
    var hadFocus = more.contains(document.activeElement) || document.activeElement === more;
    expanded = null;
    stop();
    delete tile.dataset.covering;
    btn.setAttribute('aria-expanded', 'false');
    tile.classList.remove('is-expanded');
    if (wasCovering) setCovered(tile, false);
    if (hadFocus && animate) btn.focus({ preventScroll: true });

    if (animate && wasCovering && covers(more) && canAnimate && !reduce.matches) {
      var anim = more.animate([{ clipPath: OPEN_CLIP, opacity: 1 }, { clipPath: clipFor(tile, more), opacity: 1, offset: .8 }, { clipPath: clipFor(tile, more), opacity: 0 }],
        { duration: 420, easing: 'cubic-bezier(.5,0,.3,1)' });
      running.push(anim);
      anim.onfinish = function () { more.hidden = true; };
      anim.oncancel = function () { if (expanded !== tile) more.hidden = true; };
    } else {
      more.hidden = true;
    }
  }

  /* If the sheet changes width class while a tile is open, start clean */
  window.addEventListener('resize', function () {
    if (!expanded) return;
    var isCovering = covers(expanded.querySelector('.tile-more'));
    if (isCovering !== (expanded.dataset.covering === '1')) collapse(false);
  });

  /* ---------- The sheet ---------- */

  function byId(id) {
    for (var i = 0; i < boards.length; i++) if (boards[i].id === id) return boards[i];
    return null;
  }

  function mark(id) {
    links.forEach(function (a) {
      if (id && a.getAttribute('href') === '#' + id && (a.closest('.switch') || a.closest('.top'))) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    var active = sheets.querySelector('.switch a[aria-current]');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function open(id, focus) {
    var board = byId(id);
    if (!board) return;
    clearTimeout(hideTimer);
    collapse(false);
    boards.forEach(function (b) { b.hidden = b !== board; b.classList.remove('enter'); });
    current = board;
    body.scrollTop = 0;
    void board.offsetWidth;
    board.classList.add('enter');
    root.classList.add('sheet-open');
    home.inert = true;
    sheets.setAttribute('aria-labelledby', board.getAttribute('aria-labelledby'));
    mark(id);
    /* Focus the sheet itself, so Tab runs: answers, tiles, then close */
    if (focus) sheets.focus({ preventScroll: true });
  }

  function close() {
    if (!current) return;
    var board = current;
    current = null;
    root.classList.remove('sheet-open');
    home.inert = false;
    mark(null);
    hideTimer = setTimeout(function () { collapse(false); board.hidden = true; }, 750);
    var back = lastTrigger && document.contains(lastTrigger) && !sheets.contains(lastTrigger) ? lastTrigger : home.querySelector('.chips a');
    lastTrigger = null;
    if (back) back.focus({ preventScroll: true });
  }

  function requestClose() {
    history.pushState(null, '', location.pathname + location.search);
    close();
  }

  function sync(focus) {
    var id = decodeURIComponent(location.hash.slice(1));
    if (id && byId(id)) open(id, focus);
    else close();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-open]') : null;
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    var id = a.getAttribute('href').slice(1);
    if (!byId(id)) return;
    e.preventDefault();
    var inSwitch = !!a.closest('.switch');
    if (current && current.id === id) {
      if (inSwitch) return;
      requestClose();
      return;
    }
    if (!current) lastTrigger = a;
    if (current) history.replaceState(null, '', '#' + id);
    else history.pushState(null, '', '#' + id);
    /* Switching answers from the tabs keeps your place in the tabs */
    open(id, !inSwitch);
  });

  closeBtn.addEventListener('click', requestClose);
  stage.addEventListener('click', function () { if (current) requestClose(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !current) return;
    e.preventDefault();
    if (expanded) collapse(true); else requestClose();
  });
  window.addEventListener('popstate', function () { sync(true); });
  sync(false);
})();
