/* Concept: Split. Hash-routed views; the photo half reacts through html[data-view]. */
(function () {
  'use strict';

  var root = document.documentElement;
  var order = ['home', 'about', 'work', 'how', 'contact'];
  var meta = {
    home: { label: 'Home', caption: 'Software developer in Newcastle' },
    about: { label: 'About', caption: 'About six years in' },
    work: { label: 'Work with me', caption: 'Four ways I can help' },
    how: { label: 'How I work', caption: 'A developer in your corner' },
    contact: { label: 'Contact', caption: 'A reply within two working days' }
  };
  var baseTitle = 'Kieran Riley. Software developer in Newcastle';

  var scroller = document.getElementById('views');
  var menu = document.querySelector('.menu');
  var links = Array.prototype.slice.call(menu.querySelectorAll('a'));
  var ink = menu.querySelector('.ink');
  var caption = document.getElementById('caption');
  var count = document.getElementById('count');
  var progress = document.getElementById('progress');
  var prev = document.getElementById('prev');
  var next = document.getElementById('next');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobile = window.matchMedia('(max-width: 719px)');
  var timer = 0;

  function fromHash() {
    var h = location.hash.slice(1);
    return order.indexOf(h) > -1 ? h : 'home';
  }

  var current = fromHash();
  root.setAttribute('data-view', current);

  // Stagger order for the reveal of each view's lines and blocks
  order.forEach(function (id) {
    var view = document.getElementById(id);
    var lines = view.querySelectorAll('.line');
    var blocks = view.querySelectorAll('.r');
    var i;
    for (i = 0; i < lines.length; i++) lines[i].firstElementChild.style.setProperty('--i', i);
    for (i = 0; i < blocks.length; i++) blocks[i].style.setProperty('--i', i + lines.length + 1);
  });

  // Accordion: everything is open in the HTML (no-JS); start with only the AI row open
  var rows = Array.prototype.slice.call(document.querySelectorAll('.svc'));
  rows.forEach(function (row) {
    if (row.id !== 'svc-ai') row.open = false;
    row.addEventListener('toggle', function () {
      if (!row.open) return;
      rows.forEach(function (other) { if (other !== row) other.open = false; });
    });
  });

  function placeInk() {
    var a = links[order.indexOf(current)];
    ink.style.transform = 'translateX(' + a.offsetLeft + 'px) scaleX(' + a.offsetWidth + ')';
  }

  function setStep(el, id) {
    el.hidden = !id;
    if (!id) return;
    el.setAttribute('href', '#' + id);
    el.querySelector('.step-label').textContent = meta[id].label;
  }

  function update(animate) {
    var i = order.indexOf(current);
    links.forEach(function (a, n) {
      if (n === i) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    placeInk();
    count.textContent = String(i + 1);
    progress.style.transform = 'scaleX(' + (i + 1) / order.length + ')';
    setStep(prev, order[i - 1]);
    setStep(next, order[i + 1]);
    document.title = current === 'home' ? baseTitle : meta[current].label + ' · Kieran Riley';
    if (caption.textContent !== meta[current].caption) {
      caption.textContent = meta[current].caption;
      caption.classList.remove('in');
      if (animate) {
        void caption.offsetWidth;
        caption.classList.add('in');
      }
    }
  }

  function show(id, focus) {
    if (id === current) return;
    clearTimeout(timer);
    var swap = function () {
      root.removeAttribute('data-leaving');
      root.setAttribute('data-view', id);
      current = id;
      update(true);
      scroller.scrollTop = 0;
      if (mobile.matches && window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
      }
      if (focus) {
        var heading = document.getElementById(id).querySelector('h1, h2');
        if (heading) heading.focus({ preventScroll: true });
      }
    };
    if (reduce.matches) {
      swap();
    } else {
      root.setAttribute('data-leaving', '');
      timer = setTimeout(swap, 200);
    }
  }

  function go(id, focus) {
    if (id === current) return;
    var url = id === 'home' ? location.pathname + location.search : '#' + id;
    try { history.pushState(null, '', url); } catch (e) { location.hash = id; }
    show(id, focus);
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (order.indexOf(id) === -1) return;
    e.preventDefault();
    // Menu and logo keep focus where it is; in-page buttons move it to the new heading
    go(id, !a.closest('.menu') && !a.classList.contains('logo'));
  });

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var t = e.target;
    if (t && t.closest && t.closest('input, textarea, select, [contenteditable]')) return;
    var i = order.indexOf(current) + (e.key === 'ArrowRight' ? 1 : -1);
    if (order[i]) go(order[i], false);
  });

  function onRoute() { show(fromHash(), false); }
  window.addEventListener('popstate', onRoute);
  window.addEventListener('hashchange', onRoute);

  window.addEventListener('resize', placeInk);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeInk);

  // Deep links should start at the top of the page, not scrolled to the section
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('load', function () {
    window.scrollTo(0, 0);
    scroller.scrollTop = 0;
    placeInk();
  });

  update(false);
})();
