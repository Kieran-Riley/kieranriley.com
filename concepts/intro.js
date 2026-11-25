// Opening sequence shared by every concept (see intro.css).
//
// 1. The sunset photo fades in full screen on black.
// 2. It holds for a moment.
// 3. It flies into the exact box and crop it has in the page, while its
//    corners round off to match.
// 4. As it lands, the page's own load animations are released, so the text
//    and tiles appear around it. The page's real photo is then underneath,
//    and the copy fades away.
//
// Each page starts the sequence from an inline <head> script that adds the
// `kr-intro` classes. Click, tap or any key skips it. It doesn't run with
// reduced motion, with a #link in the URL, or without JavaScript.
// `window.krIntro` is a promise that resolves when the page is fully shown.
(function () {
  var root = document.documentElement;
  var resolveDone;
  window.krIntro = new Promise(function (r) { resolveDone = r; });

  function finish() {
    root.classList.remove('kr-intro', 'kr-intro-hold', 'kr-intro-cover');
    resolveDone();
    document.dispatchEvent(new CustomEvent('kr-intro-done'));
  }

  if (!root.classList.contains('kr-intro')) { resolveDone(); return; }
  window.krIntroStarted = true;

  // The page's sunset photo is the landing spot.
  var target = document.querySelector('img[src*="hero-1400"]');
  if (!target) { finish(); return; }

  // The photo and the boxes around it are shown by the intro instead of
  // their own entrance animations, so switch those off.
  var chain = [];
  for (var el = target; el && el !== document.body; el = el.parentElement) chain.push(el);
  chain.forEach(function (n) { n.style.animation = 'none'; });
  target.style.setProperty('opacity', '1', 'important');
  target.style.setProperty('scale', '1', 'important');
  target.style.setProperty('transition', 'none', 'important');

  // The nearest ancestor that clips the photo gives the visible window and its corners.
  var clip = null;
  for (var i = 1; i < chain.length; i++) {
    var cs = getComputedStyle(chain[i]);
    if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.clipPath !== 'none') { clip = chain[i]; break; }
  }

  var layer = document.createElement('div');
  layer.className = 'kr-intro';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML =
    '<div class="kr-intro__bg"></div>' +
    '<div class="kr-intro__win"><img alt="" decoding="async"></div>' +
    '<button class="kr-intro__skip" type="button" tabindex="-1">Skip</button>';
  var bg = layer.querySelector('.kr-intro__bg');
  var win = layer.querySelector('.kr-intro__win');
  var img = win.querySelector('img');
  img.src = target.currentSrc || target.src;
  img.style.objectPosition = getComputedStyle(target).objectPosition;
  document.body.appendChild(layer);

  var vw = window.innerWidth;
  var vh = window.innerHeight;
  var full = { left: 0, top: 0, width: vw, height: vh };
  var px = function (n) { return Math.round(n * 10) / 10 + 'px'; };
  function place(node, r) {
    node.style.left = px(r.left); node.style.top = px(r.top);
    node.style.width = px(r.width); node.style.height = px(r.height);
  }
  place(win, full);
  place(img, full);
  win.style.opacity = '0';

  var anims = [];
  var skipped = false;
  var released = false;

  function release() {
    if (released) return;
    released = true;
    root.classList.remove('kr-intro-hold', 'kr-intro-cover');
  }

  function cleanup() {
    window.removeEventListener('wheel', block, { passive: false });
    window.removeEventListener('touchmove', block, { passive: false });
    window.removeEventListener('keydown', skip, true);
    layer.removeEventListener('pointerdown', skip);
    layer.remove();
    finish();
    // Hand the photo back to the page's own styles.
    requestAnimationFrame(function () {
      target.style.removeProperty('opacity');
      target.style.removeProperty('scale');
      target.style.removeProperty('transition');
    });
  }

  function skip(e) {
    if (skipped) return;
    skipped = true;
    if (e && e.type === 'keydown') e.preventDefault();
    anims.forEach(function (a) { a.cancel(); });
    release();
    layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease' }).onfinish = cleanup;
  }

  function block(e) { e.preventDefault(); }
  window.addEventListener('wheel', block, { passive: false });
  window.addEventListener('touchmove', block, { passive: false });
  window.addEventListener('keydown', skip, true);
  layer.addEventListener('pointerdown', skip);

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function run(node, frames, opts) {
    var a = node.animate(frames, Object.assign({ fill: 'forwards' }, opts));
    anims.push(a);
    return a.finished.catch(function () {});
  }

  // Wait for the photo to be ready, but never for long.
  var ready = img.decode ? img.decode().catch(function () {}) : Promise.resolve();
  Promise.race([ready, wait(1500)]).then(function () {
    if (skipped) return;
    root.classList.remove('kr-intro-cover');

    // 1. Fade in full screen.
    run(win, [{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: 'ease' });
    return run(img, [{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 1500, easing: 'cubic-bezier(.22,1,.36,1)' });
  }).then(function () {
    if (skipped) return;
    // 2. A short hold.
    return wait(250);
  }).then(function () {
    if (skipped) return;

    // 3. Fly into place. Measure now, after fonts and layout have settled.
    var t = target.getBoundingClientRect();
    var c = clip ? clip.getBoundingClientRect() : t;
    var to = {
      left: Math.max(t.left, c.left), top: Math.max(t.top, c.top),
      right: Math.min(t.right, c.right), bottom: Math.min(t.bottom, c.bottom),
    };
    to.width = Math.max(0, to.right - to.left);
    to.height = Math.max(0, to.bottom - to.top);
    var imgTo = { left: t.left - to.left, top: t.top - to.top, width: t.width, height: t.height };

    // Round only the corners that sit on the clipping box's own corners.
    var radius = '0px';
    if (clip) {
      var ccs = getComputedStyle(clip);
      var near = function (a, b) { return Math.abs(a - b) < 2; };
      var onTop = near(to.top, c.top), onBottom = near(to.bottom, c.bottom);
      var onLeft = near(to.left, c.left), onRight = near(to.right, c.right);
      radius = [
        onTop && onLeft ? ccs.borderTopLeftRadius : '0px',
        onTop && onRight ? ccs.borderTopRightRadius : '0px',
        onBottom && onRight ? ccs.borderBottomRightRadius : '0px',
        onBottom && onLeft ? ccs.borderBottomLeftRadius : '0px',
      ].join(' ');
    }

    var flight = { duration: 1150, easing: 'cubic-bezier(.65,0,.25,1)' };
    run(win, [
      { left: '0px', top: '0px', width: px(vw), height: px(vh), borderRadius: '0px' },
      { left: px(to.left), top: px(to.top), width: px(to.width), height: px(to.height), borderRadius: radius },
    ], flight);
    run(img, [
      { left: '0px', top: '0px', width: px(vw), height: px(vh) },
      { left: px(imgTo.left), top: px(imgTo.top), width: px(imgTo.width), height: px(imgTo.height) },
    ], flight);
    var bgGone = run(bg, [{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 350, easing: 'ease' });
    var skipBtn = layer.querySelector('.kr-intro__skip');
    run(skipBtn, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease' });

    // 4. Release the page's own animations just before landing.
    setTimeout(function () { if (!skipped) release(); }, 800);
    return Promise.all([bgGone, wait(flight.duration)]);
  }).then(function () {
    if (skipped) return;
    release();
    // The page's own photo is now underneath; fade the copy away.
    return run(win, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'ease' });
  }).then(function () {
    if (!skipped) cleanup();
  });
})();
