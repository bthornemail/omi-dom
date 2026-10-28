# Packing · Kissing · 2036 / 2048

## Two different numbers

| Number | Meaning | Domain |
|-------:|---------|--------|
| **196 560** | Leech lattice kissing number in **24D** | Mathematics (proven optimal packing) |
| **240** | E₈ kissing number in **8D** · also OMI **240-clock** | Math + protocol |
| **24** | Kissing number in **4D** · also **4!** · recon dim 24 | Math + protocol |
| **2036** | `2048 − 12` capacity / singularity | **Protocol only** |
| **2048** | `2¹¹` address dimension | Protocol |

**2036 is not the Leech kissing number.**  
The protocol boundary reuses the *idea* of a maximal shell (packing capacity) at the 11-bit address edge, with 12 control dimensions reserved (BuckeyBall-high). The actual Leech τ remains **196 560**.

## Quadratic form

OMI affine BQF:

\[
Q(x,y)=(4x+2y)^2 = 4(2x+y)^2 = 2\cdot\bigl(2(2x+y)^2\bigr)
\]

So **“max sphere packing of \(2(2x+y)^2\)”** in the narrative is the same parabolic family as the hardware/software BQF tracker — a **coordinate form**, not a substitute for Λ₂₄.

## Alignment map

```
4! = 24  →  4D kissing · recon-24 · Leech dimension
E₈ τ = 240  →  OMI 240-clock
Leech τ = 196560  →  lattice kissing (math)
2048 − 12 = 2036  →  protocol address capacity boundary
```

## API

```js
const { packingBridge, qAffine, LEECH_KISSING, CAPACITY_2036 } =
  require('./shared/packing-kiss');

packingBridge();
qAffine(1, 1); // 36
```

```bash
node -e "console.log(require('./shared/packing-kiss').selfTest())"
```

## References (math)

- Leech lattice kissing **196 560** in 24D; densest packing in 24D (Cohn–Kumar–Miller–Radchenko–Viazovska).
- E₈ kissing **240** in 8D.
- 4D kissing **24** (Musin).
