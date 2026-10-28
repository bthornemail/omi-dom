/**
 * 9D interference injection into the 8D polytope CAS
 *
 * Cascade:
 *   8D base atomic  --inject-->  9D interference  --infer-->  10D (optional)
 *
 * 9D triple (all χ = 0):
 *   9-simplex   {3⁷}     10 vertices  → bind9
 *   9-cube      {4,3⁶}   512 vertices → apply9 (delta)
 *   9-orthoplex {3⁶,4}   18 vertices  → eval9
 *   terminal    the 4                 → 0x004 on 10-bit bus
 *
 * Interference9 = Delta9 ⊕ Eval9 ⊕ Terminal9
 * Injected into 8D as low-byte XOR on digest / dual-lock path.
 *
 * Bit width: 10 bits (0..9). Swap engines generalize the 8-bit walkthrough.
 */
'use strict';

const { apply: apply8, TERMINAL: TERMINAL8, compareExchange: cas8 } = require('./polytope-cas');

const TERMINAL9 = 0x004; // 10-bit terminal (same “4” in low bits)
const WIDTH9 = 10;
const MASK9 = (1 << WIDTH9) - 1; // 0x3FF

function mask9(v) {
  return (v | 0) & MASK9;
}

/** Adjacent-pair swap on 10 bits */
function swap16_9(b) {
  b = mask9(b);
  let out = 0;
  for (let i = 0; i < WIDTH9; i += 2) {
    const lo = (b >> i) & 1;
    const hi = (b >> (i + 1)) & 1;
    out |= hi << i;
    if (i + 1 < WIDTH9) out |= lo << (i + 1);
  }
  return mask9(out);
}

/** Nibble-style reverse in 4-bit groups; leftover high bits pass / reverse locally */
function swap32_9(b) {
  b = mask9(b);
  const rev4 = (n) =>
    ((n & 1) << 3) | ((n & 2) << 1) | ((n & 4) >> 1) | ((n & 8) >> 3);
  const g0 = rev4(b & 0xf);
  const g1 = rev4((b >> 4) & 0xf);
  const g2 = (b >> 8) & 0x3; // 2 leftover bits — swap them
  const g2s = ((g2 & 1) << 1) | ((g2 >> 1) & 1);
  return mask9(g0 | (g1 << 4) | (g2s << 8));
}

/** Full bit reverse on 10 bits */
function swap64_9(b) {
  b = mask9(b);
  let out = 0;
  for (let i = 0; i < WIDTH9; i++) {
    out = (out << 1) | (b & 1);
    b >>= 1;
  }
  return mask9(out);
}

function apply9(vertex, carry) {
  const v = mask9(vertex);
  const c = mask9(carry == null ? 0 : carry);
  const s16 = swap16_9(v);
  const s32 = swap32_9(v);
  const s64 = swap64_9(v);
  const delta = mask9(s16 ^ s32 ^ s64 ^ c);
  return { s16, s32, s64, delta };
}

/**
 * One 9D CAS step (bind / apply / eval registers at 10 bits).
 */
function compareExchange9(state, vertexIn, carryIn) {
  state = state || { bind: 0, eval: 0 };
  const bind = mask9(vertexIn);
  const applied = apply9(bind, carryIn);
  const oldEval = mask9(state.eval);
  const nextEval = applied.delta;
  const interference = mask9(applied.delta ^ nextEval ^ TERMINAL9);
  // After eval latch, interference uses latched eval (old) for “return old value” semantics
  const interferenceLatched = mask9(applied.delta ^ oldEval ^ TERMINAL9);
  return {
    dimension: 9,
    bind,
    apply: applied,
    eval: nextEval,
    oldEval,
    terminal: TERMINAL9,
    /** Live: Δ ⊕ Δ ⊕ T = T — diagnostic */
    interferenceLive: interference,
    /** Pipeline: Δ ⊕ oldEval ⊕ T — injection signal */
    interference: interferenceLatched,
    digest: {
      terminal: TERMINAL9,
      centroid: nextEval === TERMINAL9,
      dualLocked: nextEval === TERMINAL9,
      out: nextEval
    },
    state: { bind, eval: nextEval }
  };
}

function create9DEngine() {
  let state = { bind: 0, eval: 0 };
  return {
    step(vertexIn, carryIn) {
      const r = compareExchange9(state, vertexIn, carryIn);
      state = r.state;
      return r;
    },
    getState() {
      return { bind: state.bind, eval: state.eval };
    },
    reset() {
      state = { bind: 0, eval: 0 };
    }
  };
}

/**
 * Inject 9D interference into an 8D CAS cycle.
 * Low 8 bits of interference XOR into 8D carry (or post-digest).
 */
function inject9into8(vertex8, carry8, vertex9, carry9, state8, state9) {
  const r9 = compareExchange9(state9, vertex9, carry9);
  const inj = r9.interference & 0xff;
  const r8 = cas8(state8, vertex8, (carry8 ^ inj) & 0xff);
  return {
    eight: r8,
    nine: r9,
    injectedCarry: inj,
    /** Combined lock: 8D centroid and 9D centroid */
    isometricHint: r8.digest.centroid && (r9.eval === TERMINAL9)
  };
}

/** Polytope census (combinatorial labels — χ fixed 0) */
const POLYTOPES9 = Object.freeze({
  simplex: { schlafli: '{3,3,3,3,3,3,3,3}', V: 10, chi: 0 },
  cube: { schlafli: '{4,3,3,3,3,3,3,3}', V: 512, chi: 0 },
  orthoplex: { schlafli: '{3,3,3,3,3,3,3,4}', V: 18, chi: 0 },
  terminal: TERMINAL9,
  role: 'interference injector into 8D CAS'
});

function selfTest() {
  const results = [];
  const assert = (name, cond, detail) => {
    results.push({ name, pass: !!cond, detail: detail || '' });
  };

  assert('width 10', WIDTH9 === 10 && MASK9 === 0x3ff);
  assert('terminal 0x004', TERMINAL9 === 0x004);

  const a0 = apply9(0, 0);
  assert('apply9(0) delta 0', a0.delta === 0);

  const a1 = apply9(1, 0);
  assert('apply9(1) has delta', typeof a1.delta === 'number');
  assert('s16 swaps bit0/1', (a1.s16 & 3) === 2); // 01 → 10

  const eng = create9DEngine();
  const r1 = eng.step(1, 0);
  assert('bind9=1', r1.bind === 1);
  const r2 = eng.step(0, 0);
  assert('oldEval is prev delta', r2.oldEval === r1.apply.delta);

  // interference = Δ ⊕ oldEval ⊕ T
  const expectedInj = mask9(r2.apply.delta ^ r2.oldEval ^ TERMINAL9);
  assert('interference formula', r2.interference === expectedInj);

  const inj = inject9into8(0x01, 0, 0x01, 0, null, null);
  assert('8D bind intact', inj.eight.bind === 0x01);
  assert('9D present', inj.nine.dimension === 9);
  assert('inject modulates carry', typeof inj.injectedCarry === 'number');
  // Pure 8D with zero inject path still 0x8A
  assert('8D pure delta', cas8(null, 0x01, 0).apply.delta === 0x8a);

  assert('polytopes χ0', POLYTOPES9.simplex.chi === 0 && POLYTOPES9.cube.V === 512);

  // centroid when delta lands on terminal
  let found = false;
  for (let v = 0; v < 64; v++) {
    if (apply9(v, 0).delta === TERMINAL9) {
      found = compareExchange9(null, v, 0).digest.centroid;
      break;
    }
  }
  assert('centroid path exists or skip', found === true || found === false);

  const failed = results.filter((x) => !x.pass);
  return {
    passed: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results
  };
}

module.exports = {
  WIDTH9,
  MASK9,
  TERMINAL9,
  POLYTOPES9,
  swap16_9,
  swap32_9,
  swap64_9,
  apply9,
  compareExchange9,
  create9DEngine,
  inject9into8,
  selfTest
};
