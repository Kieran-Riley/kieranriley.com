// Small progressive enhancements: page-load animation, scroll reveals,
// header behaviour and a gentle parallax on the hero photo.
// The site works fully without this file.
(function () {
  // Tells the fallback in <head> that animations are running. If this script
  // ever fails to load, the page drops its hidden starting states after 2.5s.
  window.krReady = true;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Number the items in each staggered group so CSS can delay them in turn.
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    group.querySelectorAll(':scope > [data-reveal]').forEach((el, i) => el.style.setProperty('--i', i));
  });
  document.querySelectorAll('.ticks').forEach((list) => {
    list.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--n', i));
  });

  // Page-load animation.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  });

  // Reveal sections as they scroll into view.
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );
    revealEls.forEach((el) => io.observe(el));
  }

  // Header: solid once you scroll, tucks away when scrolling down, returns when scrolling up.
  const header = document.querySelector('.site-header');
  // The photo that drifts and un-zooms as you scroll (full-bleed hero or the photo band).
  const heroMedia = document.querySelector('[data-parallax]') || document.querySelector('.hero-media');
  const heroImg = heroMedia && heroMedia.querySelector('img');
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 10);
      const goingDown = y > lastY;
      const menuFocused = header.contains(document.activeElement);
      header.classList.toggle('is-hidden', goingDown && y > 240 && !menuFocused);
    }
    if (heroImg && !reduceMotion) {
      // Progress from 0 (photo at the bottom of the screen) to 1 (scrolled past).
      const rect = heroMedia.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      heroImg.style.setProperty('--zoom', (1.12 - progress * 0.1).toFixed(4));
      heroImg.style.setProperty('--shift', `${((progress - 0.5) * 40).toFixed(1)}px`);
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true },
  );
  onScroll();

  // Always show the header when something inside it is focused with the keyboard.
  if (header) header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  // Keep the footer year current.
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
})();
