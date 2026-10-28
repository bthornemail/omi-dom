# OMI-IMO Handoff Procedure

**Version 2.0.0 · CC0-1.0**

## 1. Verify

```bash
cd omi-dom-stack
./final-test.sh
node test/inter-instance.test.js
node test/transmute.test.js
```

Expect: server syntax, self-tests, HTTP **200** on core routes, pipeline `ok:true`, bundle header, inter-instance **32/32**, transmute lossless.

Full status matrix: **[STATUS.md](./STATUS.md)**.

## 2. Run

```bash
node server/server.js
# http://localhost:8742/
# /adopt  /genesis  /genesis-fold
# /api/pipeline  /api/bundle  /api/witness  /api/agree  /api/observers
# WS /signal
```

## 3. Share

```bash
curl -o omi-imo-bundle.json http://localhost:8742/api/bundle
```

## 4. Key entry points

| Path | Role |
|------|------|
| `shared/pattern-pipeline.js` | pointer → constraint edit |
| `shared/plugin-api.js` | extensions |
| `shared/wasm-xor.js` | WASM XOR core |
| `shared/p2p-witness.js` | P2P agreement |
| `client/genesis-interactive.js` | knot · torus · Dali Cross |
| `client/webgl-renderer.js` | perspective 3D |
| `client/webaudio-renderer.js` | continuous PannerNode |
| `client/texttrack-attach.js` | native VTT timing |
| `client/transmute-coordinator.js` | 4-canvas lossless proof |
| `hardware/` | Verilog + C reference |

## 5. Fixed point

Orchestrator / witness path converges at **`diff === 0` / `centroid === '0x0000'`**.  
The observer is the centroid. The observer is you.
