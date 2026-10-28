/**
 * 8D Octonions · E₈ root system · −7D…0D Fano constraint space
 *
 * Standard facts:
 *   · Octonions 𝕆: 8-dimensional non-associative division algebra
 *   · Fano plane: 7 points / 7 lines — multiplication table for imaginary units e₁…e₇
 *   · E₈ root system: 240 roots in 8D (kissing number of E₈ lattice)
 *   · 240 = |Φ(E₈)| = OMI 240-clock frames
 *
 * Protocol map:
 *   −7D  Fano tick gate (phase mod 7 · incidence · 13-mask)
 *   −5D…−1D  regex constraint pipeline
 *    0D  observer (PannerNode centroid)
 *    8D  octonion / E₈ shell (algebra + 240 roots)
 *
 * Reading: the −7D…0D Fano point-constraint space is the *combinatorial
 * skeleton* of octonion multiplication; E₈’s 240 roots are the *metric
 * shell* that sits on the same 8D stage as 𝕆.
 */
'use strict';

/** Imaginary octonion units e1…e7 — Fano lines give oriented triples (ei ej = ek) */
const FANO_MUL_LINES = Object.freeze([
  Object.freeze([1, 2, 3]),
  Object.freeze([1, 4, 5]),
  Object.freeze([1, 6, 7]),
  Object.freeze([2, 4, 6]),
  Object.freeze([2, 5, 7]),
  Object.freeze([3, 4, 7]),
  Object.freeze([3, 5, 6])
]);

/** Standard positive orientation: for line (a,b,c), ea·eb = ec, eb·ec = ea, ec·ea = eb */
function octonionMulTable() {
  // table[i][j] = k means e_i * e_j = e_k  (1..7); 0 unused
  const t = Array.from({ length: 8 }, () => new Array(8).fill(0));
  for (const [a, b, c] of FANO_MUL_LINES) {
    t[a][b] = c;
    t[b][c] = a;
    t[c][a] = b;
    // opposite orientation → negative (encode as negative index)
    t[b][a] = -c;
    t[c][b] = -a;
    t[a][c] = -b;
  }
  return t;
}

const E8 = Object.freeze({
  dim: 8,
  roots: 240,
  latticeKissing: 240,
  note: 'E₈ root system |Φ| = 240; same count as OMI 240-clock'
});

const OCTONION = Object.freeze({
  dim: 8,
  real: 1,
  imaginary: 7,
  fanoPoints: 7,
  fanoLines: 7,
  associative: false,
  alternative: true
});

/**
 * Constraint-space span: Fano gate (−7) through observer (0) as the
 * combinatorial home of the 7 imaginary units.
 */
const FANO_CONSTRAINT_SPAN = Object.freeze({
  from: -7,
  to: 0,
  name: 'fano-point-constraint-space',
  layers: Object.freeze([
    { d: -7, role: 'fano-tick · phase mod 7 · incidence' },
    { d: -5, role: 'blob substrate' },
    { d: -4, role: 'color codex' },
    { d: -3, role: 'delimiter' },
    { d: -2, role: 'non-alnum' },
    { d: -1, role: 'alnum grammar' },
    { d: 0, role: 'observer · 0x0000 centroid' }
  ]),
  reading:
    '−7D…0D is the Fano point-constraint space: 7 imaginary directions ' +
    'locked before ascent into 8D octonion / E₈ shell'
});

/**
 * Bridge summary: algebra ↔ roots ↔ constraint span
 */
function bridgeSummary() {
  return {
    octonion: Object.assign({}, OCTONION),
    e8: Object.assign({}, E8),
    fanoLines: FANO_MUL_LINES.map((L) => L.slice()),
    constraintSpan: {
      from: FANO_CONSTRAINT_SPAN.from,
      to: FANO_CONSTRAINT_SPAN.to,
      layers: FANO_CONSTRAINT_SPAN.layers.slice()
    },
    alignment: {
      '7 imag units': OCTONION.imaginary,
      '7 Fano points/lines': 7,
      '8D = 1 + 7': OCTONION.dim,
      'E₈ roots 240': E8.roots,
      'OMI 240-clock': E8.roots,
      '−7D…0D': 'Fano constraint space (combinatorial)',
      '8D': 'octonion algebra + E₈ metric shell'
    },
    reading: FANO_CONSTRAINT_SPAN.reading
  };
}

/**
 * Product of two imaginary basis indices (1..7).
 * Returns signed index ±1…±7, or 0 if invalid.
 */
function mulImag(i, j) {
  if (i < 1 || i > 7 || j < 1 || j > 7) return 0;
  if (i === j) return -1; // e_i² = −1 (encode as special; caller treats)
  const table = octonionMulTable();
  return table[i][j];
}

/** Phase from Fano: same convention as fano-7d-gate (popcount mod 7, 0→7) */
function fanoPhaseFromByte(seed) {
  let v = seed & 0xff;
  v = v - ((v >>> 1) & 0x55);
  v = (v & 0x33) + ((v >>> 2) & 0x33);
  const pc = (v + (v >>> 4)) & 0x0f;
  const p = pc % 7;
  return p === 0 ? 7 : p;
}

function selfTest() {
  const results = [];
  const assert = (name, cond, detail) => {
    results.push({ name, pass: !!cond, detail: detail || '' });
  };

  assert('7 lines', FANO_MUL_LINES.length === 7);
  assert('each triple', FANO_MUL_LINES.every((L) => L.length === 3));
  assert('octonion 8D', OCTONION.dim === 8 && OCTONION.imaginary === 7);
  assert('E8 240', E8.roots === 240);

  // e1 e2 = e3 on first line
  assert('e1·e2=e3', mulImag(1, 2) === 3);
  assert('e2·e3=e1', mulImag(2, 3) === 1);
  assert('e2·e1=−e3', mulImag(2, 1) === -3);

  assert('span −7…0', FANO_CONSTRAINT_SPAN.from === -7 && FANO_CONSTRAINT_SPAN.to === 0);
  assert('phase 0x07→3', fanoPhaseFromByte(0x07) === 3);

  const br = bridgeSummary();
  assert('alignment 240', br.alignment['E₈ roots 240'] === 240);

  const failed = results.filter((r) => !r.pass);
  return {
    passed: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results
  };
}

module.exports = {
  FANO_MUL_LINES,
  E8,
  OCTONION,
  FANO_CONSTRAINT_SPAN,
  octonionMulTable,
  mulImag,
  fanoPhaseFromByte,
  bridgeSummary,
  selfTest
};
