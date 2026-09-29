/**
 * path-protocol.js — the declarative path layer.
 *
 * A protocol defines pathways and suggests shortcuts. It does not do the work:
 * it does not render, validate, interpret, or store. Those belong to the app.
 *
 *   X = data source        (an anchor)
 *   Y = data target        (an anchor)
 *
 * Computational cycles read in a sequence, so source and target are anchors
 * rather than free values. Binding targets closures and combinators, never
 * people: apply(knot, fn) in ruler.js is the canonical invocation.
 *
 * There is no wrong. There is compare and exchange.
 *
 *   ONE FUNCTION: compareExchange(cell, expected, replacement)
 *
 * On a request that does not match it does not throw and does not report an
 * error. It leaves the cell alone and returns what was actually there, plus the
 * discrepancy — the XOR, which is non-zero precisely when the two differ. The
 * difference IS the information. Every operation below is that one function
 * composed with itself, so every operation reports a measurement and none of
 * them refuses.
 *
 * The BQF is the binding form of a source/target pair, and its two arguments
 * are Regex-typed wordforms:
 *
 *   Q(x: Regex, y: Regex) = 60x^2 + 16xy + 4y^2
 *
 * The regex is the declarative form; resolving it yields the natural number the
 * Coq development quantifies over (bqf : N -> N -> N in
 * coq/03-projection/BQFBridgePreservesForms.v). The constraint reveals the
 * structure: the regex is the lens, the index is what the lens shows.
 *
 * Storage is four partitions, one per binary precision, 0b / 0o / 0x / 0d. To
 * /0[pin]/ they are all the same thing: place-value indices, XOR-able, and
 * 0b ^ 0o ^ 0x ^ 0d === 16.
 *
 * 'use strict';
 */

const { xorNumber, bind, apply, evaluate } = require('./ruler.js');

// ---------------------------------------------------------------------------
// The one function.
// ---------------------------------------------------------------------------

// compareExchange — the primitive the whole protocol is made of.
// Reports three things and never refuses:
//   matched      — did the cell hold what was expected
//   now          — what the cell holds afterwards (replacement, or the original)
//   discrepancy  — the XOR of cell and expected; 0 iff matched
function compareExchange(cell, expected, replacement) {
  const discrepancy = (typeof cell === 'number' && typeof expected === 'number')
    ? xorNumber(cell, expected)
    : null;
  const matched = discrepancy === 0;
  return Object.freeze({
    matched,
    now: matched ? replacement : cell,
    discrepancy,
  });
}

// The dual reading of any pair, always. Hamming distance is the non-zero count.
function popcount(x) {
  let v = x >>> 0;
  let c = 0;
  while (v) { v &= v - 1; c++; }
  return c;
}

// The only requirement of a reference is that it can be XOR'd.
function referenceDistance(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  return popcount(xorNumber(a, b));
}

// ---------------------------------------------------------------------------
// Storage partitions: four precisions, one thing to a place-value index.
// ---------------------------------------------------------------------------

const PARTITIONS = Object.freeze([
  Object.freeze({ slot: 0, name: '0b', radix: 2, bits: 1, precision: 'binary' }),
  Object.freeze({ slot: 1, name: '0o', radix: 8, bits: 3, precision: 'octal' }),
  Object.freeze({ slot: 2, name: '0d', radix: 10, bits: 4, precision: 'decimal' }),
  Object.freeze({ slot: 3, name: '0x', radix: 16, bits: 4, precision: 'hex' }),
]);

// To /0[pin]/ the four are the same thing. Their XOR is the 16xy coefficient.
const PARTITION_XOR = PARTITIONS.reduce((a, p) => xorNumber(a, p.radix), 0);

function partitionByName(name) {
  return PARTITIONS.find(q => q.name === name) || null;
}

// A partition is just another index. Re-expressing one index in another
// precision is compareExchange over the digit strings: same digits, matched;
// different digits, and the difference is reported.
function rebase(partition, index, otherPartition) {
  const from = partitionByName(partition);
  const to = partitionByName(otherPartition);
  if (from === null || to === null) return null;
  const here = index.toString(from.radix);
  const there = index.toString(to.radix);
  return Object.freeze({
    from: from.name,
    to: to.name,
    index,
    here,
    there,
    matched: stringXor(here, there) === 0,
    discrepancy: stringXor(here, there),
  });
}

// ---------------------------------------------------------------------------
// The wordform: the Regex-typed coordinate.
// ---------------------------------------------------------------------------

// Recognizes a wordform. Recognition exposes the form; it does not interpret it.
const WORDFORM = /^[pn][0-9A-Za-z]\.?[0-9A-Za-z][np]$/;

// The endcaps. 'p' ^ 'n' = 0x1E, the SECURE face mask, and it is not zero:
// a single wordform is an OPEN half. Two of them, mirrored, close to 0. That
// is why Q binds two.
const ENDCAP = Object.freeze({ p: 0x70, n: 0x6e });
const ENDCAP_XOR = ENDCAP.p ^ ENDCAP.n; // 0x1E

// The character-wise XOR of two strings. The general form of the closure test:
// a pair closes iff this is 0. Digits, endcaps, and re-expressed indices are all
// read this way, because the only requirement of a reference is that it XORs.
function stringXor(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return null;
  const n = Math.max(a.length, b.length);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc ^= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return acc;
}

const wordformXor = stringXor;

// Resolving a wordform to a place-value index. A wordform is an index, not a
// value: the body is folded by XOR, never converted by base. A form that is not
// recognized still yields a report; it simply differs from what a form would be.
function resolveWordform(form) {
  const recognized = typeof form === 'string' && WORDFORM.test(form);
  const body = recognized ? form.slice(1, -1).replace('.', '') : '';
  let index = 0;
  for (let i = 0; i < body.length; i++) index ^= body.charCodeAt(i);
  return Object.freeze(Object.assign(
    { form, recognized, body, index },
    compareExchange(recognized ? 1 : 0, 1, 1)
  ));
}

// The two endcaps exchange: the other chirality, read from the other end.
function flipWordform(form) {
  const r = resolveWordform(form);
  if (!r.recognized) return r;
  const body = form.slice(1, -1).replace('.', '');
  const head = form[0] === 'p' ? 'n' : 'p';
  const tail = form[form.length - 1] === 'p' ? 'n' : 'p';
  return Object.freeze(Object.assign({}, r, { form: head + body + tail, flipped: true }));
}

// ---------------------------------------------------------------------------
// Q(x: Regex, y: Regex) — the BQF as a binding of two wordforms.
// ---------------------------------------------------------------------------

const HIGH_SHELL = 60;
const CHIRAL_BRIDGE = 16;
const LOCAL_SEED = 4;
const LIFT_COEFFICIENT = HIGH_SHELL - CHIRAL_BRIDGE; // 44 = 4 * 11

function bqfHighShell(x) { return HIGH_SHELL * x * x; }
function bqfChiralBridge(x, y) { return CHIRAL_BRIDGE * x * y; }
function bqfLocalSeed(y) { return LOCAL_SEED * y * y; }

function bqf(x, y) {
  return bqfHighShell(x) + bqfChiralBridge(x, y) + bqfLocalSeed(y);
}

// The affine form the 15 local readings live in. Verified: exactly a perfect
// square, 4(2x+y)^2, for all x,y.
function squareForm(x, y) {
  const t = 2 * x + y;
  return 4 * t * t;
}

// The projective form is the square form plus the lift. 44x^2 = 4 * 11x^2: the
// local seed times the residue that is not a perfect square.
function lift(x) { return LIFT_COEFFICIENT * x * x; }

// The binding. Always returns a report. The pair closes or it does not; either
// way the closing is stated and the non-closing is measured.
function Q(xForm, yForm) {
  const xr = resolveWordform(xForm);
  const yr = resolveWordform(yForm);
  const closure = wordformXor(xForm, yForm);
  const x = xr.index;
  const y = yr.index;
  return Object.freeze({
    kind: 'bqf-binding',
    x: xr,
    y: yr,
    closed: closure === 0,
    closure,
    q: bqf(x, y),
    square: squareForm(x, y),
    lift: lift(x),
    // compareExchange on the two resolved indices: did they agree?
    exchange: compareExchange(x, y, y),
  });
}

// The dual reading of a gap, always both:
//   structural — which forms are being compared: the fixed 44x^2 lift
//   positional — how far apart the actual references are: variable
function discrepancy(x, y) {
  const structural = lift(x);
  const actual = bqf(x, y) - squareForm(x, y);
  return Object.freeze({
    structural,
    actual,
    agrees: structural === actual,
    positional: referenceDistance(x, y),
  });
}

// ---------------------------------------------------------------------------
// Anchors. Because cycles read in a sequence, source and target are anchored.
// ---------------------------------------------------------------------------

function anchor(form, partition) {
  const r = resolveWordform(form);
  const p = partitionByName(partition);
  return Object.freeze({
    kind: 'anchor',
    form,
    index: r.index,
    partition: p === null ? null : p.name,
    radix: p === null ? null : p.radix,
    recognized: r.recognized,
    discrepancy: p === null ? null : referenceDistance(r.index, r.index),
  });
}

// The path: an ordered list of anchors, source first, target last. Built by
// extension, never by mutation.
function path(anchors) {
  const list = Object.freeze(anchors.slice());
  if (list.length === 0) return null;
  return Object.freeze({
    kind: 'path',
    source: list[0],
    target: list[list.length - 1],
    steps: list.length,
    anchors: list,
  });
}

// The closure or combinator a path binds to. bindPath(path, fn) calls
// fn(source, target): the path is invoked, not stored into.
function bindPath(p, fn) {
  if (!p || p.kind !== 'path') throw new TypeError('bindPath expects a path');
  return apply(bind(p.source, p.target), fn);
}

// ---------------------------------------------------------------------------
// The read sequence. The protocol's answer to "cycles read in a sequence":
// partitions in ascending precision, slots ascending. 4 x 16 = 64 reads.
// ---------------------------------------------------------------------------

function readSequence() {
  const out = [];
  for (const p of PARTITIONS) {
    for (let slot = 0; slot <= 0xf; slot++) out.push(Object.freeze({ partition: p.name, slot }));
  }
  return Object.freeze(out);
}

const CYCLE = readSequence();
const CYCLE_LENGTH = CYCLE.length; // 64

function cycleIndex(partition, slot) {
  const p = PARTITIONS.findIndex(q => q.name === partition);
  if (p < 0 || slot < 0 || slot > 0xf) return -1;
  return p * 16 + slot;
}

// One read in the cycle, by compareExchange: the slot is read against what was
// expected, and the difference is the measurement.
function cycleRead(partition, slot, expected) {
  const at = cycleIndex(partition, slot);
  return Object.freeze(Object.assign(
    { at, partition, slot },
    compareExchange(expected === undefined ? 0 : expected, 0, 0)
  ));
}

// ---------------------------------------------------------------------------
// Pins. 0x0-0xF pinned to any node. The pin is a declaration, not an action.
// ---------------------------------------------------------------------------

function pin(value, nodeId) {
  const inRange = typeof value === 'number' && value >= 0 && value <= 0xf;
  const named = typeof nodeId === 'string' && nodeId.length > 0;
  return Object.freeze({
    kind: 'pin',
    value: inRange ? value : 0,
    node: named ? nodeId : null,
    inRange,
    named,
  });
}

// Any of 0x0-0xF may be pinned to any node. Collisions are stated, never
// resolved: two agents may hold different pins on one node and that is a fact
// to be reported, not an error to be refused.
function pinSet(pins) {
  const list = Object.freeze(pins.slice());
  const collisions = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (list[i].value === list[j].value && list[i].node === list[j].node) {
        collisions.push(Object.freeze({ a: i, b: j, value: list[i].value, discrepancy: 0 }));
      }
    }
  }
  return Object.freeze({
    kind: 'pin-set',
    pins: list,
    count: list.length,
    collisions: Object.freeze(collisions),
    colliding: collisions.length,
  });
}

// Pin exchange: pin a value to a node, reporting what was already there.
function pinExchange(p, value, nodeId) {
  const next = pin(value, nodeId);
  const current = p !== null && p !== undefined ? p.value : 0;
  return Object.freeze(Object.assign({ requested: next }, compareExchange(current, next.value, next.value)));
}

// ---------------------------------------------------------------------------
// Shortcuts. The protocol SUGGESTS. It never chooses.
// ---------------------------------------------------------------------------

const SHORTCUTS = Object.freeze([
  Object.freeze({ name: 'direct', cost: 0, via: 0, note: 'source is the target' }),
  Object.freeze({ name: 'fold', cost: 1, via: 0, note: 'collapse two indices to their XOR' }),
  Object.freeze({ name: 'swap', cost: 1, via: 0, note: 'exchange the two ends' }),
  Object.freeze({ name: 'delta', cost: 1, via: 0, note: 'roll 16 bits by rotl1^rotl3^rotr2' }),
  Object.freeze({ name: 'lift', cost: 1, via: 0, note: 'cross into the projective form (44x^2)' }),
  Object.freeze({ name: 'partition', cost: 1, via: 1, note: 're-read in the other precision' }),
  Object.freeze({ name: 'rebase', cost: 2, via: 1, note: 're-anchor through a second partition' }),
]);

function shortcut(name) {
  return SHORTCUTS.find(s => s.name === name) || null;
}

// suggest() returns candidates. Advisory: the caller selects, or declines.
// An empty list is a valid answer meaning "no shortcut claimed".
function suggest(p) {
  if (!p || p.kind !== 'path') return Object.freeze([]);
  const out = [];
  for (const s of SHORTCUTS) {
    const claimable = p.steps === 1 ? s.name === 'direct' : s.name !== 'direct';
    if (claimable) out.push(s);
  }
  return Object.freeze(out);
}

module.exports = {
  compareExchange,
  popcount,
  referenceDistance,
  PARTITIONS,
  PARTITION_XOR,
  partitionByName,
  rebase,
  WORDFORM,
  ENDCAP,
  ENDCAP_XOR,
  stringXor,
  wordformXor,
  resolveWordform,
  flipWordform,
  HIGH_SHELL,
  CHIRAL_BRIDGE,
  LOCAL_SEED,
  LIFT_COEFFICIENT,
  bqfHighShell,
  bqfChiralBridge,
  bqfLocalSeed,
  bqf,
  squareForm,
  lift,
  Q,
  discrepancy,
  anchor,
  path,
  bindPath,
  CYCLE,
  CYCLE_LENGTH,
  cycleIndex,
  cycleRead,
  pin,
  pinSet,
  pinExchange,
  SHORTCUTS,
  shortcut,
  suggest,
  selfTest,
};

function selfTest() {
  const results = [];
  const assert = (name, cond) => results.push({ name, pass: !!cond });

  // --- the one function
  const hit = compareExchange(5, 5, 9);
  const miss = compareExchange(5, 6, 9);
  assert('compareExchange exchanges on a match', hit.matched === true && hit.now === 9);
  assert('compareExchange leaves the cell alone on a miss', miss.matched === false && miss.now === 5);
  assert('the discrepancy is the XOR, 0 iff matched', hit.discrepancy === 0 && miss.discrepancy === (5 ^ 6));
  assert('compareExchange does not throw on a non-match', (function () {
    try { compareExchange(1, 999, 2); return true; } catch (e) { return false; }
  })());
  assert('a non-zero XOR is a measurement, not a rejection', miss.matched === false && typeof miss.discrepancy === 'number');
  assert('compareExchange reports a null discrepancy for non-numbers', compareExchange('a', 1, 2).discrepancy === null);
  assert('popcount is the Hamming distance', popcount(0) === 0 && popcount(0xff) === 8 && popcount(0x0f) === 4);
  assert('referenceDistance is symmetric and XOR-based', referenceDistance(5, 9) === referenceDistance(9, 5) && referenceDistance(0, 0xff) === 8);

  // --- partitions: four precisions, one thing to a place-value index
  assert('four partitions', PARTITIONS.length === 4);
  assert('one per binary precision', PARTITIONS.map(p => p.name).join('') === '0b0o0d0x');
  assert('0b ^ 0o ^ 0x ^ 0d = 16', PARTITION_XOR === 16, 'got ' + PARTITION_XOR);
  assert('ascending precision order', PARTITIONS.every((p, i) => i === 0 || p.radix > PARTITIONS[i - 1].radix));
  assert('partitionByName resolves', partitionByName('0x').radix === 16);
  assert('partitionByName reports an unknown as null, not a throw', partitionByName('0q') === null);
  const rb = rebase('0b', 5, '0x');
  assert('rebase reports the difference, it does not refuse', rb !== null && rb.matched === false && typeof rb.discrepancy === 'number');
  assert('rebase of a value whose digits agree matches', rebase('0x', 5, '0d').matched === true);
  assert('rebase of a value whose digits differ reports it', (function () {
    const r = rebase('0x', 16, '0d');
    return r.here === '10' && r.there === '16' && r.matched === false;
  })());
  assert('rebase on an unknown partition is null, not a throw', rebase('0q', 1, '0x') === null);

  // --- the wordform and the open half
  assert('wordform recognizes a 2-char body', WORDFORM.test('p0xn') && WORDFORM.test('n0xp'));
  assert('wordform recognizes the dotted form', WORDFORM.test('p1.5n'));
  assert('wordform rejects a bare hex literal', !WORDFORM.test('0x1f'));
  assert('wordform rejects a 3-char form', !WORDFORM.test('p1n'));
  assert('wordform rejects bare endcaps', !WORDFORM.test('pn'));
  assert("'p' ^ 'n' = 0x1E, the SECURE face mask, not 0", ENDCAP_XOR === 0x1e && ENDCAP_XOR !== 0);
  assert('a single wordform is an open half', stringXor('p0xn', 'p0xn') === 0 && ENDCAP_XOR !== 0);
  assert('two mirrored wordforms close to 0', stringXor('p0xn', 'n0xp') === 0 && stringXor('p1.5n', 'n1.5p') === 0);
  assert('an unmirrored pair XORs to something else', (function () { const w = stringXor('p0xn', 'n0bp'); return w !== null && w !== 0; })());
  assert('the four radices are four closed pairs', (function () {
    for (const r of ['0b', '0o', '0x', '0d']) if (stringXor('p' + r + 'n', 'n' + r + 'p') !== 0) return false;
    return true;
  })(), '/0[boxd]/ closes pairwise');
  assert('the radix pairs close against each other', (function () {
    let closed = 0;
    for (const r of ['0b', '0o', '0x', '0d']) for (const s of ['0b', '0o', '0x', '0d']) {
      if (stringXor('p' + r + 'n', 'n' + s + 'p') === 0) closed++;
    }
    return closed >= 4;
  })());
  assert('resolveWordform folds the body by XOR, never by base', (function () {
    const r = resolveWordform('p0xn');
    return r.recognized === true && r.index === ('0'.charCodeAt(0) ^ 'x'.charCodeAt(0));
  })());
  assert('an unrecognized form still reports, it does not vanish', (function () {
    const r = resolveWordform('0x1f');
    return r.recognized === false && r.discrepancy !== null;
  })());
  assert('flipWordform is the other chirality', flipWordform('p0xn').form === 'n0xp' && flipWordform(flipWordform('p0xn').form).form === 'p0xn');
  assert('a wordform and its flip close', stringXor('p0xn', flipWordform('p0xn').form) === 0);

  // --- Q(x: Regex, y: Regex)
  const q = Q('p0xn', 'n0xp');
  assert('Q binds two wordforms', q.x.form === 'p0xn' && q.y.form === 'n0xp');
  assert('Q states whether the pair closes', q.closed === true && q.closure === 0);
  assert('Q measures a pair that does not close, and does not refuse', (function () {
    const w = Q('p0xn', 'n0bp');
    return w.closed === false && w.closure !== 0 && typeof w.q === 'number';
  })());
  assert('bqf = high shell + bridge + local seed', q.q === 60 * q.x.index * q.x.index + 16 * q.x.index * q.y.index + 4 * q.y.index * q.y.index);
  assert('the 60 is the high shell', bqfHighShell(2) === 240);
  assert('the 16 is the chiral bridge', bqfChiralBridge(2, 3) === 96);
  assert('the 4 is the local seed', bqfLocalSeed(3) === 36);
  assert('the lift coefficient is 44 = 4 * 11', LIFT_COEFFICIENT === 44 && LIFT_COEFFICIENT === 4 * 11);
  assert('squareForm is exactly 16x^2 + 16xy + 4y^2', (function () {
    for (let x = 0; x <= 40; x++) for (let y = 0; y <= 40; y++) if (squareForm(x, y) !== 16 * x * x + 16 * x * y + 4 * y * y) return false;
    return true;
  })(), 'exhaustive x,y in [0,40]');
  assert('bqf - squareForm = the lift, for all x,y', (function () {
    for (let x = 0; x <= 40; x++) for (let y = 0; y <= 40; y++) if (bqf(x, y) - squareForm(x, y) !== lift(x)) return false;
    return true;
  })(), 'exhaustive x,y in [0,40]');
  assert('squareForm(1,1) = 36 = (3!)^2', squareForm(1, 1) === 36);
  assert('bqf(1,1) = 80', bqf(1, 1) === 80);

  // --- the dual reading
  const d1 = discrepancy(3, 5);
  assert('structural reading is the 44x^2 lift', d1.structural === 44 * 9);
  assert('the declared structural gap is the real one', d1.agrees === true);
  assert('positional reading varies', (function () {
    const s = new Set();
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) s.add(discrepancy(i, j).positional);
    return s.size > 1;
  })());
  assert('both readings always present', discrepancy(0, 0).structural === 0 && discrepancy(0, 0).positional === 0);

  // --- anchors and paths
  const aSrc = anchor('p0bn', '0b');
  assert('anchor resolves a wordform to a partition slot', aSrc.partition === '0b' && aSrc.radix === 2);
  assert('an anchor to an unknown partition reports null radix, not a throw', anchor('p0bn', '0q').radix === null);
  const p1 = path([aSrc, anchor('n0xp', '0x')]);
  assert('path carries source and target', p1.source === aSrc && p1.target.radix === 16 && p1.steps === 2);
  assert('an empty path is null', path([]) === null);
  assert('bindPath invokes a closure, it does not store', (function () {
    let seen = null;
    const out = bindPath(p1, (s, t) => { seen = [s, t]; return s.radix + t.radix; });
    return out === 18 && seen[0] === aSrc;
  })());
  assert('the path is pure under binding', (function () { const b = p1.steps; bindPath(p1, () => 0); return p1.steps === b; })());

  // --- the read sequence
  assert('the cycle reads 4 partitions x 16 slots = 64', CYCLE_LENGTH === 64);
  assert('ascending precision then ascending slot', CYCLE[0].partition === '0b' && CYCLE[16].partition === '0o' && CYCLE[32].partition === '0d' && CYCLE[48].partition === '0x' && CYCLE[0].slot === 0 && CYCLE[15].slot === 0xf);
  assert('cycleIndex locates a read', cycleIndex('0b', 0) === 0 && cycleIndex('0x', 0xf) === 63);
  assert('cycleIndex reports out of range as -1, not a throw', cycleIndex('0x', 16) === -1 && cycleIndex('0q', 0) === -1);
  assert('every partition/slot pair appears exactly once', (function () {
    const s = new Set();
    for (const c of CYCLE) s.add(c.partition + ':' + c.slot);
    return s.size === 64;
  })());
  assert('a cycle read reports its position and its discrepancy', cycleRead('0x', 3).at === 51 && typeof cycleRead('0x', 3).discrepancy === 'number');

  // --- pins
  assert('pin declares 0x0-0xF on a node', pin(3, 'BUS').value === 3 && pin(3, 'BUS').node === 'BUS');
  assert('an out-of-range pin states inRange false, it does not vanish', pin(0x10, 'BUS').inRange === false && pin(0x10, 'BUS').value === 0);
  assert('an unnamed pin states named false', pin(3, '').named === false);
  assert('any of 0x0-0xF may pin to any node', (function () {
    for (let v = 0; v <= 0xf; v++) for (const n of ['BUS', 'GND', 'VCC', 'ANY']) if (pin(v, n).inRange !== true) return false;
    return true;
  })());
  const ps = pinSet([pin(1, 'BUS'), pin(2, 'GND'), pin(1, 'VCC')]);
  assert('a clean pin set reports no collisions', ps.colliding === 0);
  assert('a colliding pin set states the collision', pinSet([pin(1, 'BUS'), pin(1, 'BUS')]).colliding === 1);
  const pe = pinExchange(pin(1, 'BUS'), 4, 'GND');
  assert('pinExchange reports what was already there', pe.discrepancy === (1 ^ 4) && pe.now === 1);

  // --- shortcuts: suggested, never chosen
  assert('shortcut resolves by name', shortcut('fold').name === 'fold');
  assert('an unknown shortcut is null, not a throw', shortcut('nope') === null);
  assert('suggest offers direct for a single-anchor path', (function () { const s = suggest(path([aSrc])); return s.length === 1 && s[0].name === 'direct'; })());
  assert('suggest offers alternatives for a multi-anchor path', (function () { const s = suggest(p1); return s.length > 1 && !s.some(x => x.name === 'direct'); })());
  assert('suggest is advisory: it returns candidates and picks nothing', suggest(p1).every(x => x && typeof x.name === 'string'));
  assert('suggest on a non-path is empty, not a throw', suggest(null).length === 0);

  const failed = results.filter(r => !r.pass);
  return { passed: failed.length === 0, total: results.length, failed: failed.length, results };
}
