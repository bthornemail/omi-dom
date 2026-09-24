/**
 * Prolog-style Horn resolution for BusyBox self-healing (pure JS)
 *
 * Rules: error(Kind) → recover(Action)
 */
'use strict';

const RULES = [
  { head: 'resolve', when: { kind: 'unknown_command' }, action: 'fallback' },
  { head: 'resolve', when: { kind: 'invalid_input' }, action: 'sanitize' },
  { head: 'resolve', when: { kind: 'stream_broken' }, action: 'reconnect' },
  { head: 'resolve', when: { kind: 'version_mismatch' }, action: 'upgrade' },
  { head: 'resolve', when: { kind: 'state_corrupt' }, action: 'reset' },
  { head: 'resolve', when: { kind: 'unknown' }, action: 'default' }
];

const COMPAT_MIN = '1.36.0';
const COMPAT_MAX = '2.0.0';

function classifyMessage(msg) {
  const m = String(msg || '').toLowerCase();
  if (m.includes('not found') || m.includes('unknown command')) return 'unknown_command';
  if (m.includes('invalid')) return 'invalid_input';
  if (m.includes('stream') || m.includes('ePIPE') || m.includes('epipe')) return 'stream_broken';
  if (m.includes('version')) return 'version_mismatch';
  if (m.includes('corrupt')) return 'state_corrupt';
  return 'unknown';
}

function unify(when, facts) {
  for (const k of Object.keys(when)) {
    if (facts[k] !== when[k]) return false;
  }
  return true;
}

function resolve(error) {
  const kind = error.kind || classifyMessage(error.message);
  const facts = { kind };
  for (const rule of RULES) {
    if (rule.head === 'resolve' && unify(rule.when, facts)) {
      return { kind, action: rule.action, rule: rule.when };
    }
  }
  return { kind, action: 'default', rule: null };
}

function cmpVer(a, b) {
  for (let i = 0; i < 3; i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

function compatibleVersion(v) {
  const parse = (s) => String(s).replace(/-.*$/, '').split('.').map((x) => parseInt(x, 10) || 0);
  const a = parse(v);
  const lo = parse(COMPAT_MIN);
  const hi = parse(COMPAT_MAX);
  return cmpVer(a, lo) >= 0 && cmpVer(a, hi) <= 0;
}
function recover(action, error, ctx) {
  ctx = ctx || {};
  switch (action) {
    case 'fallback':
      return {
        healed: true,
        out: 'help: known applets echo|cat|xor|true|false — tried: ' + (error.command || '')
      };
    case 'sanitize':
      return {
        healed: true,
        out: String(error.input || error.message || '').replace(/[^\w\s.-]/g, '')
      };
    case 'reconnect':
      return { healed: true, out: 'streams reconnected (virtual)' };
    case 'upgrade':
      return {
        healed: true,
        out: 'compat mode ' + COMPAT_MIN + '..' + COMPAT_MAX
      };
    case 'reset':
      if (typeof ctx.reset === 'function') ctx.reset();
      return { healed: true, out: 'state reset' };
    default:
      return { healed: true, out: 'default recovery' };
  }
}

function selfHeal(error, ctx) {
  const step = resolve(error);
  const result = recover(step.action, error, ctx);
  return { ...step, ...result };
}

function selfTest() {
  const results = [];
  const assert = (name, cond) => results.push({ name, pass: !!cond });
  assert('classify not found', classifyMessage('command not found') === 'unknown_command');
  const r = resolve({ kind: 'unknown_command' });
  assert('resolve fallback', r.action === 'fallback');
  const h = selfHeal({ kind: 'invalid_input', input: 'a<script>' });
  assert('sanitize healed', h.healed && String(h.out).indexOf('<') === -1);
  assert('compat 1.36', compatibleVersion('1.36.0'));
  assert('compat 2.0', compatibleVersion('2.0.0'));
  assert('incompat 3.0', !compatibleVersion('3.0.0'));
  const failed = results.filter((x) => !x.pass);
  return { passed: failed.length === 0, total: results.length, failed: failed.length, results };
}

module.exports = {
  RULES,
  classifyMessage,
  resolve,
  recover,
  selfHeal,
  compatibleVersion,
  COMPAT_MIN,
  COMPAT_MAX,
  selfTest
};
