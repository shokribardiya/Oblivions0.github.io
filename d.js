/* OblivionSecurity: the only place that escapes, validates URLs, or touches storage. Client-side hardening only; it is not authorization. */
(function (w) {
  'use strict';
  const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const ORIGINS = new Set(['github.com', 'shokribardiya.github.io', 'x.com', 'medium.com']);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => MAP[c]);
  const safeText = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max || 500);
  const isAllowedOrigin = (host) => ORIGINS.has(String(host).toLowerCase());
  function safeUrl(u) {
    try { const x = new URL(String(u), location.href); if (x.protocol === 'https:' && isAllowedOrigin(x.hostname) && !x.username) return x.href; } catch (e) {}
    return '#';
  }
  function validateGithubUrl(u) {
    try { const x = new URL(String(u)); return x.protocol === 'https:' && x.hostname === 'github.com' && /^\/shokribardiya(\/[\w.-]+)?\/?$/.test(x.pathname); } catch (e) { return false; }
  }
  function validateProviderUrl(u, allowLocal) {
    try { const x = new URL(String(u));
      if (x.protocol === 'https:') return true;
      return !!allowLocal && x.protocol === 'http:' && (x.hostname === 'localhost' || x.hostname === '127.0.0.1');
    } catch (e) { return false; }
  }
  function safeExternalLink(url, label) {
    const a = document.createElement('a'); a.href = safeUrl(url); a.textContent = safeText(label || url, 120);
    a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  }
  const safeHtml = esc;                       // no raw HTML is accepted anywhere
  const sanitizeFragment = (s) => safeText(s, 5000); // README and remote text are rendered as plain text only
  function validateInput(v, o) {
    o = o || {}; const s = String(v == null ? '' : v);
    if (s.length > (o.max || 500)) return { ok: false, reason: 'too long' };
    if (o.pattern && !o.pattern.test(s)) return { ok: false, reason: 'invalid format' };
    return { ok: true, value: safeText(s, o.max || 500) };
  }
  function constantTimeCompare(a, b) {
    a = String(a); b = String(b); let d = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return d === 0;
  }
  const redactSecrets = (s) => String(s).replace(/(sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._-]{12,})/g, '[redacted]');
  function safeJsonParse(t, fallback) {
    try { return JSON.parse(String(t), (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v)); } catch (e) { return fallback; }
  }
  function safeStorageRead(key, fallback) { try { const r = localStorage.getItem('obl:' + key); return r == null ? fallback : safeJsonParse(r, fallback); } catch (e) { return fallback; } }
  function safeStorageWrite(key, val) { try { localStorage.setItem('obl:' + key, JSON.stringify(val)); return true; } catch (e) { return false; } }
  w.OblivionSecurity = Object.freeze({ esc, safeAttr: esc, safeText, safeUrl, safeExternalLink, safeHtml, sanitizeFragment, isAllowedHost: isAllowedOrigin, isAllowedOrigin,
    validateInput, validateGithubUrl, validateProviderUrl, constantTimeCompare, redactSecrets, safeJsonParse, safeStorageRead, safeStorageWrite });
})(window);
