# Breadboard algorithmic determinism — 8-Polytope CAS

## Priority

**Build determinism first** (bind / apply / eval / digest on XOR).  
RF spatial modem is **optional downstream transport** for digests.

## Mapping

| Phase | Operation | Polytope | Hardware |
|-------|-----------|----------|----------|
| **bind** | latch vertex | 8-simplex (9 states) | 74HC74 |
| **apply** | Δ = swap16 ⊕ swap32 ⊕ swap64 ⊕ C | 8-cube (256) | 74HC86 ×6 |
| **eval** | latch old Δ | 8-orthoplex (16) | 74HC74 |
| **digest** | terminal **0x04** · centroid | the **4** (1!) | LED |

Verification (carry = 0):

| vertex | Δ |
|-------:|--:|
| 0x01 | **0x8A** |
| 0x02 | **0x45** |

Centroid ON when eval == **0x04**. Dual-lock ON when  
`simplex ⊕ cube ⊕ orthoplex == 0`.

## Two hardware paths (same math)

1. **Discrete transistors** — 5–6 BJTs for a single XOR (see attached article: NAND+switch+OR style, or 6T with driven output). Teaching only.
2. **74HC86 + 74HC74** — full 8-bit CAS breadboard (walkthrough BOM). Preferred for the pipeline.

## Software

```js
const { createCASEngine, apply, TERMINAL } = require('./shared/polytope-cas');
apply(0x01, 0);           // { delta: 0x8A, ... }
const eng = createCASEngine();
eng.step(0x01, 0);
eng.step(0x04, 0);        // eval holds previous Δ; centroid if 0x04
```

```bash
node -e "console.log(require('./shared/polytope-cas').selfTest())"
```

## RF (decentralized modem)

After digests are deterministic, optional:

- Map digest bytes → 64-bit frames (`shared/rf-spectrum.js`)
- ISM-915 / MURS / CB within legal power (`docs/SPATIAL-MODEM.md`)
- VTT / circuit UI remains the tutorial shell (`client/circuit.html`)

**Order:** polytope CAS → witness → (optional) RF hop.

## χ = 0

All three 8-polytopes are treated as n-sphere boundary (χ = 0) — the fixed-point story at **0x0000**, with terminal **4** as the dual break.
