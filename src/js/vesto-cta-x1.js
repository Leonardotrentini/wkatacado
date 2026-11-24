(function () {
  var VESTO_KEY = 'vpk_4e7730570bc8e66166d6b3cdb23e5264';
  var ATTRIBUTION_URL = 'https://backend-production-7a466.up.railway.app/api/public/meta/attribution?key=' + encodeURIComponent(VESTO_KEY);
  var DEST_URL = 'https://wa.me/5511985712645?text=Vim%20pelas%20camisetas%20de%20time!';
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

  function trackPixel(contactEventId, leadEventId) {
    if (typeof fbq !== 'function') return;
    try {
      fbq('track', 'Lead', {}, { eventID: leadEventId });
      fbq('track', 'Contact', {}, { eventID: contactEventId });
    } catch (_) {}
  }

  function sendAttribution(meta, ref, contactEventId) {
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

  function openDest(preopened) {
    if (preopened && !preopened.closed) {
      try {
        preopened.opener = null;
        preopened.location.href = DEST_URL;
        return true;
      } catch (_) {}
    }
    var win = window.open(DEST_URL, '_blank');
    if (win) return true;
    setTimeout(function () { location.href = DEST_URL; }, 400);
    return false;
  }

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('[data-vesto-group]');
    if (!btn || busy) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    busy = true;

    var preopened = null;
    try { preopened = window.open('about:blank', '_blank'); } catch (_) { preopened = null; }

    var meta = readMeta();
    meta.clickAt = Date.now();
    meta.pageUrl = location.href;
    meta.userAgent = navigator.userAgent || '';
    var ref = buildRef();
    var contactEventId = 'vst_contact_' + ref.toLowerCase();
    var leadEventId = 'vst_lead_' + ref.toLowerCase();
    try { sessionStorage.setItem('vesto_ref', ref); } catch (_) {}
    try { sessionStorage.setItem('vesto_contact_event_id', contactEventId); } catch (_) {}
    try { sessionStorage.setItem('vesto_lead_event_id', leadEventId); } catch (_) {}

    trackPixel(contactEventId, leadEventId);
    sendAttribution(meta, ref, contactEventId);
    openDest(preopened);
    busy = false;
  }, true);
})();
