/**
 * GentleYou hero motion layer.
 *
 * Adds pointer-based tilt, a light scroll parallax and a one-time reveal to
 * sections/hero-product.liquid. Everything degrades to a static hero when JS
 * is unavailable or when the visitor prefers reduced motion — the markup and
 * all product data are rendered by Liquid, never by this file.
 */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  class GentleYouHero {
    constructor(root) {
      this.root = root;
      this.stage = root.querySelector('[data-gy-stage]');
      this.product = root.querySelector('[data-gy-product]');
      this.image = root.querySelector('.gy-hero__product-image');
      this.backdrop = root.querySelector('[data-gy-parallax]');
      this.maxTilt = parseFloat(root.dataset.gyTilt || '5');
      this.frame = null;
      this.scrollFrame = null;

      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerLeave = this.onPointerLeave.bind(this);
      this.onScroll = this.onScroll.bind(this);

      this.reveal();

      if (reduceMotion.matches) return;

      if (this.stage && this.product && window.matchMedia('(hover: hover)').matches) {
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

        this.product.style.transform =
          'perspective(1400px) rotateY(' +
          (x * this.maxTilt).toFixed(2) +
          'deg) rotateX(' +
          (-y * this.maxTilt).toFixed(2) +
          'deg) translateZ(0)';

        // Sheen follows the pointer across the plate.
        this.product.style.setProperty('--gy-px', (rx * 100).toFixed(1) + '%');
        this.product.style.setProperty('--gy-py', (ry * 100).toFixed(1) + '%');

        // The photograph drifts a few pixels against the frame, which reads as
        // depth between the glass and the print behind it.
        if (this.image) {
          this.image.style.transform =
            'scale(1.03) translate3d(' + (-x * 8).toFixed(2) + 'px, ' + (-y * 8).toFixed(2) + 'px, 0)';
        }
      });
    }

    onPointerLeave() {
      if (this.frame) {
        cancelAnimationFrame(this.frame);
        this.frame = null;
      }
      this.product.style.transform = '';
      if (this.image) this.image.style.transform = '';
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
