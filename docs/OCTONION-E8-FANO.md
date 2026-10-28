# 8D Octonions · E₈ · −7D…0D Fano constraint space

## Reading

```
−7D … 0D   Fano point-constraint space
              7 points / 7 lines = 7 imaginary units e₁…e₇
              phase mod 7 · incidence · regex pre-header
        ↓
  8D       Octonion algebra 𝕆 = ℝ ⊕ Im(𝕆)
              + E₈ root system (|Φ| = 240)
              + OMI 240-clock
```

So the **−7D→0D Fano constraint space** is the combinatorial skeleton of octonion multiplication; **E₈** is the metric root shell on the same **8D** stage.

## Facts

| Object | Value |
|--------|------:|
| Octonion dim | **8** = 1 real + **7** imag |
| Fano plane | **7** points · **7** lines |
| E₈ roots | **240** |
| OMI clock | **240** frames |

Multiplication of imaginary units follows oriented Fano lines  
`(1,2,3), (1,4,5), (1,6,7), (2,4,6), (2,5,7), (3,4,7), (3,5,6)`.

## API

```js
const { mulImag, bridgeSummary, FANO_CONSTRAINT_SPAN } =
  require('./shared/octonion-e8-fano');

mulImag(1, 2);  // 3
bridgeSummary();
```

## Stack placement

- **−7D** `fano-7d-gate.js` — tick / incidence / closure  
- **−5D…−1D** constraint pipeline  
- **0D** observer  
- **8D** this module — algebra + E₈ count  
- **24D / 2048D** projective meta-swap (see `projective-swap-space.js`)

```bash
node -e "console.log(require('./shared/octonion-e8-fano').selfTest())"
```
