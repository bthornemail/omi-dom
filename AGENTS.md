# AGENTS.md

OMI-IMO: a deterministic XOR-based spatial protocol. Plain CommonJS Node>=16, no build step, no lint/format/typecheck tooling. Only runtime dep is `ws`. Package name is `omi-imo`; subpath exports in `package.json` (`omi-imo/pipeline`, `/plugin-api`, `/ruler`, `/solid-toolkit`, `/dimension-pipeline`) map to `shared/*.js`.

## Commands

- Run server: `node server/server.js` → `http://localhost:8742` (override with `PORT=xxxx`).
- `npm test` — runs **sync** `selfTest()` of the 15 module names hard-coded in the `test` script. It silently skips async modules (it checks `r.then`), so `parallel-engine` is NOT covered, and nothing in `test/` runs.
- Room-level suites (no framework, plain Node scripts):
  - `node test/inter-instance.test.js` — agreement/witness/observer/byzantine/worker-barrier (32 checks)
  - `node test/transmute.test.js` — lossless audio/video transmutation proof (uses `client/*` worker_threads)
- Full gate: `bash final-test.sh` (NOT `./` — file isn't executable). Requires `curl`; C reference is compiled+run only if `cc` is present, otherwise that check is skipped.

After adding a new module with a self-test, add its name to BOTH the `npm test` array in `package.json` and the loop in `final-test.sh` (they differ: final-test also covers `parallel-engine` and `hardware-ref`).

If you change a server route or add a client file, extend the route list / `clientFiles` in `final-test.sh` and in `/api/bundle` (`server/server.js`).

## Layout

- `shared/` — the protocol: pipeline (`pattern-pipeline.js` is the main entry), `ruler.js` (bind/apply/eval/digest), solids, GNN, orchestrator, `plugin-api.js` (extensions), `parallel-engine.js` (worker_threads). Every module exports `selfTest()` returning `{passed,total,failed,results}`; `parallel-engine`'s is async (returns a Promise).
- `server/server.js` — zero-dep HTTP server (http/fs/path only). Content-negotiates `/` from the `Accept` header (text/html beats text/event-stream). Routes: `/`, `/adopt`, `/genesis`, `/genesis-fold`, `/events` (SSE), `/api/pipeline` (GET|POST `q`/`text`), `/api/bundle` (meta-compile JSON), `/api/witness` (POST), `/api/witness/:id`, `/api/agree`, `/api/observers`, `/docs/*`, `/client/*`, `/shared/*` static, plus WebSocket `/signal`.
- `client/` — browser JS + HTML, served as static files (no bundler). Some files double as Node worker code (e.g. `transmute-coordinator.js` / `transmute-worker.js` use `worker_threads`).
- `server/signaling.js` — WebSocket signaling + witness gossip via `ws` at `/signal`; loads gracefully (warns) if `ws` is unavailable.
- `hardware/` — C + Verilog reference (`hardware/c/omi_hw_ref.c`, 19 vectors); compiled only by `final-test.sh`. `hardware/docs/CORRESPONDENCE.md` maps Verilog/C/JS semantics.
- `docs/` — markdown served at `/docs/*`. `docs/README.md` and `docs/HANDOFF.md` are the canonical usage docs.
- `dev-docs/` — personal scratch notes (many large unversioned `Untitled*.md`/PDFs). NOT served, NOT canonical; don't treat as authoritative or edit.

## Gotchas

- `parallel-engine.js`: `SharedArrayBuffer` may be unavailable without flags; code falls back to `ArrayBuffer` (single-process) and falls back to main-thread execution if workers time out — tests pass on plain `node`.
- `test/transmute.test.js` runs Node worker-thread code that lives under `client/`.
- All code uses `'use strict'` and CommonJS `require`; no ESM, no test framework, no linter — match that style.