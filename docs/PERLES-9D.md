# −9D Perles Cross-Ratio Sieve

**Pre-computational · 9 points · 9 lines · golden ratio φ**

The −9D layer sits **below −7D Fano**. It encodes the **Perles configuration** — the smallest classical point–line configuration that is **not** realizable with only rational Euclidean coordinates (φ is required).

This module is a **discrete sieve** (incidence, Fibonacci/φ bands, 9-mask XOR closure, optional cross-ratio score). It is **not** a CAD embedding of Perles in the plane.

---

## Placement

```
−9D  Perles cross-ratio sieve   ← this module
−7D  Fano tick gate
−5D  Blob substrate (2¹⁶)
−4D…−1D  constraint pipeline
 0D  observer
 …
+4D  DOMMatrix / endian folds
```

---

## Why Perles at −9D

| Feature | Value |
|---------|--------|
| Points | 9 |
| Lines | 9 |
| Realizability | Requires **φ = (1+√5)/2** |
| Role | Projective / irrational pre-header before rational regex layers |

Fano (−7D) locks **mod-7** associativity anchors for octonions.  
Perles (−9D) locks a **φ-sensitive** incidence model under the same XOR-closure discipline.

---

## API (`shared/perles-9d-gate.js`)

```js
const {
  PHI,
  gateByte,
  gateCross,
  gateBuffer,
  crossRatioScore,
  isPhiRatio,
  mask9Closure,
  PERLES_LINES
} = require('./shared/perles-9d-gate');

gateByte(0x15);
gateCross(0, 5, 8, 13);           // ordered quadruple
gateBuffer(new Uint8Array([1,2,3,5,8]));
isPhiRatio(8, 5);                 // Fibonacci ≈ φ
mask9Closure(0xa5).closed;        // true (involution)
```

### Regex forms

| Name | Role |
|------|------|
| `PERLES_TICK` | `point:line:hex` structural token |
| `PERLES_CROSS` | four indices `a,b,c,d` |
| `PERLES_PHI` | `phi` · `inv` · `a:b` ratio |

### Cross-ratio surrogate

\[
(A,B;C,D)=\frac{(C-A)/(C-B)}{(D-A)/(D-B)}
\]

Scored in JS floats only for **admission** (`nearPhi` / `nearInv`); not used for layout.

### 9-mask closure

Fibonacci-derived masks `(F_i * 7) & 0xff` for `i = 0..8`.  
**Twice ≡ identity**.

---

## Optional stack order

```js
const { gateBuffer: gate9 } = require('./perles-9d-gate');
const { gateBuffer: gate7 } = require('./fano-7d-gate');

const a = gate9(bytes, { requireClosure: true });
const b = gate7(bytes, { requireClosure: true });
if (a.admit && b.admit) {
  // proceed to −5D constraint-pipeline
}
```

---

## Tests

```bash
node -e "console.log(require('./shared/perles-9d-gate').selfTest())"
```

---

## Non-goals

- Full geometric drawing of Perles with exact φ coordinates  
- Replacing −5D…−1D production constraints  
- RF or analog hardware  

−9D is the **irrational / projective pre-header**; −7D is the **Fano tick**; both feed the existing Blob and observer stack toward **0x0000**.
