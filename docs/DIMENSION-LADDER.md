# Dimension Ladder — Sexy Primes through 2036 / 2048

**Orthogonal labels · O(1) metadata · no mega-arrays**

The formal cascade continues past the operational **−9D…10D** pipeline into reconciliation, resolution, lattice, and power-of-two **address** dimensions. This module records those labels and the arithmetic anchors; it does **not** allocate 2048-dimensional tensors.

---

## Sexy prime reconciliation

| Item | Value |
|------|--------|
| Exceptional sextuplet | `{5, 7, 11, 13, 17, 19}` |
| Gaps | `2, 4, 2, 4, 2` |
| Modulus | `210 = 2·3·5·7` |
| Non-exceptional residues | `210n + {97, 101, 103, 107, 109, 113}` |

**5 ∣ 210** → 5 is excluded from the non-exceptional residue class.

## Two-cube measurement

| Cube A (binary) | `1,2,4,8,16,32,64,128` |
| Cube B (gaps) | `0,2,6,8,12,14,18,20` |
| Squared diffs | `1,0,4,0,16,324,2116,11664` |
| **Six axes** (nonzero) | `1,4,16,324,2116,11664` |

## Cascade bands

| Band | Dims | Role |
|------|------|------|
| **ops** | 0…10 | Runnable pipeline (orchestrator @ 10) |
| **recon** | 11…16, 20…23 | Digest / BuckeyBall / intermediate |
| **resolve** | 17, 18, 19 | `{17,19}` = zero-sphere around **18±1** |
| **lattice** | 24 | **4!** · Leech kissing **196 560** |
| **address** | 256…65536 | `2^n` labels |
| **boundary** | **2036** | `2048 − 12` corruption singularity |

```
0 → 3 → 5 → 7 → 9 → 11 → 13 → 17 → 19 → 20 → … → 24
        …
1024 → 2048  (boundary 2036) → 4096 → … → 65536 = 2¹⁶
16⁸ = 2³² ≡ 0 (mod 2¹⁶)  →  cycle toward 0x0000
```

## API

```js
const {
  classifyDim,
  sixAxes,
  sexyResidueSet,
  CORRUPTION_BOUNDARY,
  ladderSummary,
  selfTest
} = require('./shared/dimension-ladder');

classifyDim(10);    // { band: 'ops', role: 'orchestrator', safe: true }
classifyDim(2036);  // { band: 'boundary', safe: false }
classifyDim(65536); // address / Blob ceiling
```

## Important

- **Runnable geometry** stays in **−9D…10D** (+ toolkit, WASM, agreement).
- Higher dims are **orthogonal classification**, not live buffer ranks.
- Past **2036**, the formal text treats imaginary projective extension as singular; software still uses **2¹⁶ Blob** as the practical ceiling.

```bash
node -e "console.log(require('./shared/dimension-ladder').selfTest())"
```
