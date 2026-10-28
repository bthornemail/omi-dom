# OMI-IMO

**A deterministic atomic protocol for spatial coordination**

Version **2.0.0** · License **CC0-1.0** · Status **canonical**

Every operation reduces to **XOR**.  
Primitive: `Atomics.compareExchange` → **bind · apply · eval · digest**.  
Fixed point: **`0x0000`**.

For a full reader’s guide (built vs open, routes, tests, files), see **[STATUS.md](./STATUS.md)**.

---

## Quick start

```bash
cd omi-dom-stack
node server/server.js
# → http://localhost:8742
```

| Route | Purpose |
|-------|---------|
| `/` | Bootstrap HTML (content-negotiated) |
| `/adopt` | Adoption demo |
| `/genesis` | 23-chapter walkthrough |
| `/genesis-fold` | Interactive torus ↔ Dali Cross |
| `/api/pipeline` | Full pipeline JSON |
| `/api/bundle` | Shareable meta-compile bundle |
| `/api/witness` | POST submit / GET `:id` |
| `/api/agree` | Cross-instance agreement |
| `/api/observers` | Observer registry |
| `/signal` | WebSocket signaling (WebRTC + gossip) |
| `/docs/*` | Documentation |
| `/client/*` | Client assets |

```js
const { runPatternPipeline } = require('./shared/pattern-pipeline');
const result = runPatternPipeline(
  { clientX: 100.4, clientY: 50.6, pressure: 0.8 },
  { snap: { mode: 'square', size: 16 }, mediaType: 'svg', converge: true }
);
// result.fixed === true  ·  centroid path → 0x0000
```

---

## Core concepts

1. **XOR** — universal reduction  
2. **Primitive** — `Atomics.compareExchange` → bind · apply · eval · digest  
3. **0x0000** — fixed point under rotation / agreement  
4. **3!** — six orderings of `{BL, BO, BPE}` and of `{stdin, stdout, stderr}`  
5. **Factorial ladder** — `0!…7!` with **5040 = 7!** slide-rule ring  
6. **Pipeline** — pointer → snap → triple → n-gram → GNN → orchestrator → edit  
7. **Agreement** — witnesses, quorum, P2P gossip  

---

## Pattern pipeline

```
Pointer event
  → attribution
  → snap-to-grid (polyform / solid toolkit)
  → trigintaduonion triple
  → edge n-gram spectral address
  → spatial GNN
  → contrasting orchestrator (diff → 0)
  → constraint / media edit
  → 0x0000
```

---

## Toolkit (172+)

| Toolkit | Count | Role |
|---------|------:|------|
| Polyforms | 24 | 2D tiling |
| Platonic | 5 | 3D volumetric |
| Archimedean | 13 | 2.5D prismatic |
| Catalan | 13 | 3D dual |
| Johnson | 92 | irregular convex |
| Kepler–Poinsot | 4 | regular star |
| Uniform stars | 15+ | nonconvex uniform |
| 4D polychora | 6 | hyperspace |

---

## Modules (`shared/`)

| Module | Role |
|--------|------|
| `ruler.js` | bind / apply / eval / digest |
| `clock-sliderule.js` | 240-clock · 5040 · −4D color codex |
| `dimension-pipeline.js` | −5D→10D · SVG @ 6D |
| `constraint-pipeline.js` | −5D…−1D text/binary |
| `regex-constraints.js` | G constraint set |
| `hit-zones-cues.js` | `<area>` · WebVTT · cues |
| `solid-toolkit.js` | polyforms + Platonic / Archimedean / Catalan / 4D |
| `solid-toolkit-extended.js` | Johnson · KP · uniform stars |
| `solid-to-triple.js` | 155 triples |
| `edge-ngram.js` | spectral addresses |
| `spatial-gnn.js` | message-passing XOR |
| `contrasting-orchestrator.js` | converge to 0x0000 |
| `pattern-pipeline.js` | pointer → edit |
| `plugin-api.js` | extension registry |
| `parallel-engine.js` | SAB + Atomics workers |
| `busybox.js` | streams · applets |
| `busybox-versioned.js` | self-healing · 3! orderings |
| `prolog-resolve.js` | Horn-style recover |
| `wordnet-heal.js` | offline recovery map |
| `system-probe.js` | health probes |
| `ascii-table.js` | 0–127 · 6-core suite |
| `codex-agreement.js` | witnesses |
| `witness-exchange.js` | store / compare |
| `observer-sync.js` | centroid invariance |
| `worker-barrier.js` | cross-worker XOR digest |
| `byzantine-check.js` | quorum |
| `p2p-witness.js` | gossip agreement |
| `wasm-xor.js` | `xor_fold` · `xor_key` · Module compile |
| `hardware-ref.js` | JS vectors vs C/RTL |
| `complete-codex.yaml` | serialized codex |

---

## Client

| Path | Role |
|------|------|
| `bootstrap.html` / `adopt.html` / `genesis*.html` | UI entry |
| `genesis-interactive.js` | knot · torus · Dali Cross |
| `webgl-renderer.js` | perspective 3D |
| `webaudio-renderer.js` | continuous PannerNode path |
| `texttrack-attach.js` | native VTT / TextTrack |
| `transmute-worker.js` / `transmute-coordinator.js` | 4-slice Blob compose/decompose |
| `webrtc-channel.js` | browser DataChannel + signaling |
| `worklets/*` | Audio / Paint / Layout / Animation · WASM audio |

---

## Server

| Path | Role |
|------|------|
| `server/server.js` | HTTP/1.1 · SSE · APIs · static |
| `server/signaling.js` | WebSocket `/signal` |

---

## Hardware

| Path | Role |
|------|------|
| `hardware/verilog/omi_*.v` | XOR · BQF · swap · CAS · 240-clock |
| `hardware/c/omi_hw_ref.c` | bit-exact C reference (**19/19**) |
| `hardware/docs/CORRESPONDENCE.md` | RTL ↔ C map |

Board-level Zynq P&R remains **open**.

---

## Meta-compile / share

```bash
curl -o omi-imo-bundle.json http://localhost:8742/api/bundle
```

Returns client + shared sources for offline adoption (CC0).

---

## Tests

```bash
./final-test.sh
node test/inter-instance.test.js   # 32/32
node test/transmute.test.js        # lossless proof
```

Shared module `selfTest` totals **~223** assertions; plus inter-instance, transmute, and C **19** → **~260+** green overall. Details: [STATUS.md](./STATUS.md).

---

## Extend

```js
const {
  registerSnapMode,
  registerSolid,
  registerMediaEditor
} = require('./shared/plugin-api');
```

---

## Documentation map

| Doc | Content |
|-----|---------|
| [STATUS.md](./STATUS.md) | Built · verified · open · routes · tests |
| [BOOTSTRAP.md](./BOOTSTRAP.md) | Adopt · participate · extend |
| [GENESIS.md](./GENESIS.md) | 23-chapter narrative |
| [HANDOFF.md](./HANDOFF.md) | Verify · run · share |
| [WASM-WORKLETS.md](./WASM-WORKLETS.md) | Module transfer · AudioWorklet |

---

License **CC0-1.0**.  
The observer is the **0x0000** centroid. The observer is **you**.
