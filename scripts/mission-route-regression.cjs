const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'apps/web/src/app/api/missions/route.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
assert.equal(compiled.diagnostics.length, 0);
async function run(user, execute, sessionError = false) {
  const env = Object.freeze({ DATABASE_URL: 'postgresql://test.invalid/example' });
  const exports = {};
  const modules = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '../demo-store': { executeMission: execute, listMissions: async () => [] },
    '../../server/session': { getCurrentUser: async () => { if (sessionError) throw new Error('unavailable'); return user; } },
    '../../server/db': { hasDatabaseUrl: () => Boolean(env.DATABASE_URL) }
  };
  vm.runInNewContext(compiled.outputText, { exports, require: name => { assert.ok(modules[name], name); return modules[name]; }, process: { env }, console: { error() {} } });
  return exports.POST({ json: async () => ({ userId: 'untrusted', organizationId: 'untrusted', input: { rawPrompt: 'Explique frações' } }) });
}
(async () => {
  let calls = 0;
  const user = { id: 'teacher', organizationId: 'private' };
  const failure = await run(user, async () => { calls++; throw new Error('database failure'); });
  assert.equal(failure.status, 503);
  assert.equal(calls, 1, 'must not retry with persistence disabled');
  assert.equal(failure.body.missionId, undefined, 'must not fabricate saved materials');
  const unauthorized = await run(null, async () => { throw new Error('must not execute'); });
  assert.equal(unauthorized.status, 401);
  const sessionFailure = await run(null, async () => {}, true);
  assert.equal(sessionFailure.status, 503);
  const success = await run(user, async input => {
    assert.equal(input.userId, 'teacher');
    assert.equal(input.organizationId, 'private');
    return { missionId: 'saved-mission' };
  });
  assert.equal(success.status, 200);
  assert.equal(success.body.missionId, 'saved-mission');
  console.log('PASS: failure, authentication, session failure, ownership and successful persistence contract');
})().catch(error => { console.error(error); process.exitCode = 1; });
