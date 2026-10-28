/**
 * −9D Perles Cross-Ratio Sieve
 *
 * Pre-computational layer below −7D Fano.
 * Anchors the smallest known *irrational* point–line configuration:
 *   9 points, 9 lines (Perles configuration).
 * Euclidean embeddings require the golden ratio φ; this module encodes
 * structural incidence + discrete φ-approximations + XOR closure —
 * not floating-point projective drawing.
 *
 * Placement:
 *   −9D  Perles (this module)
 *   −7D  Fano tick
 *   −5D…−1D  constraint pipeline
 *    0D  observer
 *   +4D  DOMMatrix folds
 */
'use strict';

/** Golden ratio φ = (1+√5)/2 — used only for discrete ratios / checks */
const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_INV = PHI - 1; // 1/φ = φ − 1

/**
 * Perles incidence (combinatorial sketch).
 * Standard Perles: 9 points, 9 lines; some lines 3-rich, some 4-rich.
 * We encode 9 lines as arrays of point indices 0..8.
 * (Combinatorial model sufficient for O(1) incidence tests.)
 */
const PERLES_LINES = Object.freeze([
  Object.freeze([0, 1, 2, 3]), // 4-point
  Object.freeze([0, 4, 5]),
  Object.freeze([0, 6, 7]),
  Object.freeze([1, 4, 6, 8]), // 4-point
  Object.freeze([1, 5, 7]),
  Object.freeze([2, 4, 7]),
  Object.freeze([2, 5, 6, 8]), // 4-point
  Object.freeze([3, 4, 8]),
  Object.freeze([3, 5, 6, 7]) // 4-point-ish / 4
]);

const PERLES_REGEX = Object.freeze({
  // point:line:cross  — structural token
  PERLES_TICK: /^([0-8])?:([0-8])?:([0-9A-Fa-f]{1,4})?$/,
  // four points for a cross-ratio probe (ordered)
  PERLES_CROSS: /^([0-8]),([0-8]),([0-8]),([0-8])$/,
  // φ-band token: "phi" | "inv" | two integers a:b ≈ φ
  PERLES_PHI: /^(phi|inv|([1-9][0-9]*):([1-9][0-9]*))$/
});

/** Fibonacci pairs for discrete φ (F_{n+1}/F_n → φ) */
const FIB = Object.freeze([1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]);

function popcount8(v) {
  v = v & 0xff;
  v = v - ((v >>> 1) & 0x55);
  v = (v & 0x33) + ((v >>> 2) & 0x33);
  return (v + (v >>> 4)) & 0x0f;
}

/** Map seed → point index 0..8 (9-fold) */
function perlesPoint(seed) {
  return (seed & 0xff) % 9;
}

/** Map seed → line index 0..8 */
function perlesLine(seed) {
  return popcount8(seed) % 9;
}

function pointOnLine(point, lineIndex) {
  const line = PERLES_LINES[lineIndex % 9];
  return line.indexOf(point % 9) !== -1;
}

/**
 * Discrete cross-ratio surrogate on four ordered values in 0..255.
 * Classical (A,B;C,D) = ((C-A)/(C-B)) / ((D-A)/(D-B)).
 * We return a fixed-point-ish score and whether it is near φ or 1/φ.
 */
function crossRatioScore(a, b, c, d) {
  a = a & 0xff; b = b & 0xff; c = c & 0xff; d = d & 0xff;
  const den1 = c - b;
  const den2 = d - b;
  const den3 = d - a;
  if (den1 === 0 || den2 === 0 || den3 === 0) {
    return { ok: false, value: null, nearPhi: false, nearInv: false };
  }
  // ((c-a)/(c-b)) / ((d-a)/(d-b)) = (c-a)*(d-b) / ((c-b)*(d-a))
  const num = (c - a) * (d - b);
  const den = den1 * den3;
  const value = num / den;
  const nearPhi = Math.abs(value - PHI) < 0.08;
  const nearInv = Math.abs(value - PHI_INV) < 0.08;
  return { ok: true, value, nearPhi, nearInv, phi: PHI };
}

/** True if a/b approximates φ within tolerance (Fibonacci-friendly) */
function isPhiRatio(a, b, tol) {
  tol = tol == null ? 0.05 : tol;
  if (!b) return false;
  const r = a / b;
  return Math.abs(r - PHI) < tol || Math.abs(r - PHI_INV) < tol;
}

function nearestFibRatio(seed) {
  const i = (seed & 0xff) % (FIB.length - 1);
  return { a: FIB[i + 1], b: FIB[i], ratio: FIB[i + 1] / FIB[i] };
}

/**
 * 9-step XOR closure using φ-related masks derived from Fibonacci mod 256.
 * Twice through the ring recovers the byte (involution).
 */
const MASKS_9 = Object.freeze(
  FIB.slice(0, 9).map((f) => (f * 7) & 0xff)
);

function mask9Closure(byte) {
  let x = byte & 0xff;
  for (let i = 0; i < MASKS_9.length; i++) x ^= MASKS_9[i];
  const once = x;
  for (let i = 0; i < MASKS_9.length; i++) x ^= MASKS_9[i];
  return {
    once: once & 0xff,
    twice: x & 0xff,
    closed: (x & 0xff) === (byte & 0xff),
    masks: MASKS_9.length
  };
}

/**
 * Gate one seed byte at −9D.
 */
function gateByte(seed, opts) {
  opts = opts || {};
  const byte = seed & 0xff;
  const reasons = [];
  const point = perlesPoint(byte);
  const line = perlesLine(byte);
  const onLine = pointOnLine(point, line);
  const closure = mask9Closure(byte);
  const fib = nearestFibRatio(byte);

  if (opts.requireIncidence && !onLine) reasons.push('point not on assigned line');
  if (opts.requireClosure && !closure.closed) reasons.push('9-mask not closed');
  if (opts.requirePhiBand) {
    const ok = isPhiRatio(fib.a, fib.b);
    if (!ok) reasons.push('phi band miss');
  }

  const strict = !!(opts.requireIncidence || opts.requireClosure || opts.requirePhiBand);
  const admit = strict ? reasons.length === 0 : true;

  return {
    dimension: -9,
    name: 'perles-cross',
    byte,
    point,
    line,
    onLine,
    fib,
    phi: PHI,
    closure,
    admit,
    reasons
  };
}

/**
 * Gate four bytes as a cross-ratio probe (ordered quadruple).
 */
function gateCross(a, b, c, d, opts) {
  opts = opts || {};
  const cr = crossRatioScore(a, b, c, d);
  const reasons = [];
  if (!cr.ok) reasons.push('degenerate cross-ratio');
  if (opts.requirePhi && cr.ok && !cr.nearPhi && !cr.nearInv) {
    reasons.push('cross-ratio not near φ or 1/φ');
  }
  return {
    dimension: -9,
    name: 'perles-cross-ratio',
    ...cr,
    admit: reasons.length === 0,
    reasons
  };
}

function gateBuffer(input, opts) {
  opts = opts || {};
  let bytes;
  if (typeof input === 'string') {
    bytes = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(input)
      : Buffer.from(input, 'utf8');
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(input)) {
    bytes = new Uint8Array(input);
  } else if (Array.isArray(input)) {
    bytes = Uint8Array.from(input);
  } else {
    bytes = new Uint8Array(0);
  }

  const points = new Array(9).fill(0);
  let fold = 0;
  let admitted = 0;
  const sample = [];
  for (let i = 0; i < bytes.length; i++) {
    const g = gateByte(bytes[i], opts);
    points[g.point]++;
    fold ^= bytes[i];
    if (g.admit) admitted++;
    if (i < 8) sample.push(g);
  }

  // Optional sliding cross-ratio on first 4 bytes
  let cross = null;
  if (bytes.length >= 4) {
    cross = gateCross(bytes[0], bytes[1], bytes[2], bytes[3], opts);
  }

  const closure = mask9Closure(fold);
  return {
    dimension: -9,
    length: bytes.length,
    points,
    fold: fold & 0xff,
    admitted,
    closure,
    cross,
    sample,
    admit: closure.closed && (bytes.length === 0 || admitted > 0)
  };
}

function admitToken(token, kind) {
  const re = PERLES_REGEX[kind];
  if (!re) return false;
  return re.test(String(token));
}

function selfTest() {
  const results = [];
  const assert = (name, cond, detail) => {
    results.push({ name, pass: !!cond, detail: detail || '' });
  };

  assert('9 lines', PERLES_LINES.length === 9);
  assert('9 points cover', PERLES_LINES.every((L) => L.every((p) => p >= 0 && p <= 8)));
  assert('phi > 1.6', PHI > 1.6 && PHI < 1.62);
  assert('phi inv', Math.abs(PHI_INV - 1 / PHI) < 1e-10);

  assert('point map', perlesPoint(9) === 0);
  assert('line map', perlesLine(0) === 0);

  const c = mask9Closure(0xa5);
  assert('9-mask involution', c.closed, String(c.twice));

  // Fibonacci φ approximation 8/5 = 1.6
  assert('fib phi-ish', isPhiRatio(8, 5, 0.05));

  const cr = crossRatioScore(0, 10, 16, 26);
  assert('cross-ratio computable', cr.ok);

  assert('tick regex', admitToken('3:4:ab', 'PERLES_TICK'));
  assert('cross regex', admitToken('0,1,2,3', 'PERLES_CROSS'));
  assert('phi token', admitToken('phi', 'PERLES_PHI'));

  const g = gateByte(0x15);
  assert('gateByte fields', g.dimension === -9 && g.point >= 0 && g.point <= 8);

  const buf = gateBuffer(Uint8Array.from([1, 2, 3, 5, 8]));
  assert('buffer closed', buf.closure.closed);

  // near-φ cross from fib-ish spacing is optional; just ensure API
  const cr2 = gateCross(0, 5, 8, 13, { requirePhi: false });
  assert('gateCross admit', cr2.admit === true);

  const failed = results.filter((r) => !r.pass);
  return {
    passed: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results
  };
}

module.exports = {
  PHI,
  PHI_INV,
  FIB,
  MASKS_9,
  PERLES_LINES,
  PERLES_REGEX,
  popcount8,
  perlesPoint,
  perlesLine,
  pointOnLine,
  crossRatioScore,
  isPhiRatio,
  nearestFibRatio,
  mask9Closure,
  gateByte,
  gateCross,
  gateBuffer,
  admitToken,
  selfTest
};
