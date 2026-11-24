/* Concept: Rooftop. Chips and nav links open one sheet; its content swaps in place. */
(function () {
  'use strict';

  var root = document.documentElement;
  var stage = document.getElementById('stage');
  var home = document.getElementById('home');
  var sheets = document.getElementById('sheets');
  if (!stage || !home || !sheets) { root.classList.remove('js'); return; }

  var bar = sheets.querySelector('.bar');
  var body = sheets.querySelector('.sheet-body');
  var panels = Array.prototype.slice.call(sheets.querySelectorAll('.sheet'));
  var links = Array.prototype.slice.call(document.querySelectorAll('a[data-open]'));
  var current = null;
  var lastTrigger = null;
  var hideTimer = 0;

  bar.hidden = false;
  panels.forEach(function (p) { p.hidden = true; });
  sheets.setAttribute('role', 'region');
  sheets.setAttribute('aria-label', 'Details');

  function byId(id) {
    for (var i = 0; i < panels.length; i++) if (panels[i].id === id) return panels[i];
    return null;
  }

  function mark(id) {
    links.forEach(function (a) {
      if (id && a.getAttribute('href') === '#' + id && !a.closest('.chips')) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    var active = sheets.querySelector('.switch a[aria-current]');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function open(id, focus) {
    var panel = byId(id);
    if (!panel) return;
    clearTimeout(hideTimer);
    panels.forEach(function (p) { p.hidden = p !== panel; p.classList.remove('enter'); });
    current = panel;
    body.scrollTop = 0;
    void panel.offsetWidth;
    panel.classList.add('enter');
    root.classList.add('sheet-open');
    home.inert = true;
    mark(id);
    if (focus) panel.focus({ preventScroll: true });
  }

  function close() {
    if (!current) return;
    var panel = current;
    current = null;
    root.classList.remove('sheet-open');
    home.inert = false;
    mark(null);
    hideTimer = setTimeout(function () { panel.hidden = true; }, 750);
    var back = lastTrigger && document.contains(lastTrigger) && !lastTrigger.closest('.switch') ? lastTrigger : home.querySelector('.chips a');
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
    if (current && current.id === id) { requestClose(); return; }
    if (!current) lastTrigger = a;
    if (current) history.replaceState(null, '', '#' + id);
    else history.pushState(null, '', '#' + id);
    open(id, true);
  });

  sheets.querySelector('.close').addEventListener('click', requestClose);
  stage.addEventListener('click', function () { if (current) requestClose(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current) { e.preventDefault(); requestClose(); }
  });
  window.addEventListener('popstate', function () { sync(true); });
  sync(false);
})();
