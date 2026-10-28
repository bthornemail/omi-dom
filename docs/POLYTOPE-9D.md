# 9D interference injection

## Role

The **9D triple** is the first **interference injector** into the 8D polytope CAS:

```
8D base  --inject-->  9D interference  --infer-->  10D (later)
```

| 9D polytope | Schläfli | Vertices | CAS phase |
|-------------|----------|----------|-----------|
| 9-simplex | `{3}⁸` | **10** | bind9 |
| 9-cube | `{4,3⁷}` | **512** | apply9 |
| 9-orthoplex | `{3⁷,4}` | **18** | eval9 |
| terminal | the **4** | — | **0x004** |

All χ = 0 (n-sphere boundary).

## Interference signal

```
Interference9 = Delta9 ⊕ Eval9_old ⊕ Terminal9
```

- **Delta9** = swap16₉ ⊕ swap32₉ ⊕ swap64₉ ⊕ carry₉ (10-bit)
- **Eval9_old** = previous latched delta (orthoplex “return old value”)
- **Terminal9** = `0x004` (same dual-break **4** as 8D, on a 10-bit bus)

## Injection into 8D

Low 8 bits of `Interference9` XOR into the **8D carry** line:

```
Δ₈ = apply8(vertex₈, carry₈ ⊕ (Interference9 & 0xFF))
```

So 9D does not replace 8D — it **modulates** the 8D delta law.

## Software

```js
const {
  create9DEngine,
  inject9into8,
  apply9,
  TERMINAL9
} = require('./shared/polytope-9d-inject');

const eng = create9DEngine();
eng.step(0x01, 0);
eng.step(0x00, 0);  // interference uses previous Δ

inject9into8(0x01, 0, 0x01, 0, null, null);
// eight.apply.delta still 0x8A when inj carry is 0 on first cycle
```

```bash
node -e "console.log(require('./shared/polytope-9d-inject').selfTest())"
```

## Breadboard note

Full 10-bit 9D on DIP + 74HC86 is a **large** build (see expanded BOM).  
Practical path: simulate 9D in software / MCU, inject the low byte into the **existing 8D** carry pin.

## Stack order

1. 8D CAS determinism (`polytope-cas.js`)  
2. **9D interference** (this module)  
3. 10D inference (optional next)  
4. RF modem transports final digests  

Terminal **4** stays the observer unit at every level.
