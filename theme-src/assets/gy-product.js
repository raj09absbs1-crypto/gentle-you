/**
 * GentleYou product page behaviour.
 *
 * Gallery frame switching (including on Shopify variant change), an optional
 * full-size view, and the mobile sticky purchase bar. It never touches cart or
 * variant logic: adding to cart is delegated to the theme's existing product
 * form, and variant state comes from Dawn's own `variant-change` pubsub event.
 */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  class GyMediaGallery extends HTMLElement {
    connectedCallback() {
      this.frames = Array.from(this.querySelectorAll('[data-gy-frame]'));
      this.thumbs = Array.from(this.querySelectorAll('[data-gy-thumb]'));
      this.counter = this.querySelector('[data-gy-frame-counter]');
      this.index = Math.max(0, this.frames.findIndex((f) => f.classList.contains('is-active')));

      this.thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => this.show(parseInt(thumb.dataset.gyThumb, 10)));
      });

      this.querySelector('[data-gy-frame-prev]')?.addEventListener('click', () => this.show(this.index - 1));
      this.querySelector('[data-gy-frame-next]')?.addEventListener('click', () => this.show(this.index + 1));

      // Touch swipe, mobile gallery.
      let startX = null;
      const stage = this.querySelector('.gy-pdp__stage');
      if (stage) {
        stage.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].clientX; }, { passive: true });
        stage.addEventListener('touchend', (e) => {
          if (startX === null) return;
          const dx = e.changedTouches[0].clientX - startX;
          if (Math.abs(dx) > 40) this.show(this.index + (dx < 0 ? 1 : -1));
          startX = null;
        }, { passive: true });
      }

      if (this.dataset.zoom === 'true') {
        this.addEventListener('click', (event) => {
          const img = event.target.closest('.gy-pdp__frame.is-active .gy-pdp__image');
          if (img) this.openFull(img);
        });
      }

      // Shopify variant changes publish through Dawn's own pubsub; follow the
      // variant's featured media rather than duplicating any product data.
      if (typeof subscribe === 'function') {
        this.unsubscribe = subscribe('variant-change', (event) => {
          const media = event?.data?.variant?.featured_media;
          if (!media) return;
          this.setActiveMedia(`${this.dataset.section}-${media.id}`);
        });
      }
    }

    disconnectedCallback() {
      if (this.unsubscribe) this.unsubscribe();
    }

    setActiveMedia(mediaId) {
      const target = this.frames.findIndex((f) => f.dataset.mediaId === mediaId);
      if (target > -1) this.show(target);
    }

    show(next) {
      if (!this.frames.length) return;
      const total = this.frames.length;
      const to = ((next % total) + total) % total;
      if (to === this.index) return;
      this.index = to;

      this.frames.forEach((frame, i) => {
        frame.classList.toggle('is-active', i === to);
        if (i === to) frame.removeAttribute('aria-hidden');
        else frame.setAttribute('aria-hidden', 'true');
      });

      this.thumbs.forEach((thumb, i) => {
        thumb.classList.toggle('is-active', i === to);
        if (i === to) thumb.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });

      if (this.counter) this.counter.textContent = String(to + 1);
    }

    openFull(img) {
      const dialog = document.createElement('dialog');
      dialog.className = 'gy-pdp__lightbox';
      dialog.innerHTML =
        '<button class="gy-pdp__lightbox-close" type="button" aria-label="Close">&times;</button>' +
        `<img src="${img.dataset.full || img.currentSrc || img.src}" alt="${img.alt || ''}">`;
      document.body.appendChild(dialog);
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog || event.target.closest('.gy-pdp__lightbox-close')) dialog.close();
      });
      dialog.addEventListener('close', () => dialog.remove());
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }

  if (!customElements.get('gy-media-gallery')) {
    customElements.define('gy-media-gallery', GyMediaGallery);
  }

  /* ---- Mobile sticky purchase bar ---- */

  function initStickyBar(scope) {
    const root = (scope || document).querySelector('[data-gy-sticky-bar]');
    if (!root || root.dataset.gyReady === 'true') return;
    root.dataset.gyReady = 'true';

    const section = root.closest('product-info');
    const submit = section?.querySelector('.product-form__submit');
    const addButton = root.querySelector('[data-gy-sticky-add]');

    // The sticky button never implements its own cart logic — it forwards the
    // click to the theme's real product form submit button.
    if (addButton && submit) {
      addButton.addEventListener('click', () => submit.click());
    }

    if (!submit || !('IntersectionObserver' in window)) {
      root.hidden = false;
      root.classList.add('is-visible');
      return;
    }

    root.hidden = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Hidden while the real buy button is on screen, shown once it scrolls away.
          root.classList.toggle('is-visible', !entry.isIntersecting);
        });
      },
      { rootMargin: '-10% 0px -25% 0px' }
    );

    observer.observe(submit);

    // Mirror the real button's disabled state (sold out / unavailable variant).
    if (addButton && 'MutationObserver' in window) {
      const sync = () => {
        const disabled = submit.hasAttribute('disabled');
        addButton.toggleAttribute('disabled', disabled);
        addButton.textContent = submit.querySelector('span')?.textContent?.trim() || addButton.textContent;
      };
      sync();
      new MutationObserver(sync).observe(submit, { attributes: true, childList: true, subtree: true });
    }
  }

  function init(scope) {
    initStickyBar(scope);
    if (reduce.matches) {
      document.querySelectorAll('.gy-pdp [data-gy-reveal]').forEach((el) => el.classList.add('is-static'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
