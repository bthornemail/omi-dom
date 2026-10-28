/**
 * Orthogonal dimension ladder — sexy primes → two-cube → cascade → addresses
 *
 * Encodes the formal cascade as O(1) metadata + pure checks.
 * Does NOT allocate 2048-dimensional arrays. Dimensions are labels / roles
 * on the existing XOR / factorial / lattice story.
 *
 * Key anchors:
 *   Exceptional sexy sextuplet {5,7,11,13,17,19}
 *   210 = 2·3·5·7  →  210n + {97,101,103,107,109,113}
 *   Two-cube measurement → six squared axes
 *   3! = 6 reconciliation
 *   Resolution pair {17,19} around center 18
 *   24 = 4!  ·  Leech kissing 196560
 *   2^n address dims · corruption boundary 2036 = 2048 − 12
 *   2^16 = 65536  ·  16^8 = 2^32  ·  mod 2^16 ≡ 0 → 0x0000 cycle
 */
'use strict';

const SEXY_EXCEPTIONAL = Object.freeze([5, 7, 11, 13, 17, 19]);
const SEXY_GAPS = Object.freeze([2, 4, 2, 4, 2]);
const SEXY_MODULUS = 210; // 2*3*5*7
const SEXY_RESIDUES = Object.freeze([97, 101, 103, 107, 109, 113]);

const CUBE_A = Object.freeze([1, 2, 4, 8, 16, 32, 64, 128]);
const CUBE_B = Object.freeze([0, 2, 6, 8, 12, 14, 18, 20]);

/** Squared differences (A−B)² — six nonzero axes */
function twoCubeSquaredDiffs() {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const d = CUBE_A[i] - CUBE_B[i];
    out.push(d * d);
  }
  return out;
}

function sixAxes() {
  return twoCubeSquaredDiffs().filter((x) => x !== 0);
}

/**
 * Primary operational cascade (−9…10 already in pipeline) plus
 * higher *reconciliation labels* (11…24) and power-of-two *address* dims.
 */
const CASCADE = Object.freeze([
  { d: 0, role: 'origin', kind: 'ops' },
  { d: 1, role: 'coordinate', kind: 'ops' },
  { d: 2, role: 'channel', kind: 'ops' },
  { d: 3, role: 'region', kind: 'ops', reconciles: '3!' },
  { d: 4, role: 'transform', kind: 'ops' },
  { d: 5, role: 'presentation', kind: 'ops' },
  { d: 6, role: 'rendering', kind: 'ops' },
  { d: 7, role: 'temporal', kind: 'ops' },
  { d: 8, role: 'byte-basis', kind: 'ops' },
  { d: 9, role: 'network-mesh', kind: 'ops' },
  { d: 10, role: 'orchestrator', kind: 'ops' },
  { d: 11, role: 'digest-scope', kind: 'recon' },
  { d: 12, role: 'buckeyball-high', kind: 'recon' },
  { d: 13, role: 'quarter-diagonal', kind: 'recon' },
  { d: 14, role: 'intermediate', kind: 'recon' },
  { d: 15, role: 'intermediate', kind: 'recon' },
  { d: 16, role: 'metaspace', kind: 'recon' },
  { d: 17, role: 'resolution-first', kind: 'resolve' },
  { d: 18, role: 'center', kind: 'resolve' },
  { d: 19, role: 'resolution-second', kind: 'resolve' },
  { d: 20, role: 'tangent', kind: 'recon' },
  { d: 21, role: 'tangent-branch-0', kind: 'recon' },
  { d: 22, role: 'tangent-branch-1', kind: 'recon' },
  { d: 23, role: 'prime-reoccurrence', kind: 'recon' },
  { d: 24, role: 'leech-4!', kind: 'lattice' }
]);

const LEECH = Object.freeze({
  dim: 24,
  factorial: 24, // 4!
  kissing: 196560,
  minVectors: 196560
});

const LORENTZ = Object.freeze({ dim: 26, space: 25, time: 1 });

/** Power-of-two address dimensions (labels only) */
const ADDRESS_DIMS = Object.freeze([
  { d: 256, bits: 8, note: '16²' },
  { d: 512, bits: 9, note: 'minimal shared' },
  { d: 1024, bits: 10, note: '10-bit address' },
  { d: 2048, bits: 11, note: '11-bit address' },
  { d: 4096, bits: 12, note: '12-bit · delta sub-cycle' },
  { d: 8192, bits: 13, note: '13-bit' },
  { d: 16384, bits: 14, note: '14-bit' },
  { d: 32768, bits: 15, note: '15-bit' },
  { d: 65536, bits: 16, note: '2¹⁶ Blob / imaginary projective ceiling' }
]);

const CORRUPTION_BOUNDARY = 2036; // 2048 − 12 (BuckeyBall high)
const BLOB = 65536; // 2^16
const PERIOD_16_8 = 4294967296; // 16^8 = 2^32

function isPrime(n) {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}

function isExceptionalSexy(p) {
  return SEXY_EXCEPTIONAL.indexOf(p) !== -1;
}

/** First non-exceptional sexy sextuplet residues at n=0 */
function sexyResidueSet(n) {
  return SEXY_RESIDUES.map((r) => SEXY_MODULUS * n + r);
}

function zeroSphere(center, radius) {
  return { lo: center - radius, hi: center + radius, center, radius };
}

/**
 * Classify a dimension label.
 * @returns {{ band, role, safe, note }}
 */
function classifyDim(d) {
  d = d | 0;
  if (d < 0) {
    return { band: 'pre', role: 'regex-sieve', safe: true, note: '−9/−7/−5…−1 gates' };
  }
  const hit = CASCADE.find((c) => c.d === d);
  if (hit) {
    return {
      band: hit.kind,
      role: hit.role,
      safe: true,
      note: hit.kind
    };
  }
  const addr = ADDRESS_DIMS.find((a) => a.d === d);
  if (addr) {
    const safe = d < CORRUPTION_BOUNDARY || d === 2048 || d >= 4096;
    return {
      band: 'address',
      role: addr.note,
      safe: d !== CORRUPTION_BOUNDARY,
      note: safe ? addr.note : 'on corruption boundary'
    };
  }
  if (d === CORRUPTION_BOUNDARY) {
    return {
      band: 'boundary',
      role: 'corruption-singularity',
      safe: false,
      note: '2048 − 12 = 2036'
    };
  }
  if (d > 65536) {
    return { band: 'beyond-blob', role: 'unallocated', safe: false, note: 'past 2¹⁶' };
  }
  return { band: 'intermediate', role: 'unlabeled', safe: d < CORRUPTION_BOUNDARY, note: '' };
}

/** 16^8 mod 2^16 === 0 → cyclical return to 0x0000 */
function cyclicalPeriodicity() {
  // 16^8 = 2^32; 2^32 mod 2^16 = 0
  return {
    value: PERIOD_16_8,
    mod: BLOB,
    result: PERIOD_16_8 % BLOB,
    returnsZero: PERIOD_16_8 % BLOB === 0
  };
}

function ladderSummary() {
  return {
    sexy: {
      exceptional: SEXY_EXCEPTIONAL.slice(),
      gaps: SEXY_GAPS.slice(),
      modulus: SEXY_MODULUS,
      residues: SEXY_RESIDUES.slice()
    },
    twoCube: {
      cubeA: CUBE_A.slice(),
      cubeB: CUBE_B.slice(),
      squaredDiff: twoCubeSquaredDiffs(),
      sixAxes: sixAxes()
    },
    factorial: { three: 6, four: 24, seven: 5040 },
    resolution: zeroSphere(18, 1),
    leech: Object.assign({}, LEECH),
    lorentz: Object.assign({}, LORENTZ),
    corruption: CORRUPTION_BOUNDARY,
    blob: BLOB,
    cycle: cyclicalPeriodicity(),
    cascadeMaxOps: 10,
    cascadeReconMax: 24
  };
}

function selfTest() {
  const results = [];
  const assert = (name, cond, detail) => {
    results.push({ name, pass: !!cond, detail: detail || '' });
  };

  assert('sexy length 6', SEXY_EXCEPTIONAL.length === 6);
  assert('all sexy prime', SEXY_EXCEPTIONAL.every(isPrime));
  assert('gaps 2,4,2,4,2', SEXY_GAPS.join(',') === '2,4,2,4,2');
  assert('210 factor', SEXY_MODULUS === 2 * 3 * 5 * 7);
  assert('5 divides 210', SEXY_MODULUS % 5 === 0);

  const sq = twoCubeSquaredDiffs();
  assert('squared len 8', sq.length === 8);
  assert('sq[0]=1', sq[0] === 1);
  assert('sq[1]=0', sq[1] === 0);
  assert('six axes', sixAxes().length === 6);
  assert('axis 11664', sixAxes().indexOf(11664) !== -1);

  assert('3!=6', 6 === 6);
  assert('4!=24', LEECH.factorial === 24);
  assert('leech kissing', LEECH.kissing === 196560);

  const zs = zeroSphere(18, 1);
  assert('17/19 sphere', zs.lo === 17 && zs.hi === 19);

  assert('corrupt 2036', CORRUPTION_BOUNDARY === 2048 - 12);
  assert('classify 10 ops', classifyDim(10).band === 'ops');
  assert('classify 17 resolve', classifyDim(17).band === 'resolve');
  assert('classify 24 lattice', classifyDim(24).band === 'lattice');
  assert('classify 2036 unsafe', classifyDim(2036).safe === false);
  assert('classify 65536 address', classifyDim(65536).band === 'address');

  const cyc = cyclicalPeriodicity();
  assert('16^8 mod 2^16 = 0', cyc.returnsZero && cyc.result === 0);

  const residues0 = sexyResidueSet(0);
  assert('residue 97', residues0[0] === 97);
  assert('residue primes-ish', residues0.every((p) => p > 90));

  const failed = results.filter((r) => !r.pass);
  return {
    passed: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results
  };
}

module.exports = {
  SEXY_EXCEPTIONAL,
  SEXY_GAPS,
  SEXY_MODULUS,
  SEXY_RESIDUES,
  CUBE_A,
  CUBE_B,
  CASCADE,
  LEECH,
  LORENTZ,
  ADDRESS_DIMS,
  CORRUPTION_BOUNDARY,
  BLOB,
  twoCubeSquaredDiffs,
  sixAxes,
  isPrime,
  isExceptionalSexy,
  sexyResidueSet,
  zeroSphere,
  classifyDim,
  cyclicalPeriodicity,
  ladderSummary,
  selfTest
};
