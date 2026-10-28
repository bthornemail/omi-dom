# 10D isometric inference

## Cascade

```
8D base  --inject-->  9D interference  --infer-->  10D inference
```

| 10D polytope | Vertices | CAS phase |
|--------------|----------|-----------|
| 10-simplex | **11** | bind10 |
| 10-cube | **1024** | apply10 |
| 10-orthoplex | **20** | eval10 |
| terminal **4** | — | **0x004** (11-bit) |

All χ = 0.

## Inference formula

```
Inference10 = Delta10 ⊕ Eval10_old ⊕ Terminal10
```

Same dual-break **4** as 8D/9D, on an **11-bit** bus.

## Isometric lock

From the walkthrough Verilog sketch:

```
isometric_lock =
  (Interference9[7:0] == 0x04) &&
  (Inference10[7:0]  == 0x04)
```

When both injectors present the terminal byte, the cascade is **locked** to the observer unit.

## Full step API

```js
const { cascade8910, create10DEngine } = require('./shared/polytope-10d-infer');

cascade8910({
  vertex8: 0x01,
  vertex9: 0,
  vertex10: 0
});
// { eight, nine, ten, injectedCarry, isometricLock, full }
```

9D still XOR-modulates 8D carry; 10D reports inference and participates in the lock.

## Software modules

| Module | Role |
|--------|------|
| `polytope-cas.js` | 8D base |
| `polytope-9d-inject.js` | 9D interference |
| `polytope-10d-infer.js` | 10D inference + cascade8910 |

```bash
node -e "console.log(require('./shared/polytope-10d-infer').selfTest())"
```

## Hardware note

11-bit 10D on discrete 74HC is a lab exercise, not a first build.  
Practical path: **8D on breadboard**, 9D/10D in MCU/sim, lock flag as a single LED driven by the host.

## Order

1. 8D determinism (Δ 0x01→0x8A)  
2. 9D inject into carry  
3. **10D infer + isometric lock**  
4. Optional RF transport of digests  

Terminal **4** remains invariant across 8D / 9D / 10D.
