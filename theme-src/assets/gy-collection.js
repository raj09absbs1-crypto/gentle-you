/**
 * GentleYou collection controls.
 *
 * Progressive enhancement only: filtering and sorting are Shopify's own form
 * submissions, so the page works with JavaScript off. This file opens the
 * filter panel, keeps focus inside it, and submits the forms on change.
 */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, summary, [tabindex]:not([tabindex="-1"])';

  function initSort(scope) {
    (scope || document).querySelectorAll('[data-gy-sort]').forEach((select) => {
      if (select.dataset.gyReady === 'true') return;
      select.dataset.gyReady = 'true';
      select.addEventListener('change', () => select.closest('form')?.submit());
    });
  }

  function initFilters(scope) {
    const root = (scope || document).querySelector('[data-gy-filters]');
    if (!root || root.dataset.gyReady === 'true') return;
    root.dataset.gyReady = 'true';

    const panel = root.querySelector('.gy-filters__panel');
    const openers = document.querySelectorAll('[data-gy-filter-open]');
    let lastFocused = null;

    const open = (trigger) => {
      lastFocused = trigger || document.activeElement;
      root.hidden = false;
      requestAnimationFrame(() => root.classList.add('is-open'));
      document.body.classList.add('gy-no-scroll');
      openers.forEach((o) => o.setAttribute('aria-expanded', 'true'));
      (panel?.querySelector(FOCUSABLE) || panel)?.focus();
      document.addEventListener('keydown', onKey);
    };

    const close = () => {
      root.classList.remove('is-open');
      document.body.classList.remove('gy-no-scroll');
      openers.forEach((o) => o.setAttribute('aria-expanded', 'false'));
      document.removeEventListener('keydown', onKey);
      const done = () => { root.hidden = true; };
      if (reduce.matches) done();
      else window.setTimeout(done, 300);
      lastFocused?.focus();
    };

    function onKey(event) {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    openers.forEach((btn) => btn.addEventListener('click', () => open(btn)));
    root.querySelectorAll('[data-gy-filter-close]').forEach((btn) => btn.addEventListener('click', close));

    // On a pointer-and-keyboard screen, applying on change feels immediate;
    // on small screens the Apply button stays the deliberate action.
    const form = root.querySelector('[data-gy-filter-form]');
    if (form && window.matchMedia('(min-width: 750px)').matches) {
      form.addEventListener('change', (event) => {
        if (event.target.matches('input[type="checkbox"]')) form.submit();
      });
    }
  }

  function init(scope) {
    initSort(scope);
    initFilters(scope);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
