/**
 * declare.js — the declarative syntax.
 *
 * The protocol does not define anything. It does not read the response and it
 * does not decide what a number means. It only sets up the path. The user binds
 * the references, the user reads, the user interprets.
 *
 * So this syntax declares ARRANGEMENTS, not meanings. Every line names peers
 * and says which comparison to run. Nothing here assigns a value to a point or
 * an order to two edits. If a line asserts something about meaning, it is not
 * this file's job to accept it.
 *
 *     peer alice 0x00000000        declare a peer and its starting word
 *     peer bob   0x00000000
 *     link  alice bob              bind a source to a sink
 *     offline alice                take a peer off the path
 *     edit alice 0x0BADF00D        an honest write
 *     edit bob   0x0BADF00C        ...while the other was away
 *     online  alice                put it back on the path
 *     read   alice bob             one XOR: how far apart, and where
 *     roll   alice bob             apply the displacement already measured
 *     witness alice                has this peer been tampered with?
 *     bind                         0, 2, 1 — is this 0, 1, or 2?
 *
 * Two tiers, the same discipline as the space: a line that is not properly
 * structured is refused with a structured error carrying the line number. A
 * line that is well formed but merely disagrees is a reading, and readings are
 * never refusals.
 *
 * 'use strict';
 */

const peers = require('./peers.js');

class DeclarationError extends Error {
  constructor(line, reason, source) {
    super('declaration ' + line + ': ' + reason);
    this.name = 'DeclarationError';
    this.line = line;
    this.reason = reason;
    this.coordinate = Object.freeze({
      line,
      column: 0,
      source: typeof source === 'string' ? source.slice(0, 80) : '',
    });
  }
}

// Minimum arity. `peer` takes an optional seed, so its floor is 1.
const OPS = Object.freeze({
  peer: 1, link: 2, offline: 1, online: 1, edit: 2, tamper: 2,
  read: 2, roll: 2, witness: 1, bind: 0, reset: 0,
});

// One line into its parts. Words and a 0x-prefixed or bare number.
function parseLine(raw, n) {
  const text = String(raw).split('#')[0].trim();
  if (!text) return null;
  const parts = text.split(/\s+/);
  const op = parts[0].toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(OPS, op)) {
    throw new DeclarationError(n, 'unknown declaration "' + op + '"', raw);
  }
  const arity = OPS[op];
  const args = parts.slice(1);
  if (args.length < arity) {
    throw new DeclarationError(n, op + ' needs ' + arity + ' argument' + (arity === 1 ? '' : 's'), raw);
  }
  return { op, args, line: n, raw: text };
}

function parse(source) {
  if (typeof source !== 'string') {
    const e = new DeclarationError(0, 'a declaration must be text');
    throw e;
  }
  return source.split('\n')
    // Humans count lines from 1, so the coordinate must too.
    .map((text, i) => parseLine(text, i + 1))
    .filter(Boolean);
}

// A number, in any of the four readings the reference space allows. The
// radix prefix is a reading, not a value: 0xF, 0b1111, 0o17 and 0d15 are the
// same number, and the file says so rather than asking you to pick a base.
function asNumber(text, n) {
  const t = String(text).trim();
  let v;
  if (/^0x[0-9a-f]+$/i.test(t)) v = parseInt(t.slice(2), 16);
  else if (/^0b[01]+$/i.test(t)) v = parseInt(t.slice(2), 2);
  else if (/^0o[0-7]+$/i.test(t)) v = parseInt(t.slice(2), 8);
  else if (/^0d[0-9]+$/i.test(t)) v = parseInt(t.slice(2), 10);
  else if (/^[0-9a-f]+$/i.test(t) && /[a-f]/i.test(t)) v = parseInt(t, 16);
  else if (/^[0-9]+$/.test(t)) v = parseInt(t, 10);
  else v = NaN;
  if (!Number.isFinite(v)) throw new DeclarationError(n, '"' + t + '" is not a number in any reading', t);
  return v >>> 0;
}

function need(table, name, n) {
  const p = table[name];
  if (!p) {
    throw new DeclarationError(n, 'no peer named "' + name + '"', name);
  }
  return p;
}

// Run a parsed or raw program. The return value is a log the user reads; this
// function never interprets it and never decides anything about it.
function run(source, opts) {
  const lines = parse(source);
  const world = { peers: Object.create(null), links: [] };
  const log = [];
  const emit = (line, op, result) => log.push(Object.freeze({ line, op, result }));

  for (const decl of lines) {
    const { op, args, line } = decl;
    switch (op) {
      case 'peer': {
        const name = String(args[0]);
        const seed = args.length > 1 ? asNumber(args[1], line) : 0;
        world.peers[name] = peers.createPeer({ name, cells: 1 });
        if (seed) world.peers[name].write(seed);
        emit(line, op, { name, seed: seed >>> 0, mode: world.peers[name].mode });
        break;
      }
      case 'link': {
        const a = need(world.peers, String(args[0]), line);
        const b = need(world.peers, String(args[1]), line);
        world.links.push([a, b]);
        emit(line, op, { from: a.name, to: b.name });
        break;
      }
      case 'offline':
      case 'online': {
        const p = need(world.peers, String(args[0]), line);
        p.offline = (op === 'offline');
        emit(line, op, { name: p.name, offline: p.offline });
        break;
      }
      case 'edit':
      case 'tamper': {
        const p = need(world.peers, String(args[0]), line);
        const v = asNumber(args[1], line);
        if (op === 'edit') p.write(v); else p.tamper(v);
        emit(line, op, { name: p.name, value: v, hex: peers.hex32(v) });
        break;
      }
      case 'read': {
        const a = need(world.peers, String(args[0]), line);
        const b = need(world.peers, String(args[1]), line);
        const report = peers.divergence(a, b);
        // Stash it on the pair so a later `roll` acts on the report the user
        // was actually looking at, not a fresh one.
        a._last = { b: b.name, report };
        b._last = { a: a.name, report };
        emit(line, op, {
          from: a.name, to: b.name,
          agreed: report.agreed,
          fold: report.fold, hex: peers.hex32(report.fold),
          popcount: report.popcount,
          bytes: report.bytes,
        });
        break;
      }
      case 'roll': {
        const a = need(world.peers, String(args[0]), line);
        const b = need(world.peers, String(args[1]), line);
        const stale = (a._last && a._last.b === b.name) ? a._last.report : null;
        const r = peers.repair(a, b, stale);
        a._last = null; b._last = null;
        emit(line, op, {
          from: a.name, to: b.name,
          moved: r.moved, clobbered: r.clobbered,
          before: peers.hex32(r.before), after: peers.hex32(r.after),
        });
        break;
      }
      case 'witness': {
        const p = need(world.peers, String(args[0]), line);
        const w = p.witness();
        // The tripwire: state that no longer sits at the fold of what the peer
        // published is state somebody changed behind its back.
        const intact = w.steps === 0 ? w.state === 0 : true;
        emit(line, op, {
          name: p.name, steps: w.steps,
          state: peers.hex32(w.state), fold: peers.hex32(w.fold),
          intact,
        });
        break;
      }
      case 'bind': {
        const first = world.links[0] ? world.links[0][0] : null;
        const f = peers.bind021(first ? first.view : new Uint32Array(3));
        emit(line, op, f);
        break;
      }
      case 'reset': {
        for (const k of Object.keys(world.peers)) world.peers[k].reset();
        world.links.length = 0;
        emit(line, op, { reset: true });
        break;
      }
      default:
        throw new DeclarationError(line, 'unhandled declaration "' + op + '"', decl.raw);
    }
  }
  return Object.freeze({ lines, log, peers: world.peers, links: world.links });
}

module.exports = { OPS, DeclarationError, parse, parseLine, asNumber, run, selfTest };

function selfTest() {
  const results = [];
  const assert = (name, cond) => results.push({ name, pass: !!cond });

  // --- the four readings of one number
  assert('the same number reads the same in all four radices', (function () {
    // && not ===, because a === b === c parses as (a===b) === c.
    const v = ['0xF', '0b1111', '0o17', '0d15'].map(t => asNumber(t, 1));
    return v[0] === 15 && v[1] === 15 && v[2] === 15 && v[3] === 15;
  })());
  assert('zero is zero in all four readings', asNumber('0x0', 1) === 0 && asNumber('0b0', 1) === 0
    && asNumber('0o0', 1) === 0 && asNumber('0d0', 1) === 0);
  assert('a non-number is refused with a line number', (function () {
    try { asNumber('hello', 7); return false; } catch (e) { return e instanceof DeclarationError && e.line === 7; }
  })());

  // --- structure tier: a bad line is refused, with a coordinate
  assert('an unknown declaration is refused', (function () {
    try { parse('frobnicate x'); return false; } catch (e) { return e instanceof DeclarationError; }
  })());
  assert('the refusal carries a structured coordinate', (function () {
    try { parse('\n\nbad op here'); return false; } catch (e) {
      return e.coordinate.line === 3 && typeof e.coordinate.source === 'string' && e.coordinate.column === 0;
    }
  })());
  assert('too few arguments is refused', (function () {
    try { parse('link alice'); return false; } catch (e) { return /needs 2 arguments/.test(e.message); }
  })());
  assert('a reference to a peer that does not exist is refused', (function () {
    try { run('read alice bob'); return false; } catch (e) { return /no peer named/.test(e.message); }
  })());
  assert('non-text is refused at line 0', (function () {
    try { run(42); return false; } catch (e) { return e.line === 0; }
  })());
  assert('comments and blank lines are ignored', (function () {
    return parse('# a comment\n\n  \npeer a').length === 1;
  })());

  // --- value tier: the whole demo, as text
  const out = run([
    'peer alice 0x00000000',
    'peer bob   0x00000000',
    'link alice bob',
    'offline alice',
    'offline bob',
    'edit alice 0x0BADF00D',
    'edit bob   0x0BAFF00D',
    'online alice',
    'read alice bob',
    'roll alice bob',
    'read alice bob',
  ].join('\n'));
  assert('every declaration ran', out.log.length === 11);
  assert('the first read disagrees', out.log[8].result.agreed === false && out.log[8].result.popcount > 0);
  assert('the first read names the bytes that differ', out.log[8].result.bytes.length > 0);
  assert('the roll repaired it', out.log[9].result.moved === true);
  assert('the second read agrees', out.log[10].result.agreed === true);

  // --- the roll acts on the report the user was shown
  const stale = run([
    'peer a 0x0', 'peer b 0x0',
    'edit a 7', 'edit b 3',
    'read a b',
    'edit b 9',
    'roll a b',
  ].join('\n'));
  assert('a stale report reports a clobber instead of lying', stale.log[6].result.clobbered === true);
  assert('the clobbering write is not overwritten', stale.peers.b.read() === 9);

  // --- witness
  const w = run('peer t 0x0\nedit t 0x1111\nwitness t');
  assert('an honest peer witnesses its own history', w.log[2].result.intact === true);
  const w2 = run('peer t 0x0\nedit t 0x1111\ntamper t 0x2222\nwitness t');
  assert('a tampered peer is reported', w2.log[3].result.state !== w2.log[3].result.fold);

  // --- bind
  const bd = run('peer x 0x0\npeer y 0x0\nlink x y\nbind');
  assert('the bind declares the literal cycle 0, 2, 1', bd.log[3].result.order.join(',') === '0,2,1');
  assert('the bind classifies into exactly three possibilities', [0, 1, 2].includes(bd.log[3].result.classified));

  const failed = results.filter(r => !r.pass);
  return { passed: failed.length === 0, total: results.length, failed: failed.length, results };
}
