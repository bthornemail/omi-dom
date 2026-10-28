# Projective unit geometry · swap space

## Your reading (encoded)

```
3D   Platonic · Archimedean · Catalan   ← volumetric projective bodies
4D   simplex / polychora · 4! = 24      ← simplex geometry of the 24-cell family
5D   presentation surface               ← pipeline projects solids here
        ↓
24D  Leech dimension label · 4! ceiling
        ↓  meta-swap (2ⁿ address expansion)
2048D imaginary projective unit meta-swap space
2036  capacity = 2048 − 12
```

The **swap space** of that unit geometry is:

1. **Solid duals / 4! permutations** — toolkit (Platonic ↔ duals, 24-cell, etc.)
2. **Buffer endian swaps** — `swap16` · `swap32` · `swap64`
3. **3! layout unit** — six orderings of `{BL, BO, BPE}`

Not a separate RPⁿ solver — same XOR / swap discipline as the rest of the stack.

## API

```js
const { projectiveRole, hierarchySummary } =
  require('./shared/projective-swap-space');

projectiveRole(3);     // solid layer
projectiveRole(4);     // simplex · 4!
projectiveRole(24);    // Leech ceiling
projectiveRole(2048);  // meta-swap · capacity 2036
```

## Relation to packing

- **24D** = lattice *dimension* (and 4! label)
- **196 560** = Leech *kissing number* (math)
- **2048 / 2036** = meta-swap *address* capacity (protocol)

See also: `docs/PACKING-KISS.md`, `docs/DIMENSION-LADDER.md`, solid toolkit modules.
