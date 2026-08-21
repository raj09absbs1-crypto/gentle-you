/**
 * GentleYou hero — campaign rotation and motion layer.
 *
 * The section renders every slide server-side from Shopify data; this file only
 * decides which slide is active and adds pointer motion. It holds no product
 * data of any kind: prices, titles, images and URLs all come from Liquid.
 *
 * Everything degrades gracefully — without JavaScript the first product stays
 * visible and linked, and with `prefers-reduced-motion` the automatic rotation,
 * blur, tilt, parallax and sheen are all disabled while the manual controls
 * keep working.
 */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Matches the exit/enter timing in gentleyou.css.
  const TRANSITION_MS = 1000;
  // How long after the visitor stops interacting before rotation resumes.
  const RESUME_DELAY_MS = 4000;

  class GentleYouHero {
    constructor(root) {
      this.root = root;
      this.stage = root.querySelector('[data-gy-stage]');
      this.plate = root.querySelector('[data-gy-product]');
      this.backdrop = root.querySelector('[data-gy-parallax]');
      this.cta = root.querySelector('[data-gy-cta]');
      this.counter = root.querySelector('[data-gy-counter]');
      this.progress = root.querySelector('[data-gy-progress]');

      this.slides = Array.from(root.querySelectorAll('[data-gy-slide]'));
      this.states = Array.from(root.querySelectorAll('[data-gy-state]'));
      this.captions = Array.from(root.querySelectorAll('[data-gy-caption]'));

      this.maxTilt = parseFloat(root.dataset.gyTilt || '4');
      this.interval = parseInt(root.dataset.gyInterval, 10) || 7500;
      this.autoplay = root.dataset.gyAutoplay === 'true' && this.slides.length > 1;

      this.index = 0;
      this.timer = null;
      this.resumeTimer = null;
      this.transitionTimer = null;
      this.paused = false;
      this.lastInteraction = 0;
      this.frame = null;
      this.scrollFrame = null;

      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerLeave = this.onPointerLeave.bind(this);
      this.onScroll = this.onScroll.bind(this);

      this.reveal();
      this.bindControls();
      this.bindMotion();

      if (this.slides.length > 1) {
        this.preload(1);
        this.start();
      }
    }

    /* ---- rotation ---- */

    start() {
      if (!this.autoplay || reduceMotion.matches) return;
      this.stop();
      this.restartProgress();
      this.timer = window.setTimeout(() => this.go(this.index + 1), this.interval);
    }

    stop() {
      window.clearTimeout(this.timer);
      this.timer = null;
    }

    pause() {
      if (this.paused) return;
      this.paused = true;
      this.stop();
      window.clearTimeout(this.resumeTimer);
      if (this.progress) this.progress.style.animationPlayState = 'paused';
    }

    // One visitor interaction: hold the rotation, then let it pick back up.
    interact() {
      const now = Date.now();
      if (now - this.lastInteraction < 250) return;
      this.lastInteraction = now;
      this.pause();
      this.resume();
    }

    resume(delay) {
      window.clearTimeout(this.resumeTimer);
      this.resumeTimer = window.setTimeout(() => {
        this.paused = false;
        if (this.progress) this.progress.style.animationPlayState = '';
        this.start();
      }, delay === undefined ? RESUME_DELAY_MS : delay);
    }

    go(next) {
      const total = this.slides.length;
      if (total < 2) return;

      const to = ((next % total) + total) % total;
      if (to === this.index) return;

      const from = this.index;
      this.index = to;

      // Image and copy change in the same frame, so the hero never shows one
      // product's price beside another product's photograph.
      this.setActive(this.slides, from, to, 'is-leaving');
      this.setActive(this.states, from, to, 'is-leaving');
      this.setActive(this.captions, from, to, 'is-leaving');

      if (this.cta) {
        const state = this.states[to];
        if (state) {
          if (state.dataset.gyUrl) this.cta.setAttribute('href', state.dataset.gyUrl);
          this.cta.classList.toggle('gy-hero__cta--soft', state.dataset.gyAvailable === 'false');
        }
      }

      if (this.counter) this.counter.textContent = String(to + 1).padStart(2, '0');
      if (this.plate && !reduceMotion.matches) this.plate.classList.add('is-swapping');

      window.clearTimeout(this.transitionTimer);
      this.transitionTimer = window.setTimeout(() => {
        if (this.plate) this.plate.classList.remove('is-swapping');
        this.slides.forEach((el) => el.classList.remove('is-leaving'));
        this.states.forEach((el) => el.classList.remove('is-leaving'));
        this.captions.forEach((el) => el.classList.remove('is-leaving'));
      }, TRANSITION_MS);

      this.preload(to + 1);
      if (!this.paused) this.start();
    }

    setActive(list, from, to, leavingClass) {
      list.forEach((el, i) => {
        if (i === from) el.classList.add(leavingClass);
        el.classList.toggle('is-active', i === to);
        if (i === to) {
          el.removeAttribute('aria-hidden');
        } else {
          el.setAttribute('aria-hidden', 'true');
        }
      });
    }

    // Promote the next slide's image just before it is needed, so a six-product
    // hero never downloads six full-size photographs up front.
    preload(index) {
      const total = this.slides.length;
      if (total < 2) return;
      const slide = this.slides[((index % total) + total) % total];
      const img = slide && slide.querySelector('img[data-gy-src]');
      if (!img) return;
      if (img.dataset.gySrcset) img.setAttribute('srcset', img.dataset.gySrcset);
      img.setAttribute('src', img.dataset.gySrc);
      img.setAttribute('loading', 'eager');
      delete img.dataset.gySrc;
      delete img.dataset.gySrcset;
    }

    restartProgress() {
      if (!this.progress) return;
      this.progress.style.animation = 'none';
      // Force a reflow so the animation restarts from zero on every slide.
      void this.progress.offsetWidth;
      this.progress.style.animation = '';
      this.progress.style.animationDuration = this.interval + 'ms';
    }

    /* ---- controls ---- */

    bindControls() {
      const prev = this.root.querySelector('[data-gy-prev]');
      const next = this.root.querySelector('[data-gy-next]');

      if (prev) {
        prev.addEventListener('click', () => {
          this.pause();
          this.go(this.index - 1);
          this.resume();
        });
      }

      if (next) {
        next.addEventListener('click', () => {
          this.pause();
          this.go(this.index + 1);
          this.resume();
        });
      }

      if (this.slides.length > 1) {
        // Hovering pauses the rotation; a resting cursor is not an interaction,
        // so it resumes on its own after a short lull rather than stalling.
        // Touch devices have no hover, so they only pause on focus and taps.
        if (window.matchMedia('(hover: hover)').matches) {
          this.root.addEventListener('pointerenter', () => this.interact());
          this.root.addEventListener('pointermove', () => this.interact());
          this.root.addEventListener('pointerleave', () => this.resume(600));
        }
        this.root.addEventListener('focusin', () => this.pause());
        this.root.addEventListener('focusout', () => this.resume());
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) this.pause();
          else this.resume(0);
        });
      }
    }

    /* ---- motion ---- */

    bindMotion() {
      if (reduceMotion.matches) return;

      if (this.stage && this.plate && window.matchMedia('(hover: hover)').matches) {
        this.stage.addEventListener('pointermove', this.onPointerMove);
        this.stage.addEventListener('pointerleave', this.onPointerLeave);
      }

      if (this.backdrop) {
        window.addEventListener('scroll', this.onScroll, { passive: true });
      }
    }

    reveal() {
      if (reduceMotion.matches || !('IntersectionObserver' in window)) {
        this.root.dataset.gyReveal = 'in';
        return;
      }

      this.root.dataset.gyReveal = 'pending';

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            this.root.dataset.gyReveal = 'in';
            observer.disconnect();
          });
        },
        { rootMargin: '0px 0px -10% 0px' }
      );

      observer.observe(this.root);
    }

    onPointerMove(event) {
      if (this.frame) return;

      this.frame = requestAnimationFrame(() => {
        this.frame = null;
        const bounds = this.stage.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;

        const rx = (event.clientX - bounds.left) / bounds.width;
        const ry = (event.clientY - bounds.top) / bounds.height;
        const x = rx - 0.5;
        const y = ry - 0.5;

        this.plate.style.transform =
          'perspective(1400px) rotateY(' +
          (x * this.maxTilt).toFixed(2) +
          'deg) rotateX(' +
          (-y * this.maxTilt).toFixed(2) +
          'deg) translateZ(0)';

        this.plate.style.setProperty('--gy-px', (rx * 100).toFixed(1) + '%');
        this.plate.style.setProperty('--gy-py', (ry * 100).toFixed(1) + '%');
        this.plate.style.setProperty('--gy-drift-x', (-x * 8).toFixed(2) + 'px');
        this.plate.style.setProperty('--gy-drift-y', (-y * 8).toFixed(2) + 'px');
      });
    }

    onPointerLeave() {
      if (this.frame) {
        cancelAnimationFrame(this.frame);
        this.frame = null;
      }
      this.plate.style.transform = '';
      this.plate.style.removeProperty('--gy-drift-x');
      this.plate.style.removeProperty('--gy-drift-y');
    }

    onScroll() {
      if (this.scrollFrame) return;

      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = null;
        const bounds = this.root.getBoundingClientRect();
        if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;

        const progress = Math.max(-1, Math.min(1, -bounds.top / window.innerHeight));
        this.backdrop.style.transform = 'translate3d(0, ' + (progress * 24).toFixed(2) + 'px, 0)';
      });
    }
  }

  function init(scope) {
    (scope || document).querySelectorAll('[data-gy-hero]').forEach((root) => {
      if (root.dataset.gyHeroReady === 'true') return;
      root.dataset.gyHeroReady = 'true';
      new GentleYouHero(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  // Re-initialise when the merchant edits the section in the Theme Editor.
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
