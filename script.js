/* =========================================================
   Time Machine Contracting & Restoration — site scripts
   - sticky header + scrollspy
   - mobile navigation
   - scroll reveal
   - LeadrVision form handling (plain POST fallback + JSON fetch)
   ========================================================= */
(function () {
  'use strict';

  var FORM_ENDPOINT = 'https://vision.leadrai.com/api/forms/18d2d1bbd1574dc297033baeb6ffddd3';
  var SUCCESS_TEXT = 'Thanks, your message was sent';
  var doc = document;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* -------------------------------------------------------
     1. Header: shadow when scrolled
     ------------------------------------------------------- */
  var header = $('#siteHeader');
  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle('is-stuck', window.scrollY > 8);
  }
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* -------------------------------------------------------
     2. Mobile navigation
     ------------------------------------------------------- */
  var navToggle = $('#navToggle');
  var nav = $('#primaryNav');

  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    $$('a', nav).forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) closeNav();
    });
  }

  /* -------------------------------------------------------
     3. Scroll reveal
     ------------------------------------------------------- */
  var revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && revealItems.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealItems.forEach(function (item) { revealObserver.observe(item); });
  } else {
    revealItems.forEach(function (item) { item.classList.add('is-visible'); });
  }

  /* -------------------------------------------------------
     4. Scrollspy — highlight the section in view
     ------------------------------------------------------- */
  var navLinks = $$('.nav-list a[href^="#"]');
  var sections = navLinks.map(function (link) {
    return doc.getElementById(link.getAttribute('href').slice(1));
  }).filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          var active = link.getAttribute('href') === '#' + entry.target.id;
          link.style.fontWeight = active ? '800' : '';
          link.style.color = active ? 'var(--accent-600)' : '';
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (section) { spy.observe(section); });
  }

  /* -------------------------------------------------------
     5. Footer year
     ------------------------------------------------------- */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* -------------------------------------------------------
     6. Toast helper
     ------------------------------------------------------- */
  function showToast(message) {
    var toast = doc.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = '<span class="toast__check" aria-hidden="true">✓</span><span></span>';
    toast.lastChild.textContent = message;
    doc.body.appendChild(toast);
    window.setTimeout(function () { toast.classList.add('is-in'); }, 20);
    window.setTimeout(function () {
      toast.classList.remove('is-in');
      window.setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 320);
    }, 7000);
  }

  /* -------------------------------------------------------
     7. Forms — LeadrVision
     Every form posts to the same endpoint. Without JS the
     browser performs a normal POST and comes back with
     ?submitted=1. With JS we POST JSON and confirm inline.
     ------------------------------------------------------- */
  var forms = $$('form.lead-form');

  function setStatus(form, message, isError) {
    var status = $('.form-status', form);
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
    status.classList.toggle('is-error', !!isError);
  }

  function markSent(form, message) {
    form.classList.add('is-sent');
    setStatus(form, message, false);
    var status = $('.form-status', form);
    if (status) status.setAttribute('tabindex', '-1');
  }

  function syncPageField(form) {
    var pageField = form.querySelector('input[name="_page"]');
    if (!pageField) {
      pageField = doc.createElement('input');
      pageField.type = 'hidden';
      pageField.name = '_page';
      form.appendChild(pageField);
    }
    pageField.value = window.location.href;
    return pageField;
  }

  function formToPayload(form) {
    var payload = {};
    var data = new FormData(form);
    data.forEach(function (value, key) {
      var val = typeof value === 'string' ? value : '';
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        payload[key] = String(payload[key]) + ', ' + val;
      } else {
        payload[key] = val;
      }
    });
    return payload;
  }

  function handleSubmit(event) {
    var form = event.currentTarget;

    // Honeypot: silently accept and discard bot submissions.
    var trap = form.querySelector('input[name="_gotcha"]');
    if (trap && trap.value) {
      event.preventDefault();
      markSent(form, SUCCESS_TEXT);
      return;
    }

    // Native validation still applies before we take over.
    if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
      return;
    }

    event.preventDefault();
    syncPageField(form);

    var payload = formToPayload(form);
    payload._page = window.location.href;

    var button = form.querySelector('button[type="submit"]');
    var originalLabel = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }

    fetch(form.getAttribute('action') || FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Request failed: ' + response.status);
        return response.text().then(function (text) {
          var json = null;
          try { json = JSON.parse(text); } catch (err) { json = null; }
          if (json && json.ok === false) throw new Error('Submission rejected');
          return json;
        });
      })
      .then(function () {
        markSent(form, SUCCESS_TEXT);
        showToast(SUCCESS_TEXT);
        if (form.id === 'newsletterForm') form.reset();
      })
      .catch(function () {
        // Network or endpoint problem: fall back to the plain HTML POST so the
        // visitor's details still reach LeadrVision.
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        HTMLFormElement.prototype.submit.call(form);
      });
  }

  forms.forEach(function (form) {
    if (!form.getAttribute('action')) form.setAttribute('action', FORM_ENDPOINT);
    if (!form.getAttribute('method')) form.setAttribute('method', 'POST');
    syncPageField(form);

    var honeypot = form.querySelector('input[name="_gotcha"]');
    if (!honeypot) {
      honeypot = doc.createElement('input');
      honeypot.type = 'text';
      honeypot.name = '_gotcha';
      honeypot.tabIndex = -1;
      honeypot.autocomplete = 'off';
      honeypot.style.display = 'none';
      honeypot.setAttribute('aria-hidden', 'true');
      form.appendChild(honeypot);
    }

    form.addEventListener('submit', handleSubmit);
  });

  /* -------------------------------------------------------
     8. Plain-HTML submission return: ?submitted=1
     ------------------------------------------------------- */
  var params = new URLSearchParams(window.location.search);
  if (params.get('submitted') === '1') {
    var primaryForm = $('#quoteForm');
    if (primaryForm) markSent(primaryForm, SUCCESS_TEXT);
    showToast(SUCCESS_TEXT);

    var contactSection = $('#contact');
    if (contactSection && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.setTimeout(function () {
        contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } else if (contactSection) {
      contactSection.scrollIntoView({ block: 'start' });
    }
  }
})();
