/* OblivionAgent: harness model (plan -> tool -> observe -> evaluate -> stop). It executes only registered tools with least privilege. It is an interface for a future backend, not live agent execution. */
(function (w) {
  'use strict';
  const RO = ['search.query', 'data.getProject'];
  const ROLES = [
    ['coding', 'Coding', 18], ['research', 'Research', 9], ['testing', 'Testing', 8], ['documentation', 'Documentation', 7], ['architecture', 'Architecture', 6], ['security', 'Security analysis', 8],
    ['data', 'Data', 9], ['game', 'Game development', 10], ['release', 'Build and release', 5], ['ui', 'UI', 6], ['qa', 'QA', 6], ['analysis', 'Analysis', 4], ['pm', 'Project management', 4]
  ].map(([id, label, count]) => Object.freeze({ id, label, count, capabilities: [label.toLowerCase() + ' tasks'], tools: Object.freeze(id === 'data' || id === 'analysis' ? RO.concat(['python.run']) : RO.slice(0, 1)),
    permission: id === 'security' ? 'read-only, review required' : 'read-only', input: { task: 'string' }, output: { result: 'string' }, timeoutMs: 10000, retries: 1 }));
  const TOOLS = new Map(); const tasks = new Map(); const MAX_STEPS = 4;
  function registerTool(t) { if (!/^(github|search|data|python|project|system|research|ui)\.[A-Za-z]+$/.test(t.name)) throw new Error('bad tool name'); TOOLS.set(t.name, Object.freeze(t)); }
  registerTool({ name: 'search.query', description: 'Query the local index', scope: 'read', timeoutMs: 3000, run: async (i) => OblivionRetrieval.query(i.q, 5) });
  registerTool({ name: 'data.getProject', description: 'Get a verified project record', scope: 'read', timeoutMs: 1000, run: async (i) => OblivionData.projects.find((p) => p.id === i.id) || null });
  registerTool({ name: 'python.run', description: 'Run a named Python analysis module', scope: 'compute', timeoutMs: 45000, run: async (i) => OblivionPython.run(i.module, i.payload) });
  const role = (id) => ROLES.find((r) => r.id === id);
  function create(roleId, goal) {
    const r = role(roleId); if (!r) throw new Error('unknown role'); const t = { id: OblivionCore.uid('task'), role: roleId, goal: OblivionSecurity.safeText(goal, 300), state: 'CREATED', steps: [], checkpoints: [], approved: false, result: null };
    tasks.set(t.id, t); if (tasks.size > 50) tasks.delete(tasks.keys().next().value); return t;
  }
  const to = (t, s) => { t.state = s; t.checkpoints.push({ state: s, at: Date.now() }); };
  async function run(taskId) {
    const t = tasks.get(taskId), r = t && role(t.role); if (!t) throw new Error('unknown task');
    to(t, 'PLANNING'); const plan = [{ tool: 'search.query', input: { q: t.goal } }]; to(t, 'READY'); to(t, 'RUNNING');
    for (const s of plan.slice(0, MAX_STEPS)) {
      if (!r.tools.includes(s.tool)) { t.steps.push({ tool: s.tool, denied: true }); to(t, 'FAILED'); return t; }
      try { const obs = await OblivionCore.withTimeout(TOOLS.get(s.tool).run(s.input), TOOLS.get(s.tool).timeoutMs, s.tool); t.steps.push({ tool: s.tool, observation: Array.isArray(obs) ? obs.length + ' results' : 'ok' }); t.result = obs; }
      catch (e) { t.steps.push({ tool: s.tool, error: e.message }); to(t, e.message.includes('timed out') ? 'TIMEOUT' : 'FAILED'); return t; }
    }
    to(t, 'REVIEW'); return t; // stops here: a human must approve
  }
  function approve(taskId) { const t = tasks.get(taskId); if (t && t.state === 'REVIEW') { t.approved = true; to(t, 'COMPLETED'); } return t; }
  w.OblivionAgent = Object.freeze({ init: () => {}, roles: () => ROLES, registerTool, tools: () => Array.from(TOOLS.keys()), create, run, approve, cancel: (id) => { const t = tasks.get(id); if (t && !['COMPLETED', 'FAILED'].includes(t.state)) to(t, 'CANCELLED'); return t; },
    model: 'ORGANIZATIONAL MODEL', liveExecution: false });
})(window);
