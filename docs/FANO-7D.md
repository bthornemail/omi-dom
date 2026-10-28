# −7D Fano Tick Gate

**Pre-computational sieve · Fano plane · O(1) bitwise**

The −7D layer sits **below** the −5D Blob substrate. It does **not** perform DOMMatrix / Rubik face moves (those are **+4D**). It validates **phase, incidence, and parity** before higher Cayley–Dickson structure is used.

---

## Why −7D

| Concept | Value |
|---------|-------|
| Fano plane | 7 points · 7 lines · 3 points per line |
| Slide-rule | `7! = 5040` |
| Phase | `π = popcount(seed) mod 7` (0 → 7) |
| Role | Lock genus before octonion / 64nion ascent |

Without a stable 7-fold tick, higher non-associative algebras drift. The gate is **regex + bitwise**, not floating-point geometry.

---

## Placement in the stack

```
−7D  Fano tick / incidence / 13-mask closure   ← this module
−5D  Blob substrate (2¹⁶)
−4D  Color codex (4!)
−3D  Delimiters
−2D  Non-alphanumeric
−1D  Alphanumeric grammar
 0D  Observer (PannerNode)
 …
+4D  DOMMatrix / swap16·32·64 (Rubik-style folds)
```

---

## API (`shared/fano-7d-gate.js`)

```js
const {
  fanoPhase,
  parityCode,
  mask13Closure,
  gateByte,
  gateBuffer,
  admitToken,
  FANO_LINES,
  FANO_REGEX
} = require('./shared/fano-7d-gate');

fanoPhase(0x07);           // 3
parityCode(0x20, 0x00);    // 1  → active incidence lane
mask13Closure(0x5a);       // { closed: true, once, twice }
gateByte(0x0f, { chirality: 30 });
gateBuffer(new Uint8Array([0, 7, 255]));
admitToken('7:3:1', 'FANO_TICK');
```

### Regex forms

| Name | Pattern role |
|------|----------------|
| `FANO_TICK` | `phase:line:point` structural token |
| `FANO_INCIDENCE` | `0x01`–`0x07` or `1`–`7` |
| `FANO_CHIRALITY` | `half\|full : 30\|120 : [hex dens]` |

### 13-mask closure

Sequential XOR with  
`[0x00,0x07,0xFF,0x78,0x87,0x20,0x80,0xAA,0x55,0x27,0xD8,0xA0,0x07]`.  
Applied **twice** recovers the input (involution). Single-pass output is diagnostic only.

---

## Relation to −5D…−1D pipeline

`constraint-pipeline.js` remains the **−5D→−1D** text/binary sieve.  
−7D is an **optional pre-header**:

```js
const { gateBuffer } = require('./fano-7d-gate');
const pre = gateBuffer(bytes, { requireClosure: true });
if (!pre.admit) { /* reject before −5D */ }
// else continue into constraint-pipeline / dimension-pipeline
```

---

## Tests

```bash
node -e "console.log(require('./shared/fano-7d-gate').selfTest())"
```

Expect **passed: true**.

---

## Non-goals

- Not RF transmitter hardware  
- Not +4D matrix rotations  
- Not GNN training  

−7D is a **constant-time structural gate** aligned with the Fano plane and the **0x0000** involution story (XOR closed under the 13-mask ring).
