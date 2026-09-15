(function () {
  var VESTO_KEY = 'vpk_4e7730570bc8e66166d6b3cdb23e5264';
  var ATTRIBUTION_URL = 'https://backend-production-7a466.up.railway.app/api/public/meta/attribution?key=' + encodeURIComponent(VESTO_KEY);
  var NEXT_GROUP_URL = '/api/next-group';
  var FALLBACK_GROUP_URL = 'https://chat.whatsapp.com/HjCaVJiYZOg8C1hv32axwj?s=sw&p=i&mlu=4&ilr=4';
  var busy = false;

  function buildRef() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var suffix = '';
    for (var i = 0; i < 8; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'vst_' + suffix;
  }

  function readMeta() {
    try { return JSON.parse(sessionStorage.getItem('vesto_meta') || '{}'); } catch (_) { return {}; }
  }

  function go(url) {
    // Mesma aba = sem bloqueio de popup no PC e redirect mais rápido.
    location.assign(url || FALLBACK_GROUP_URL);
  }

  function sendAttribution(meta, ref, contactEventId) {
    // Não bloqueia o redirect — dispara em paralelo.
    try {
      fetch(ATTRIBUTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Vesto-Key': VESTO_KEY },
        body: JSON.stringify({
          vestoPublicKey: VESTO_KEY,
          ref: ref,
          contactEventId: contactEventId,
          fbclid: meta.fbclid || null,
          fbc: meta.fbc || null,
          fbp: meta.fbp || null,
          clickAt: meta.clickAt,
          pageUrl: meta.pageUrl,
          userAgent: meta.userAgent,
          utm_source: meta.utm_source || '',
          utm_medium: meta.utm_medium || '',
          utm_campaign: meta.utm_campaign || '',
          utm_content: meta.utm_content || '',
          utm_term: meta.utm_term || '',
        }),
        credentials: 'omit',
        keepalive: true,
      }).catch(function () {});
    } catch (_) {}
  }

  function fetchNextGroup() {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 1200) : null;
    return fetch(NEXT_GROUP_URL, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (res) {
        if (!res.ok) throw new Error('next_group_' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.url) throw new Error('next_group_empty');
        return data.url;
      })
      .catch(function () { return FALLBACK_GROUP_URL; })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('[data-vesto-group]');
    if (!btn || busy) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    busy = true;

    var meta = readMeta();
    meta.clickAt = Date.now();
    meta.pageUrl = location.href;
    meta.userAgent = navigator.userAgent || '';
    var ref = buildRef();
    var contactEventId = 'vst_contact_' + ref.toLowerCase();
    try { sessionStorage.setItem('vesto_ref', ref); } catch (_) {}
    try { sessionStorage.setItem('vesto_contact_event_id', contactEventId); } catch (_) {}

    if (typeof fbq === 'function') {
      try { fbq('track', 'Contact', {}, { eventID: contactEventId }); } catch (_) {}
    }

    sendAttribution(meta, ref, contactEventId);

    fetchNextGroup()
      .then(function (url) { go(url); })
      .catch(function () { go(FALLBACK_GROUP_URL); });
  }, true);
})();
