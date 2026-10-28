/**
 * 8-Polytope CAS — algorithmic determinism core
 *
 * atomics.compareExchange as breadboard phases:
 *   bind  → 8-simplex latch
 *   apply → 8-cube delta = swap16 ⊕ swap32 ⊕ swap64 ⊕ carry
 *   eval  → 8-orthoplex latch (old value)
 *   digest → terminal 0x04 · centroid · dual-lock
 *
 * Delta bit-permutations match the walkthrough verification table
 * (0x01 → 0x8A, 0x02 → 0x45 with carry=0).
 *
 * Hardware realizations (same math):
 *   · Discrete BJT XOR (5–6 transistors) — teaching
 *   · 74HC86 ×6 + 74HC74 ×4 — BOM walkthrough
 *   · Verilog omi_breadboard_equivalent
 *
 * RF spatial modem is optional *transport* for digest bytes.
 */
'use strict';

const TERMINAL = 0x04;

/** Walkthrough-compatible apply (exact table parity) */
function apply(vertex, carry) {
  const b = vertex & 0xff;
  const c = (carry == null ? 0 : carry) & 0xff;

  // adjacent pair swap
  const s16 =
    (((b >> 0) & 1) << 1) |
    (((b >> 1) & 1) << 0) |
    (((b >> 2) & 1) << 3) |
    (((b >> 3) & 1) << 2) |
    (((b >> 4) & 1) << 5) |
    (((b >> 5) & 1) << 4) |
    (((b >> 6) & 1) << 7) |
    (((b >> 7) & 1) << 6);

  // nibble bit-reverse (0x01→0x08, 0x02→0x04)
  const revNibble = (n) =>
    ((n & 1) << 3) | ((n & 2) << 1) | ((n & 4) >> 1) | ((n & 8) >> 3);
  const s32 = ((revNibble((b >> 4) & 0x0f) << 4) | revNibble(b & 0x0f)) & 0xff;

  // full reverse
  let s64 = 0;
  let t = b;
  for (let i = 0; i < 8; i++) {
    s64 = (s64 << 1) | (t & 1);
    t >>= 1;
  }

  const delta = (s16 ^ s32 ^ s64 ^ c) & 0xff;
  return { s16: s16 & 0xff, s32, s64: s64 & 0xff, delta };
}

function parity8(b) {
  b &= 0xff;
  b ^= b >> 4;
  b ^= b >> 2;
  b ^= b >> 1;
  return b & 1;
}

function simplexLeds(bind) {
  bind &= 0xff;
  const leds = new Array(9).fill(0);
  leds[0] = parity8(bind);
  for (let i = 0; i < 8; i++) leds[i + 1] = (bind >> i) & 1;
  return leds;
}

function signature(bind, delta, evalLatch) {
  const simplexProj = bind & 0xff;
  const cubeProj = delta & 0xff;
  const orthoplexProj = evalLatch & 0xff;
  const three = (simplexProj ^ cubeProj ^ orthoplexProj) & 0xff;
  return {
    simplexProj,
    cubeProj,
    orthoplexProj,
    three,
    terminal: TERMINAL,
    signature: (three ^ TERMINAL) & 0xff,
    dualLock: three === 0
  };
}

function chiZero() {
  return { simplex8: 0, cube8: 0, orthoplex8: 0, allZero: true };
}

/**
 * One sequential CAS step.
 * @param {{bind:number, eval:number}|null} state
 */
function compareExchange(state, vertexIn, carryIn) {
  state = state || { bind: 0, eval: 0 };
  const bind = vertexIn & 0xff;
  const applied = apply(bind, carryIn);
  const oldEval = state.eval & 0xff;
  const nextEval = applied.delta;
  return {
    bind,
    apply: applied,
    eval: nextEval,
    oldEval,
    digest: {
      terminal: TERMINAL,
      centroid: nextEval === TERMINAL,
      dualLocked: nextEval === TERMINAL,
      out: nextEval
    },
    simplexLeds: simplexLeds(bind),
    signature: signature(bind, applied.delta, nextEval),
    chi: chiZero(),
    state: { bind, eval: nextEval }
  };
}

function createCASEngine() {
  let state = { bind: 0, eval: 0 };
  return {
    step(vertexIn, carryIn) {
      const r = compareExchange(state, vertexIn, carryIn == null ? 0 : carryIn);
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

const HARDWARE_PATHS = Object.freeze({
  discrete: {
    name: 'Transistor XOR (BJT)',
    transistors: { min: 5, withOutput: 6, viaNand: 8, viaNor: 10 },
    ref: 'Cody Wabiszewski — XOR Gate Built with Transistors (2024)',
    use: 'Teaching exclusive-OR on solderless breadboard'
  },
  ttl: {
    name: '74HC86 quad XOR',
    chips: 6,
    use: 'Apply: three swaps + delta tree'
  },
  sequential: {
    name: '74HC74 dual D flip-flop',
    chips: 4,
    use: 'Bind + eval latches (8 bits)'
  },
  terminal: TERMINAL,
  note: 'RF modem transports digest; CAS is independent of RF'
});

function selfTest() {
  const results = [];
  const assert = (name, cond, detail) => {
    results.push({ name, pass: !!cond, detail: detail || '' });
  };

  assert('delta(0x01)=0x8A', apply(0x01, 0).delta === 0x8a);
  assert('delta(0x02)=0x45', apply(0x02, 0).delta === 0x45);
  assert('s16(0x01)=0x02', apply(0x01, 0).s16 === 0x02);
  assert('s32(0x01)=0x08', apply(0x01, 0).s32 === 0x08);
  assert('s64(0x01)=0x80', apply(0x01, 0).s64 === 0x80);

  const eng = createCASEngine();
  const r1 = eng.step(0x01, 0);
  assert('bind 0x01', r1.bind === 0x01);
  assert('apply delta', r1.apply.delta === 0x8a);
  const r2 = eng.step(0x04, 0);
  assert('eval holds prev', r2.oldEval === 0x8a);
  assert('centroid when Δ=0x04', compareExchange(null, 0x2a, 0).digest.centroid === true);

  assert('terminal 0x04', TERMINAL === 0x04);
  assert('chi zero', chiZero().allZero);

  const sig = signature(0x00, 0x00, 0x00);
  assert('dual lock three==0', sig.dualLock === true);
  assert('signature 0x04', sig.signature === TERMINAL);

  assert('simplex LED0 zero', simplexLeds(0x00)[0] === 0);
  assert('simplex LED0 0x01', simplexLeds(0x01)[0] === 1);

  const failed = results.filter((x) => !x.pass);
  return {
    passed: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results
  };
}

module.exports = {
  TERMINAL,
  apply,
  compareExchange,
  createCASEngine,
  simplexLeds,
  signature,
  chiZero,
  HARDWARE_PATHS,
  selfTest
};
