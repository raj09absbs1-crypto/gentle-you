/* GentleYou Premium — scroll reveal.
   Reveals once per element, then unobserves. Degrades to visible if
   IntersectionObserver is missing or the visitor prefers reduced motion. */
(function () {
  'use strict';

  var SELECTOR = '.gy-reveal';

  function showAll(nodes) {
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('gy-in');
  }

  function init(root) {
    var nodes = (root || document).querySelectorAll(SELECTOR + ':not(.gy-in)');
    if (!nodes.length) return;

    var reduced = window.matchMedia &&
                  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || !('IntersectionObserver' in window)) {
      showAll(nodes);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('gy-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    for (var i = 0; i < nodes.length; i++) io.observe(nodes[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  // Theme editor: re-scan when a section is added or re-rendered.
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
  document.addEventListener('shopify:section:select', function (e) { init(e.target); });
})();
