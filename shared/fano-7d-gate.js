/**
 * −7D Fano Tick Gate
 *
 * Pre-computational sieve below the −5D Blob substrate.
 * Locks Fano plane structure (7 points / 7 lines) before Cayley–Dickson ascent.
 *
 * Not a 4D DOMMatrix / Rubik rotation layer — those live at +4D.
 * This gate is phase / incidence / parity validation with O(1) bitwise ops.
 *
 * Concepts:
 *   FANO_TICK      — phase ∈ {1..7}, line ∈ {0..6}, point ∈ {0..6}
 *   FANO_INCIDENCE — 3-bit non-zero parity code → active line
 *   FANO_CHIRALITY — half-orbit (30) / full-orbit (120) density locks
 *   13-mask closure — sequential XOR through canonical masks → involution
 */
'use strict';

/** Canonical 13-mask sequential closure ring (involution check: apply twice ≡ id) */
const MASKS_13 = Object.freeze([
  0x00, 0x07, 0xff, 0x78, 0x87, 0x20, 0x80, 0xaa, 0x55, 0x27, 0xd8, 0xa0, 0x07
]);

/** Fano lines: each line is a set of 3 points in {0..6} (standard Fano plane) */
const FANO_LINES = Object.freeze([
  Object.freeze([0, 1, 2]),
  Object.freeze([0, 3, 4]),
  Object.freeze([0, 5, 6]),
  Object.freeze([1, 3, 5]),
  Object.freeze([1, 4, 6]),
  Object.freeze([2, 3, 6]),
  Object.freeze([2, 4, 5])
]);

/** Structural regex forms (token-level, optional textual admission) */
const FANO_REGEX = Object.freeze({
  // phase : line : point  — each field optional empty for structural probe
  FANO_TICK: /^(1|2|3|4|5|6|7)?:([0-6])?:([0-6])?$/,
  // incidence: 3-bit code 0x1..0x7 (or decimal 1..7)
  FANO_INCIDENCE: /^(0x0[1-7]|[1-7])$/,
  // chirality: half|full : 30|120 : optional 2-hex density
  FANO_CHIRALITY: /^(half|full):(30|120):([0-9A-Fa-f]{2})?$/
});

function popcount8(v) {
  v = v & 0xff;
  v = v - ((v >>> 1) & 0x55);
  v = (v & 0x33) + ((v >>> 2) & 0x33);
  return (v + (v >>> 4)) & 0x0f;
}

/**
 * Modulo-7 phase from seed (byte or integer).
 * π = popcount(seed) mod 7, with 0 mapped to 7 (nonzero phase convention).
 */
function fanoPhase(seed) {
  const p = popcount8(seed | 0) % 7;
  return p === 0 ? 7 : p;
}

/**
 * 3-bit parity classifier: (byte ^ mask) >>> 5 → code in 0..7
 * Non-zero codes 1..7 map to Fano incidence lanes.
 */
function parityCode(byte, mask) {
  mask = mask == null ? 0x00 : mask & 0xff;
  return ((byte ^ mask) >>> 5) & 0x07;
}

function isActiveIncidence(code) {
  return (code & 0x07) !== 0;
}

/** Point on line? */
function pointOnLine(point, lineIndex) {
  const line = FANO_LINES[lineIndex % 7];
  return line.indexOf(point % 7) !== -1;
}

/**
 * Chirality density lock:
 *   half-orbit 30 ≈ parity count 4 of 8 bits (half density)
 *   full-orbit 120 ≈ parity count 8 (full) or phase* density check
 */
function chiralityLock(byte, mode) {
  const pc = popcount8(byte);
  if (mode === 30 || mode === 'half') return pc === 4;
  if (mode === 120 || mode === 'full') return pc === 0 || pc === 8;
  return false;
}

/**
 * Sequential XOR through the 13-mask ring.
 * Closed if applying the cascade twice returns the original byte (involution of the composition).
 * Also reports single-pass output for diagnostics.
 */
function mask13Closure(byte) {
  let x = byte & 0xff;
  for (let i = 0; i < MASKS_13.length; i++) x ^= MASKS_13[i];
  const once = x;
  for (let i = 0; i < MASKS_13.length; i++) x ^= MASKS_13[i];
  return {
    once: once & 0xff,
    twice: x & 0xff,
    closed: (x & 0xff) === (byte & 0xff),
    masks: MASKS_13.length
  };
}

/**
 * Gate a single seed byte through −7D checks.
 * @returns {{ admit: boolean, phase, code, incidence, closure, reasons: string[] }}
 */
function gateByte(seed, opts) {
  opts = opts || {};
  const byte = seed & 0xff;
  const reasons = [];
  const phase = fanoPhase(byte);
  const mask = opts.mask != null ? opts.mask & 0xff : 0x00;
  const code = parityCode(byte, mask);
  const incidence = isActiveIncidence(code);
  const closure = mask13Closure(byte);

  if (opts.requireIncidence && !incidence) reasons.push('no active incidence');
  if (opts.requireClosure && !closure.closed) reasons.push('13-mask not closed');
  if (opts.chirality != null && !chiralityLock(byte, opts.chirality)) {
    reasons.push('chirality lock failed');
  }
  if (opts.line != null && opts.point != null && !pointOnLine(opts.point, opts.line)) {
    reasons.push('point not on line');
  }

  // Default admit: always structurally evaluable; optional strict flags
  const strict = !!(opts.requireIncidence || opts.requireClosure || opts.chirality != null);
  const admit = strict ? reasons.length === 0 : true;

  return {
    dimension: -7,
    name: 'fano-tick',
    byte,
    phase,
    code,
    incidence,
    line: (phase - 1) % 7,
    closure,
    admit,
    reasons
  };
}

/**
 * Gate a buffer / string: per-byte phase histogram + aggregate XOR fold.
 */
function gateBuffer(input, opts) {
  opts = opts || {};
  let bytes;
  if (typeof input === 'string') {
    bytes = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(input)
      : Buffer.from(input, 'utf8');
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else if (Buffer.isBuffer && Buffer.isBuffer(input)) {
    bytes = new Uint8Array(input);
  } else if (Array.isArray(input)) {
    bytes = Uint8Array.from(input);
  } else {
    bytes = new Uint8Array(0);
  }

  const phases = new Array(8).fill(0); // index 1..7 used
  let fold = 0;
  let admitted = 0;
  const sample = [];
  for (let i = 0; i < bytes.length; i++) {
    const g = gateByte(bytes[i], opts);
    phases[g.phase]++;
    fold ^= bytes[i];
    if (g.admit) admitted++;
    if (i < 8) sample.push(g);
  }

  const closure = mask13Closure(fold);
  return {
    dimension: -7,
    length: bytes.length,
    phases,
    fold: fold & 0xff,
    admitted,
    closure,
    sample,
    admit: closure.closed && (bytes.length === 0 || admitted > 0)
  };
}

/** Token-level regex admission (optional textual pre-sieve) */
function admitToken(token, kind) {
  const re = FANO_REGEX[kind];
  if (!re) return false;
  return re.test(String(token));
}

function selfTest() {
  const results = [];
  const assert = (name, cond, detail) => {
    results.push({ name, pass: !!cond, detail: detail || '' });
  };

  assert('7 lines', FANO_LINES.length === 7);
  assert('each line 3 points', FANO_LINES.every((L) => L.length === 3));
  assert('13 masks', MASKS_13.length === 13);

  // Phase of 0x00: popcount 0 → phase 7
  assert('phase zero → 7', fanoPhase(0x00) === 7);
  assert('phase 0x07 → 3', fanoPhase(0x07) === 3); // three bits

  assert('parity 0x07 → 0', parityCode(0x07, 0x00) === 0);
  assert('parity 0x20 → 1', parityCode(0x20, 0x00) === 1);
  assert('incidence 1', isActiveIncidence(1));
  assert('no incidence 0', !isActiveIncidence(0));

  const c = mask13Closure(0x5a);
  assert('13-mask involution', c.closed, String(c.twice));

  assert('point 0 on line 0', pointOnLine(0, 0));
  assert('point 6 on line 2', pointOnLine(6, 2));

  assert('tick regex', admitToken('7:3:1', 'FANO_TICK'));
  assert('incidence regex', admitToken('0x05', 'FANO_INCIDENCE'));

  const g = gateByte(0x0f, { chirality: 30 });
  assert('chirality half on 0x0f', g.admit && popcount8(0x0f) === 4);

  const buf = gateBuffer(Uint8Array.from([0x00, 0x07, 0xff]));
  assert('buffer fold closed', buf.closure.closed);

  const failed = results.filter((r) => !r.pass);
  return {
    passed: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results
  };
}

module.exports = {
  MASKS_13,
  FANO_LINES,
  FANO_REGEX,
  popcount8,
  fanoPhase,
  parityCode,
  isActiveIncidence,
  pointOnLine,
  chiralityLock,
  mask13Closure,
  gateByte,
  gateBuffer,
  admitToken,
  selfTest
};
