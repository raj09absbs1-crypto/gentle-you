/**
 * GentleYou homepage motion.
 *
 * One small observer drives every section's reveal, plus a sticky-header state
 * and an optional image parallax. No dependencies, and everything is switched
 * off when the visitor prefers reduced motion.
 */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function revealAll(scope) {
    (scope || document).querySelectorAll('[data-gy-reveal]').forEach((el) => el.classList.add('is-static'));
  }

  function initReveal(scope) {
    const items = (scope || document).querySelectorAll('[data-gy-reveal]:not([data-gy-reveal-ready])');
    if (!items.length) return;

    if (reduce.matches || !('IntersectionObserver' in window)) {
      items.forEach((el) => {
        el.dataset.gyRevealReady = 'true';
        el.classList.add('is-static');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
    );

    items.forEach((el) => {
      el.dataset.gyRevealReady = 'true';
      observer.observe(el);
    });
  }

  function initHeader() {
    const header = document.querySelector('[data-gy-header]');
    if (!header || header.dataset.gyHeaderReady === 'true') return;
    header.dataset.gyHeaderReady = 'true';

    let frame = null;
    const update = () => {
      frame = null;
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };

    window.addEventListener(
      'scroll',
      () => {
        if (frame) return;
        frame = requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();

    // Close the mobile drawer when a link inside it is followed.
    const drawer = header.querySelector('[data-gy-drawer]');
    if (drawer) {
      drawer.addEventListener('click', (event) => {
        if (event.target.closest('a')) drawer.removeAttribute('open');
      });
    }
  }

  function initParallax() {
    if (reduce.matches) return;
    const images = document.querySelectorAll('[data-gy-parallax-image]:not([data-gy-parallax-ready])');
    if (!images.length) return;

    images.forEach((img) => (img.dataset.gyParallaxReady = 'true'));

    let frame = null;
    const update = () => {
      frame = null;
      const viewport = window.innerHeight;
      images.forEach((img) => {
        const rect = img.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewport) return;
        const progress = (rect.top + rect.height / 2 - viewport / 2) / viewport;
        img.style.transform = 'translate3d(0, ' + (progress * -18).toFixed(2) + 'px, 0) scale(1.04)';
      });
    };

    window.addEventListener(
      'scroll',
      () => {
        if (frame) return;
        frame = requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  function init(scope) {
    initReveal(scope);
    initHeader();
    initParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', (event) => {
    revealAll(event.target);
    init(event.target);
  });
})();
