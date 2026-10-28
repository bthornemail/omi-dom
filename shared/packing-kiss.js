/**
 * Sphere-packing / kissing bridge — Leech 24D · BQF · 2036/2048
 *
 * Mathematical facts (standard):
 *   · Leech lattice Λ₂₄: dim 24, kissing number τ = 196 560
 *   · E₈ lattice: dim 8, kissing number 240
 *   · 4D kissing number 24 (= 4!)
 *   · Affine OMI BQF: Q(x,y) = (4x + 2y)² = 4(2x + y)²
 *     “2(2x+y)²” is the same parabola up to a constant factor 2 vs 4
 *
 * Protocol mapping (OMI-specific, not a published kissing formula):
 *   · 24D lattice label ↔ recon dim 24 = 4!
 *   · 240-clock ↔ E₈ kissing 240
 *   · Address ceiling 2048 = 2¹¹
 *   · Corruption / capacity boundary 2036 = 2048 − 12
 *     (12 = BuckeyBall-high recon dim) — formal singularity in the ladder,
 *     not equal to 196 560
 *
 * This module keeps the distinction explicit.
 */
'use strict';

const LEECH_DIM = 24;
const LEECH_KISSING = 196560;
const E8_DIM = 8;
const E8_KISSING = 240;
const KISSING_4D = 24; // proven; also 4!

/** Affine form used in OMI BQF tracker: (4x + 2y)² */
function qAffine(x, y) {
  const t = 4 * x + 2 * y;
  return t * t;
}

/** Same parabola scaled: 2(2x + y)² = ½ · (4x + 2y)² */
function qHalf(x, y) {
  const u = 2 * x + y;
  return 2 * u * u;
}

/** Identity check: (4x+2y)² === 4 · (2x+y)² === 2 · 2(2x+y)² */
function bqfIdentity(x, y) {
  const a = qAffine(x, y);
  const b = 4 * (2 * x + y) * (2 * x + y);
  const c = 2 * qHalf(x, y);
  return a === b && a === c;
}

/**
 * Protocol packing capacity metaphor:
 * address space 2048 minus 12D “control” → 2036 usable slots
 * before formal singularity — NOT Leech τ.
 */
const ADDRESS_BITS_11 = 11;
const ADDRESS_2048 = 1 << ADDRESS_BITS_11; // 2048
const CONTROL_12 = 12;
const CAPACITY_2036 = ADDRESS_2048 - CONTROL_12;

function packingBridge() {
  return {
    math: {
      leech: { dim: LEECH_DIM, kissing: LEECH_KISSING },
      e8: { dim: E8_DIM, kissing: E8_KISSING },
      kissing4d: KISSING_4D,
      note: 'Leech is optimal densest packing in 24D (Cohn–Kumar–Miller–Radchenko–Viazovska)'
    },
    bqf: {
      form: '(4x+2y)² = 4(2x+y)² = 2 · 2(2x+y)²',
      sample: { x: 1, y: 1, Q: qAffine(1, 1), half: qHalf(1, 1) }
    },
    protocol: {
      clock240: E8_KISSING,
      recon24: LEECH_DIM,
      factorial4: KISSING_4D,
      address2048: ADDRESS_2048,
      control12: CONTROL_12,
      capacity2036: CAPACITY_2036,
      relation: '2036 = 2048 − 12  (protocol capacity / singularity — not τ(Leech))'
    },
    /** How the pieces sit together without conflating numbers */
    alignment: {
      '24D lattice dim': LEECH_DIM,
      '24 = 4! kissing (4D) & recon label': KISSING_4D,
      '240 = E₈ kissing & OMI clock': E8_KISSING,
      '196560 = Leech kissing': LEECH_KISSING,
      '2036 = protocol 2048−12': CAPACITY_2036
    }
  };
}

/**
 * Minimal integer shell sizes often cited for low dims (exact known kissing).
 * Higher dims: only E₈ and Leech are exact lattice optima in this table.
 */
const KNOWN_KISSING = Object.freeze({
  1: 2,
  2: 6,
  3: 12,
  4: 24,
  8: 240,
  24: 196560
});

function kissing(dim) {
  return KNOWN_KISSING[dim] != null ? KNOWN_KISSING[dim] : null;
}

function selfTest() {
  const results = [];
  const assert = (name, cond, detail) => {
    results.push({ name, pass: !!cond, detail: detail || '' });
  };

  assert('Leech dim 24', LEECH_DIM === 24);
  assert('Leech τ 196560', LEECH_KISSING === 196560);
  assert('E8 τ 240', E8_KISSING === 240);
  assert('4D τ 24', KISSING_4D === 24);

  assert('BQF identity (1,1)', bqfIdentity(1, 1));
  assert('BQF identity (3,2)', bqfIdentity(3, 2));
  assert('Q(1,0)=16', qAffine(1, 0) === 16);
  assert('Q(0,1)=4', qAffine(0, 1) === 4);
  assert('2(2x+y)² (1,1)=18', qHalf(1, 1) === 18);
  assert('scale link', qAffine(1, 1) === 2 * qHalf(1, 1));

  assert('2048', ADDRESS_2048 === 2048);
  assert('2036', CAPACITY_2036 === 2036);
  assert('2036 ≠ Leech τ', CAPACITY_2036 !== LEECH_KISSING);

  assert('kissing(24)', kissing(24) === 196560);
  assert('kissing(8)', kissing(8) === 240);
  assert('kissing(7) unknown here', kissing(7) === null);

  const br = packingBridge();
  assert('bridge has math+protocol', br.math.leech.kissing === 196560 && br.protocol.capacity2036 === 2036);

  const failed = results.filter((r) => !r.pass);
  return {
    passed: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results
  };
}

module.exports = {
  LEECH_DIM,
  LEECH_KISSING,
  E8_DIM,
  E8_KISSING,
  KISSING_4D,
  qAffine,
  qHalf,
  bqfIdentity,
  ADDRESS_2048,
  CONTROL_12,
  CAPACITY_2036,
  packingBridge,
  KNOWN_KISSING,
  kissing,
  selfTest
};
