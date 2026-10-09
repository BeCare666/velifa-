/*!
 * Widget d'audit VELIFA pour sites d'agences (marque blanche).
 * <div id="velifa-audit"></div>
 * <script src="https://…/widget.js" data-key="CLÉ" data-api="https://…/api/v1" async></script>
 * Options : data-lang="ar|en|fr" (sinon langue de l'agence), data-target="id-du-conteneur".
 */
(function () {
  'use strict';
  var script = document.currentScript;
  if (!script) return;
  var KEY = script.getAttribute('data-key') || '';
  var API = (script.getAttribute('data-api') || '').replace(/\/+$/, '');
  if (!/^[0-9a-f]{32}$/.test(KEY) || !/^https?:\/\//.test(API)) { console.warn('[audit widget] data-key / data-api manquants'); return; }

  var T = {
    fr: { title: 'Testez la vitesse de votre site', url: 'Adresse de votre site', email: 'Votre email', phone: 'WhatsApp (avec indicatif, facultatif)',
          name: 'Votre nom (facultatif)', submit: 'Lancer l’audit gratuit', running: 'Audit en cours (30 à 60 secondes)…',
          score: 'Score de performance mobile', follow: '{agency} vous recontacte avec le rapport détaillé et les points à corriger.',
          consent: 'Vos coordonnées sont transmises à {agency} pour vous envoyer le résultat.',
          errContact: 'Indiquez votre email ou un numéro WhatsApp avec indicatif (+…).', errUrl: 'Adresse de site invalide.',
          errLimit: 'Trop de demandes pour le moment. Réessayez plus tard.', errGeneric: 'Une erreur est survenue. Réessayez.',
          errTimeout: 'L’audit prend plus de temps que prévu : {agency} vous enverra le résultat.', failed: 'L’audit n’a pas pu aboutir pour ce site.' },
    en: { title: 'Test your website speed', url: 'Your website address', email: 'Your email', phone: 'WhatsApp (with country code, optional)',
          name: 'Your name (optional)', submit: 'Run the free audit', running: 'Audit running (30 to 60 seconds)…',
          score: 'Mobile performance score', follow: '{agency} will contact you with the detailed report and what to fix.',
          consent: 'Your details are shared with {agency} to send you the result.',
          errContact: 'Enter your email or a WhatsApp number with country code (+…).', errUrl: 'Invalid website address.',
          errLimit: 'Too many requests right now. Please try again later.', errGeneric: 'Something went wrong. Please try again.',
          errTimeout: 'The audit is taking longer than expected: {agency} will send you the result.', failed: 'The audit could not be completed for this site.' },
    ar: { title: 'اختبر سرعة موقعك', url: 'عنوان موقعك', email: 'بريدك الإلكتروني', phone: 'واتساب (مع رمز الدولة، اختياري)',
          name: 'اسمك (اختياري)', submit: 'ابدأ التدقيق المجاني', running: 'جارٍ التدقيق (30 إلى 60 ثانية)…',
          score: 'نتيجة الأداء على الجوال', follow: 'ستتواصل معك {agency} بالتقرير المفصل والنقاط التي يجب إصلاحها.',
          consent: 'تُرسل بياناتك إلى {agency} لإرسال النتيجة إليك.',
          errContact: 'أدخل بريدك الإلكتروني أو رقم واتساب مع رمز الدولة (+…).', errUrl: 'عنوان موقع غير صالح.',
          errLimit: 'طلبات كثيرة حالياً. حاول لاحقاً.', errGeneric: 'حدث خطأ. حاول مرة أخرى.',
          errTimeout: 'يستغرق التدقيق وقتاً أطول من المتوقع: سترسل لك {agency} النتيجة.', failed: 'تعذّر إكمال التدقيق لهذا الموقع.' }
  };

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  function request(method, path, body) {
    return fetch(API + '/widget/' + KEY + path, {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'omit'
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) { var err = new Error(json.message || res.status); err.status = res.status; throw err; }
        return json.data !== undefined ? json.data : json;
      });
    });
  }

  function mount(cfg) {
    var lang = script.getAttribute('data-lang') || cfg.locale || 'en';
    var t = T[lang] || T.en;
    var color = /^#[0-9a-fA-F]{6}$/.test(cfg.brandColor) ? cfg.brandColor : '#1A73E8';
    var agency = cfg.name || '';
    var fill = function (s) { return s.replace('{agency}', agency); };

    var targetId = script.getAttribute('data-target') || 'velifa-audit';
    var host = document.getElementById(targetId);
    if (!host) { host = el('div', { id: targetId }); script.parentNode.insertBefore(host, script.nextSibling); }
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    var style = el('style', {}, [
      ':host{all:initial}',
      '.w{font-family:system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;max-width:420px;border:1px solid #e3e3e3;border-radius:10px;padding:18px;background:#fff;color:#1a1a1a;box-sizing:border-box}',
      '.w *{box-sizing:border-box}',
      'h3{margin:0 0 12px;font-size:17px;border-inline-start:4px solid ' + color + ';padding-inline-start:8px}',
      'input{width:100%;margin:0 0 8px;padding:9px 10px;border:1px solid #ccc;border-radius:6px;font:inherit;font-size:14px}',
      'button{width:100%;padding:10px;border:0;border-radius:6px;background:' + color + ';color:#fff;font:inherit;font-weight:700;cursor:pointer}',
      'button[disabled]{opacity:.6;cursor:default}',
      '.small{font-size:11px;color:#666;margin:8px 0 0}',
      '.err{color:#b3261e;font-size:13px;margin:6px 0 0}',
      '.score{font-size:44px;font-weight:800;text-align:center;margin:6px 0}',
      '.center{text-align:center}'
    ].join(''));

    var box = el('div', { 'class': 'w', dir: lang === 'ar' ? 'rtl' : 'ltr', lang: lang });
    var form = el('form', { novalidate: '' });
    var url = el('input', { type: 'url', required: '', placeholder: t.url, 'aria-label': t.url, dir: 'ltr', maxlength: '2048' });
    var email = el('input', { type: 'email', placeholder: t.email, 'aria-label': t.email, dir: 'ltr', maxlength: '255' });
    var phone = el('input', { type: 'tel', placeholder: t.phone, 'aria-label': t.phone, dir: 'ltr', maxlength: '32' });
    var name = el('input', { type: 'text', placeholder: t.name, 'aria-label': t.name, maxlength: '120' });
    var submit = el('button', { type: 'submit' }, t.submit);
    var error = el('p', { 'class': 'err', role: 'alert' });
    form.appendChild(url); form.appendChild(email); form.appendChild(phone); form.appendChild(name);
    form.appendChild(submit); form.appendChild(error);
    form.appendChild(el('p', { 'class': 'small' }, fill(t.consent)));
    box.appendChild(el('h3', {}, t.title));
    box.appendChild(form);
    root.appendChild(style);
    root.appendChild(box);

    function showResult(nodes) {
      box.removeChild(form);
      nodes.forEach(function (n) { box.appendChild(n); });
    }

    function poll(id, startedAt, status) {
      request('GET', '/analyses/' + encodeURIComponent(id)).then(function (s) {
        if (s.status === 'completed' && s.scorePerformance != null) {
          var sc = s.scorePerformance;
          var c = sc >= 90 ? '#0C9E52' : sc >= 50 ? '#C77700' : '#D93025';
          status.remove();
          box.appendChild(el('p', { 'class': 'center' }, t.score));
          var big = el('div', { 'class': 'score' }, sc + '/100'); big.style.color = c;
          box.appendChild(big);
          box.appendChild(el('p', { 'class': 'center' }, fill(t.follow)));
        } else if (s.status === 'failed') {
          status.textContent = t.failed + ' ' + fill(t.follow);
        } else if (Date.now() - startedAt > 150000) {
          status.textContent = fill(t.errTimeout);
        } else {
          setTimeout(function () { poll(id, startedAt, status); }, 4000);
        }
      }).catch(function () { status.textContent = fill(t.errTimeout); });
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      error.textContent = '';
      var u = url.value.trim();
      if (!u) { error.textContent = t.errUrl; return; }
      if (!/^[a-z]+:\/\//i.test(u)) u = 'https://' + u;
      if (!email.value.trim() && !phone.value.trim()) { error.textContent = t.errContact; return; }
      submit.disabled = true;
      request('POST', '/audit', {
        url: u, email: email.value.trim() || undefined, phone: phone.value.trim() || undefined,
        name: name.value.trim() || undefined, locale: lang
      }).then(function (res) {
        var status = el('p', { 'class': 'center' }, t.running);
        showResult([status]);
        poll(res.id, Date.now(), status);
      }).catch(function (e) {
        submit.disabled = false;
        var m = String(e.message);
        error.textContent = e.status === 429 ? t.errLimit
          : (m === 'contact_required' || m === 'phone_international' || m === 'phone_invalid') ? t.errContact
          : m === 'url_invalid' ? t.errUrl : t.errGeneric;
      });
    });
  }

  request('GET', '/config').then(mount).catch(function (e) {
    console.warn('[audit widget] désactivé : ' + e.message);
  });
})();
