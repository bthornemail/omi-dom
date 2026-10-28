/**
 * Projective unit geometry — swap space map
 *
 * Hierarchy (protocol reading):
 *
 *   3D   Platonic / Archimedean / Catalan solids
 *   4D   simplex / polychora · 4! = 24
 *   5D   presentation (pipeline) · solid “swap surface”
 *   24D  Leech dimension label · 4! lattice ceiling
 *   …    recon / address ladder
 *   2048D meta-swap space of imaginary projective unit geometry
 *        (2¹¹ address · capacity 2036 = 2048−12)
 *
 * “Swap space” = endian / buffer permutations (swap16/32/64) +
 * solid toolkit folds — not floating-point RP^n solvers.
 *
 * Operational geometry remains −9D…10D + solid toolkit;
 * higher dims are orthogonal labels on the same XOR/swap discipline.
 */
'use strict';

const { LEECH_DIM, LEECH_KISSING, E8_KISSING, KISSING_4D, CAPACITY_2036, ADDRESS_2048 } =
  (() => {
    try {
      return require('./packing-kiss');
    } catch (_) {
      return {
        LEECH_DIM: 24,
        LEECH_KISSING: 196560,
        E8_KISSING: 240,
        KISSING_4D: 24,
        CAPACITY_2036: 2036,
        ADDRESS_2048: 2048
      };
    }
  })();

/** Solid layers as projective unit “bodies” in low D */
const SOLID_SWAP_LAYERS = Object.freeze([
  {
    dim: 3,
    name: 'platonic-archimedean-catalan',
    role: '3D projective body / volumetric unit',
    toolkit: ['platonic', 'archimedean', 'catalan', 'johnson', 'kepler-poinsot'],
    swap: 'face duals · Archimedean ↔ Catalan'
  },
  {
    dim: 4,
    name: 'simplex-polychora',
    role: '4D simplex geometry · 4! = 24',
    toolkit: ['polychora', '5-cell', 'tesseract', '24-cell', '120-cell', '600-cell'],
    swap: '4! cell permutations · 24-cell ↔ kissing-24'
  },
  {
    dim: 5,
    name: 'presentation-surface',
    role: 'pipeline 5D presentation · solid projection surface',
    toolkit: ['DOMElement presentation', 'snap-to-solid'],
    swap: 'media edit · constraint edit'
  }
]);

/** From lattice ceiling to meta-swap address */
const META_SWAP = Object.freeze({
  from: 24,
  to: 2048,
  name: 'imaginary-projective-unit-meta-swap',
  meaning:
    '24D Leech label / 4! ceiling expands along 2^n address dims to 2048 (=2¹¹); ' +
    'usable capacity 2036 = 2048−12; swap discipline remains swap16|32|64 + XOR',
  steps: Object.freeze([
    { d: 24, role: 'leech-dim · 4!' },
    { d: 256, role: '2^8 address' },
    { d: 512, role: '2^9 shared' },
    { d: 1024, role: '2^10' },
    { d: 2048, role: '2^11 meta-swap ceiling' },
    { d: 2036, role: 'capacity boundary 2048−12' }
  ])
});

/** Endian swap ops that *implement* the swap space in buffers */
const SWAP_OPS = Object.freeze(['swap16', 'swap32', 'swap64']);

/**
 * 3! buffer orderings — projective unit of layout (BL, BO, BPE)
 */
function layoutUnitOrderings() {
  const keys = ['BL', 'BO', 'BPE'];
  const out = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (j === i) continue;
      for (let k = 0; k < 3; k++) {
        if (k === i || k === j) continue;
        out.push([keys[i], keys[j], keys[k]]);
      }
    }
  }
  return out;
}

/**
 * Map a dimension to its projective / swap role.
 */
function projectiveRole(d) {
  d = d | 0;
  if (d === 3) return SOLID_SWAP_LAYERS[0];
  if (d === 4) return SOLID_SWAP_LAYERS[1];
  if (d === 5) return SOLID_SWAP_LAYERS[2];
  if (d === 8) {
    return { dim: 8, name: 'e8-shell', role: 'E₈ kissing 240 · clock', swap: '240-frame' };
  }
  if (d === 24) {
    return {
      dim: 24,
      name: 'leech-ceiling',
      role: 'Leech dim · 4! · lattice label',
      kissing: LEECH_KISSING,
      swap: 'meta-swap origin toward 2048'
    };
  }
  if (d === 2048) {
    return {
      dim: 2048,
      name: 'meta-swap-ceiling',
      role: META_SWAP.name,
      capacity: CAPACITY_2036,
      swap: SWAP_OPS.join('|')
    };
  }
  if (d === 2036) {
    return {
      dim: 2036,
      name: 'capacity-boundary',
      role: '2048−12 singularity',
      safe: false
    };
  }
  return { dim: d, name: 'unlabeled', role: 'orthogonal', swap: null };
}

function hierarchySummary() {
  return {
    solids: SOLID_SWAP_LAYERS.slice(),
    metaSwap: Object.assign({}, META_SWAP, { steps: META_SWAP.steps.slice() }),
    layoutUnit: {
      factorial: 6,
      orderings: layoutUnitOrderings()
    },
    swapOps: SWAP_OPS.slice(),
    lattice: {
      e8: { dim: 8, kissing: E8_KISSING },
      leech: { dim: LEECH_DIM, kissing: LEECH_KISSING },
      kissing4d: KISSING_4D
    },
    reading:
      '3D solids + 4D simplex (24=4!) form the projective unit bodies; ' +
      'their swap space is duals + 4! perms + buffer endian swaps. ' +
      '24D→2048D is the meta-swap address expansion of that unit geometry.'
  };
}

function selfTest() {
  const results = [];
  const assert = (name, cond, detail) => {
    results.push({ name, pass: !!cond, detail: detail || '' });
  };

  assert('3 solid layers', SOLID_SWAP_LAYERS.length === 3);
  assert('3D name', SOLID_SWAP_LAYERS[0].dim === 3);
  assert('4D 4!', SOLID_SWAP_LAYERS[1].dim === 4);
  assert('layout 3!=6', layoutUnitOrderings().length === 6);

  assert('meta from 24', META_SWAP.from === 24);
  assert('meta to 2048', META_SWAP.to === 2048);

  const r24 = projectiveRole(24);
  assert('role 24 leech', r24.name === 'leech-ceiling' && r24.kissing === 196560);
  const r2048 = projectiveRole(2048);
  assert('role 2048 meta', r2048.name === 'meta-swap-ceiling' && r2048.capacity === 2036);
  assert('role 3 solid', projectiveRole(3).dim === 3);

  assert('swap ops 3', SWAP_OPS.length === 3);

  const failed = results.filter((r) => !r.pass);
  return {
    passed: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results
  };
}

module.exports = {
  SOLID_SWAP_LAYERS,
  META_SWAP,
  SWAP_OPS,
  layoutUnitOrderings,
  projectiveRole,
  hierarchySummary,
  selfTest
};
