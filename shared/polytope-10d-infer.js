/**
 * 10D isometric inference — second stage of the polytope cascade
 *
 *   8D base  --inject-->  9D interference  --infer-->  10D inference
 *
 * 10D triple (all χ = 0):
 *   10-simplex   11 vertices  → bind10
 *   10-cube    1024 vertices  → apply10 (delta)
 *   10-orthoplex 20 vertices  → eval10
 *   terminal the 4            → 0x004 on 11-bit bus
 *
 * Inference10 = Delta10 ⊕ Eval10_old ⊕ Terminal10
 * Isometric lock when low bytes of Interference9 and Inference10
 * agree with the 8D terminal (0x04).
 */
'use strict';

const { compareExchange: cas8, TERMINAL: TERMINAL8 } = require('./polytope-cas');
const { compareExchange9, TERMINAL9, inject9into8 } = require('./polytope-9d-inject');

const TERMINAL10 = 0x004;
const WIDTH10 = 11;
const MASK10 = (1 << WIDTH10) - 1; // 0x7FF

function mask10(v) {
  return (v | 0) & MASK10;
}

function swap16_10(b) {
  b = mask10(b);
  let out = 0;
  for (let i = 0; i < WIDTH10; i += 2) {
    const lo = (b >> i) & 1;
    const hi = i + 1 < WIDTH10 ? (b >> (i + 1)) & 1 : 0;
    out |= hi << i;
    if (i + 1 < WIDTH10) out |= lo << (i + 1);
  }
  return mask10(out);
}

function swap32_10(b) {
  b = mask10(b);
  const rev4 = (n) =>
    ((n & 1) << 3) | ((n & 2) << 1) | ((n & 4) >> 1) | ((n & 8) >> 3);
  const g0 = rev4(b & 0xf);
  const g1 = rev4((b >> 4) & 0xf);
  const top = (b >> 8) & 0x7; // 3 bits
  // reverse 3 bits
  const topR = ((top & 1) << 2) | (top & 2) | ((top & 4) >> 2);
  return mask10(g0 | (g1 << 4) | (topR << 8));
}

function swap64_10(b) {
  b = mask10(b);
  let out = 0;
  for (let i = 0; i < WIDTH10; i++) {
    out = (out << 1) | (b & 1);
    b >>= 1;
  }
  return mask10(out);
}

function apply10(vertex, carry) {
  const v = mask10(vertex);
  const c = mask10(carry == null ? 0 : carry);
  const s16 = swap16_10(v);
  const s32 = swap32_10(v);
  const s64 = swap64_10(v);
  const delta = mask10(s16 ^ s32 ^ s64 ^ c);
  return { s16, s32, s64, delta };
}

function compareExchange10(state, vertexIn, carryIn) {
  state = state || { bind: 0, eval: 0 };
  const bind = mask10(vertexIn);
  const applied = apply10(bind, carryIn);
  const oldEval = mask10(state.eval);
  const nextEval = applied.delta;
  const inference = mask10(applied.delta ^ oldEval ^ TERMINAL10);
  return {
    dimension: 10,
    bind,
    apply: applied,
    eval: nextEval,
    oldEval,
    terminal: TERMINAL10,
    inference,
    digest: {
      terminal: TERMINAL10,
      centroid: nextEval === TERMINAL10,
      dualLocked: nextEval === TERMINAL10,
      out: nextEval
    },
    state: { bind, eval: nextEval }
  };
}

function create10DEngine() {
  let state = { bind: 0, eval: 0 };
  return {
    step(vertexIn, carryIn) {
      const r = compareExchange10(state, vertexIn, carryIn);
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
 * Full cascade step: 8D ← 9D inject ← 10D infer
 *
 * isometric_lock ≈ (interference9[7:0] == 0x04) && (inference10[7:0] == 0x04)
 * (matches Verilog sketch in walkthrough)
 */
function cascade8910(opts) {
  opts = opts || {};
  const v8 = opts.vertex8 != null ? opts.vertex8 : 0;
  const c8 = opts.carry8 != null ? opts.carry8 : 0;
  const v9 = opts.vertex9 != null ? opts.vertex9 : 0;
  const c9 = opts.carry9 != null ? opts.carry9 : 0;
  const v10 = opts.vertex10 != null ? opts.vertex10 : 0;
  const c10 = opts.carry10 != null ? opts.carry10 : 0;

  const r9 = compareExchange9(opts.state9, v9, c9);
  const r10 = compareExchange10(opts.state10, v10, c10);
  const inj = r9.interference & 0xff;
  const r8 = cas8(opts.state8, v8, (c8 ^ inj) & 0xff);

  const lock =
    ((r9.interference & 0xff) === TERMINAL8) &&
    ((r10.inference & 0xff) === TERMINAL8);

  return {
    eight: r8,
    nine: r9,
    ten: r10,
    injectedCarry: inj,
    isometricLock: lock,
    full: mask10((r9.interference ^ r10.inference ^ r8.digest.out) & MASK10)
  };
}

const POLYTOPES10 = Object.freeze({
  simplex: { schlafli: '{3}^9', V: 11, chi: 0 },
  cube: { schlafli: '{4,3}^8', V: 1024, chi: 0 },
  orthoplex: { schlafli: '{3}^8,4', V: 20, chi: 0 },
  terminal: TERMINAL10,
  role: 'isometric inferrer from 9D interference'
});

function selfTest() {
  const results = [];
  const assert = (name, cond, detail) => {
    results.push({ name, pass: !!cond, detail: detail || '' });
  };

  assert('width 11', WIDTH10 === 11 && MASK10 === 0x7ff);
  assert('terminal 0x004', TERMINAL10 === 0x004);

  const a0 = apply10(0, 0);
  assert('apply10(0)=0', a0.delta === 0);

  const eng = create10DEngine();
  const r1 = eng.step(1, 0);
  assert('bind10=1', r1.bind === 1);
  const r2 = eng.step(0, 0);
  assert('oldEval prev delta', r2.oldEval === r1.apply.delta);
  assert(
    'inference formula',
    r2.inference === mask10(r2.apply.delta ^ r2.oldEval ^ TERMINAL10)
  );

  const cas = cascade8910({
    vertex8: 0x01,
    vertex9: 0,
    vertex10: 0
  });
  assert('cascade 8D bind', cas.eight.bind === 0x01);
  assert('cascade 9D dim', cas.nine.dimension === 9);
  assert('cascade 10D dim', cas.ten.dimension === 10);
  assert('isometricLock boolean', typeof cas.isometricLock === 'boolean');

  assert('polytopes V', POLYTOPES10.simplex.V === 11 && POLYTOPES10.cube.V === 1024);
  assert('chi 0', POLYTOPES10.orthoplex.chi === 0);

  // pure 8D still available
  assert('8D pure', cas8(null, 0x01, 0).apply.delta === 0x8a);

  const failed = results.filter((x) => !x.pass);
  return {
    passed: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results
  };
}

module.exports = {
  WIDTH10,
  MASK10,
  TERMINAL10,
  POLYTOPES10,
  swap16_10,
  swap32_10,
  swap64_10,
  apply10,
  compareExchange10,
  create10DEngine,
  cascade8910,
  selfTest
};
