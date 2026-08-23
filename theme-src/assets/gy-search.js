/*
  GentleYou header search overlay.

  Opens and closes the shell around Shopify's search form: focus handling,
  Escape, outside click, scroll lock. The search itself — the form, the
  request, the results — is Shopify's, handled by Dawn's <predictive-search>
  element, and nothing here touches it.
*/
(() => {
  const overlay = document.querySelector('[data-gy-search]');
  if (!overlay) return;

  const panel = overlay.querySelector('.gy-search__panel');
  const input = overlay.querySelector('[data-gy-search-input]');
  const triggers = document.querySelectorAll('[data-gy-search-open]');
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([type="hidden"]), [tabindex]:not([tabindex="-1"])';

  let lastTrigger = null;
  let isOpen = false;

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setTypingState = () => {
    overlay.classList.toggle('gy-search--typing', !!input && input.value.trim().length > 0);
  };

  const open = (trigger) => {
    if (isOpen) return;
    lastTrigger = trigger || null;
    isOpen = true;

    overlay.hidden = false;
    // Let the browser paint the hidden state once so the reveal can animate.
    requestAnimationFrame(() => overlay.classList.add('is-open'));

    document.body.classList.add('gy-no-scroll');
    triggers.forEach((el) => el.setAttribute('aria-expanded', 'true'));
    setTypingState();

    const focusTarget = input || panel;
    if (reduced()) {
      focusTarget.focus({ preventScroll: true });
    } else {
      window.setTimeout(() => focusTarget.focus({ preventScroll: true }), 120);
    }
  };

  const finishClose = () => {
    if (isOpen) return;
    overlay.hidden = true;
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;

    overlay.classList.remove('is-open');
    document.body.classList.remove('gy-no-scroll');
    triggers.forEach((el) => el.setAttribute('aria-expanded', 'false'));

    if (lastTrigger) lastTrigger.focus({ preventScroll: true });

    if (reduced()) {
      finishClose();
    } else {
      window.setTimeout(finishClose, 340);
    }
  };

  triggers.forEach((trigger) => {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', (event) => {
      // The trigger stays a real link to /search, so search still works with
      // no JavaScript; the overlay only takes over when it can.
      event.preventDefault();
      open(trigger);
    });
  });

  overlay.querySelectorAll('[data-gy-search-close]').forEach((el) => {
    el.addEventListener('click', close);
  });

  if (input) {
    input.addEventListener('input', setTypingState);
    // A reset clears the field through the form, after this event fires.
    input.form?.addEventListener('reset', () => window.setTimeout(setTypingState));
  }

  document.addEventListener('keydown', (event) => {
    if (!isOpen) return;

    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }

    if (event.key !== 'Tab') return;

    const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
