/* ==========================================================================
   Extrah Studio — shared behaviour. Vanilla, no dependencies.
   Everything motion-related checks prefers-reduced-motion first.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---- splash ---------------------------------------------------------- */
  var splash = $('.splash');
  if (splash) {
    var kill = function () {
      splash.setAttribute('data-done', 'true');
      window.setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 700);
    };
    window.addEventListener('load', function () { window.setTimeout(kill, reduce ? 0 : 420); });
    // Belt and braces: never let the splash trap the page if `load` is slow.
    window.setTimeout(kill, 3500);
  }

  /* ---- year ------------------------------------------------------------ */
  $$('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });

  /* ---- smart sticky header --------------------------------------------- */
  var hdr = $('.hdr');
  var nav = $('.nav');
  var burger = $('.burger');

  if (hdr) {
    var last = window.pageYOffset;
    var ticking = false;
    var apply = function () {
      var y = window.pageYOffset;
      hdr.setAttribute('data-top', y < 40 ? 'true' : 'false');
      // Never hide while the mobile panel is open, or we'd hide the close button.
      var open = nav && nav.getAttribute('data-open') === 'true';
      if (!open && y > 220) {
        hdr.setAttribute('data-hidden', y > last + 4 ? 'true' : (y < last - 4 ? 'false' : hdr.getAttribute('data-hidden') || 'false'));
      } else {
        hdr.setAttribute('data-hidden', 'false');
      }
      last = y;
      ticking = false;
    };
    apply();
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(apply); }
    }, { passive: true });
  }

  /* ---- mobile nav ------------------------------------------------------ */
  if (burger && nav) {
    var setNav = function (open) {
      nav.setAttribute('data-open', open ? 'true' : 'false');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) hdr.setAttribute('data-hidden', 'false');
    };
    setNav(false);
    burger.addEventListener('click', function () {
      setNav(nav.getAttribute('data-open') !== 'true');
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (e) { if (e.matches) setNav(false); });
  }

  /* ---- scroll reveal --------------------------------------------------- */
  var rv = $$('[data-rv]');
  if (rv.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      rv.forEach(function (n) { n.setAttribute('data-shown', 'true'); });
    } else {
      var ro = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.setAttribute('data-shown', 'true'); ro.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      rv.forEach(function (n) { ro.observe(n); });
    }
  }

  /* ---- floating WhatsApp ----------------------------------------------- */
  var wa = $('.wa-float');
  if (wa) {
    var showWa = function () { wa.setAttribute('data-in', window.pageYOffset > 380 ? 'true' : 'false'); };
    showWa();
    window.addEventListener('scroll', showWa, { passive: true });
  }

  /* ---- photo lightbox -------------------------------------------------- */
  var shots = $$('.shot');
  var lb = $('.lb');
  if (shots.length && lb) {
    var lbImg   = $('.lb-stage img', lb);
    var lbCap   = $('.lb-cap', lb);
    var lbCount = $('.lb-count', lb);
    var idx = 0;
    var opener = null;

    var render = function () {
      var s = shots[idx];
      lbImg.src = s.getAttribute('data-full');
      lbImg.alt = s.getAttribute('data-alt') || '';
      lbCap.textContent = s.getAttribute('data-cap') || '';
      lbCount.textContent = (idx + 1) + ' / ' + shots.length;
    };
    var open = function (i) {
      idx = i; opener = document.activeElement;
      render();
      lb.setAttribute('data-open', 'true');
      lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      $('.lb-x', lb).focus();
    };
    var close = function () {
      lb.setAttribute('data-open', 'false');
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lbImg.removeAttribute('src');
      if (opener && opener.focus) opener.focus();
    };
    var step = function (d) { idx = (idx + d + shots.length) % shots.length; render(); };

    shots.forEach(function (s, i) { s.addEventListener('click', function () { open(i); }); });
    $('.lb-x', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', function () { step(-1); });
    $('.lb-next', lb).addEventListener('click', function () { step(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-stage')) close(); });

    window.addEventListener('keydown', function (e) {
      if (lb.getAttribute('data-open') !== 'true') return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });

    // swipe
    var sx = 0, sy = 0;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ---- films ----------------------------------------------------------- */
  var films = $$('.film');
  if (films.length) {
    var fp     = $('.fp');
    var fpVid  = fp ? $('video', fp) : null;
    var soundOn = null;   // only ever one film audible at a time

    var mute = function (card) {
      var v = $('video', card);
      v.muted = true;
      card.setAttribute('data-sound', 'off');
      $('.snd-on', card).hidden = true;
      $('.snd-off', card).hidden = false;
    };
    var unmute = function (card) {
      if (soundOn && soundOn !== card) mute(soundOn);
      var v = $('video', card);
      v.muted = false;
      v.play().catch(function () {});
      card.setAttribute('data-sound', 'on');
      $('.snd-on', card).hidden = false;
      $('.snd-off', card).hidden = true;
      soundOn = card;
    };

    films.forEach(function (card) {
      var v = $('video', card);
      v.muted = true;
      v.setAttribute('playsinline', '');

      $('.js-sound', card).addEventListener('click', function (e) {
        e.stopPropagation();
        if (card.getAttribute('data-sound') === 'on') { mute(card); soundOn = null; }
        else unmute(card);
      });

      $('.js-full', card).addEventListener('click', function (e) { e.stopPropagation(); openFilm(card); });
      card.addEventListener('click', function () { openFilm(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilm(card); }
      });
    });

    // Muted autoplay once scrolled into view; pause again on the way out so we
    // aren't decoding three clips at once on a mid-range Android.
    if ('IntersectionObserver' in window) {
      var vo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var v = $('video', en.target);
          if (en.isIntersecting) { if (!reduce) v.play().catch(function () {}); }
          else {
            v.pause();
            if (soundOn === en.target) { mute(en.target); soundOn = null; }
          }
        });
      }, { threshold: 0.45 });
      films.forEach(function (c) { vo.observe(c); });
    }

    function openFilm(card) {
      if (!fp || !fpVid) return;
      var src = $('video source', card).getAttribute('src');
      if (soundOn) { mute(soundOn); soundOn = null; }
      films.forEach(function (c) { $('video', c).pause(); });
      fpVid.src = src;
      fpVid.muted = false;
      fpVid.currentTime = 0;
      fp.setAttribute('data-open', 'true');
      fp.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      fpVid.play().catch(function () { fpVid.muted = true; fpVid.play().catch(function () {}); });
      $('.fp-x', fp).focus();
    }
    function closeFilm() {
      if (!fp || !fpVid) return;
      fpVid.pause();
      fpVid.removeAttribute('src');
      fpVid.load();
      fp.setAttribute('data-open', 'false');
      fp.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    if (fp) {
      $('.fp-x', fp).addEventListener('click', closeFilm);
      fp.addEventListener('click', function (e) { if (e.target === fp) closeFilm(); });
      window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && fp.getAttribute('data-open') === 'true') closeFilm();
      });
    }
  }
})();
