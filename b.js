/* OblivionBoot: phased startup. Every phase is isolated; the base page is already rendered before any of this runs. */
(function (w) {
  'use strict';
  const R = w.OblivionRuntime;
  // Order is the phase order: security/state are already loaded synchronously (phases 1-3).
  [['observability', w.OblivionObservability], ['agent', w.OblivionAgent], ['github', w.OblivionGitHub], ['search', w.OblivionRetrieval], ['ai', w.OblivionAIGateway], ['python', w.OblivionPython], ['motion', w.OblivionMotion]]
    .forEach(([n, m]) => { if (m) R.register(n, m); });

  const RL = { LIVE: 'LIVE', CACHED: 'CACHED', STALE: 'CACHED', ONLINE: 'ONLINE', ON_DEMAND: 'ON DEMAND', RATE_LIMITED: 'DEGRADED', DEGRADED: 'DEGRADED', OFFLINE: 'OFFLINE', UNAVAILABLE: 'UNAVAILABLE', ERROR: 'ERROR', INITIALIZING: 'INITIALIZING' };
  function renderStatus() {
    const el = document.getElementById('runtime-status'); if (!el) return; const gh = OblivionState.get('github') || {};
    const rows = R.status().map((s) => { const st = s.name === 'github' ? gh.status : s.name === 'python' ? OblivionState.get('python.status') === 'OFFLINE' ? 'ON_DEMAND' : OblivionState.get('python.status') : s.status;
      return { n: s.name, s: st || 'INITIALIZING' }; });
    el.textContent = ''; const net = document.createElement('div'); net.className = 'rt-row'; const nb = document.createElement('span'); nb.className = 'rt-badge rt-' + (OblivionCore.online() ? 'online' : 'offline'); nb.textContent = OblivionCore.online() ? 'ONLINE' : 'OFFLINE'; const nl = document.createElement('span'); nl.textContent = 'network'; net.append(nb, nl); el.appendChild(net);
    rows.forEach((r) => { const d = document.createElement('div'); d.className = 'rt-row'; const b = document.createElement('span'); b.className = 'rt-badge rt-' + String(RL[r.s] || r.s).toLowerCase().replace(/\s/g, '-'); b.textContent = RL[r.s] || r.s; const l = document.createElement('span'); l.textContent = r.n; d.append(b, l); el.appendChild(d); });
  }
  R.onStateChange(renderStatus); OblivionState.subscribe('github', renderStatus); OblivionState.subscribe('python', renderStatus);
  w.addEventListener('online', renderStatus); w.addEventListener('offline', renderStatus);

  function wireAngra() {
    const btn = document.getElementById('btn-py-run'), out = document.getElementById('py-out'), st = document.getElementById('py-state'); if (!btn) return;
    OblivionState.subscribe('python', (v) => { if (st && v) st.textContent = String(v.status).replace('_', ' '); });
    btn.addEventListener('click', async () => {
      btn.disabled = true; out.textContent = 'Starting the Python runtime. It downloads once and can take a few seconds.';
      try {
        const roles = {}; OblivionAgent.roles().forEach((r) => { roles[r.label] = r.count; });
        const r = await OblivionPython.run('angra_analysis', { roles, tasks: 500 }); const max = Math.max(...r.distribution.map((d) => d[1])); out.textContent = '';
        const h = document.createElement('div'); h.textContent = r.total + ' agents in the organizational model (not live telemetry). Last column: share of a 500-task sample workload.'; out.appendChild(h);
        r.distribution.forEach((d) => { const row = document.createElement('div'); row.className = 'py-bar'; const a = document.createElement('span'); a.textContent = d[0]; const bar = document.createElement('i'); bar.style.width = (d[1] / max * 100) + '%'; const c = document.createElement('span'); c.textContent = r.tasks_per_role[d[0]]; row.append(a, bar, c); out.appendChild(row); });
      } catch (e) { out.textContent = 'Python could not start: ' + OblivionSecurity.safeText(e.message, 120) + ' Check your connection and try again.'; }
      finally { btn.disabled = false; }
    });
  }
  function go() { wireAngra(); renderStatus(); R.start().then(renderStatus); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})(window);
