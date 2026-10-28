# Circuit walkthrough — VTT · BusyBox · DOM

## Goal

A **platform- and hardware-agnostic** interactive tutorial that *feels* like building a distributed spectral circuit, using pieces you already have:

| Piece | Role |
|-------|------|
| **WebVTT** | Timed spool of steps (CUPS print-job metaphor) |
| **BusyBox applets** | `echo` · `xor` · `connect` · `probe` · `digest` |
| **DOM** | `data-omi-*` schematic nodes + `<area>` hit zones |
| **Witness** | XOR digest for pseudo-persistence (reload / peer) |

## Important honesty

This is **educational / simulated** “RF” — dimensional and XOR structure, Fano tick, E₈ 240 shell — **not** a real radio transmitter or licensed RF stack. Hardware-agnostic by design.

## Modules

- `shared/circuit-walkthrough.js` — lessons → VTT, schematic HTML, applets, witness  
- `client/circuit.html` — interactive page (localStorage step + optional TextTrack)

## Headless use

```js
const { createWalkthrough } = require('./shared/circuit-walkthrough');
const w = createWalkthrough();
w.vtt;           // WEBVTT spool
w.schematic.html;
w.witness.hex;   // pseudo-persist key
w.stepAt(2);     // run applet for step
```

## Browser

Serve the stack, open `/circuit.html` (or static path to `client/circuit.html`).

## Distributed angle

Same witness digest can be posted to `/api/witness` or P2P gossip so two observers agree on the schematic without shared hardware.

```bash
node -e "console.log(require('./shared/circuit-walkthrough').selfTest())"
```
