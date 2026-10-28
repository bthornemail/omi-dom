#!/usr/bin/env bash
# OMI-IMO final verification
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
PORT="${PORT:-8742}"
FAIL=0

echo "=== OMI-IMO final-test ==="

node -c server/server.js || { echo "FAIL server syntax"; exit 1; }
echo "OK server syntax"

# Self-tests (sync modules)
for m in ruler clock-sliderule hit-zones-cues dimension-pipeline busybox ascii-table \
  solid-toolkit solid-toolkit-extended solid-to-triple edge-ngram spatial-gnn \
  contrasting-orchestrator pattern-pipeline plugin-api hardware-ref; do
  if node -e "const r=require('./shared/$m').selfTest(); if(!r.passed) process.exit(1)" 2>/dev/null; then
    echo "OK selfTest $m"
  else
    echo "FAIL selfTest $m"; FAIL=1
  fi
done

# Parallel engine (async)
if node -e '
const pe=require("./shared/parallel-engine");
pe.selfTest().then(r=>{ if(!r.passed) process.exit(1); }).catch(()=>process.exit(1));
' 2>/dev/null; then
  echo "OK selfTest parallel-engine"
else
  echo "FAIL selfTest parallel-engine"; FAIL=1
fi

# Hardware C reference
if command -v cc >/dev/null 2>&1; then
  cc -O2 -std=c99 -o /tmp/omi_hw_ref hardware/c/omi_hw_ref.c 2>/dev/null && /tmp/omi_hw_ref >/dev/null \
    && echo "OK hardware C 19 vectors" || { echo "FAIL hardware C"; FAIL=1; }
else
  echo "SKIP hardware C (no cc)"
fi

# Boot server and hit routes
node server/server.js &
SPID=$!
sleep 1
cleanup() { kill $SPID 2>/dev/null || true; }
trap cleanup EXIT

for path in / /adopt /genesis /genesis-fold /api/pipeline /api/bundle /docs/README.md; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}${path}" || echo 000)
  if [ "$code" = "200" ]; then
    echo "OK HTTP $path → $code"
  else
    echo "FAIL HTTP $path → $code"; FAIL=1
  fi
done

pipe=$(curl -s "http://127.0.0.1:${PORT}/api/pipeline?q=final-test")
echo "$pipe" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d); if(!j.ok) process.exit(1); console.log("OK pipeline ok tokens", (j.tokens||[]).length);})' \
  || { echo "FAIL pipeline body"; FAIL=1; }

bundle=$(curl -s "http://127.0.0.1:${PORT}/api/bundle" | head -c 200)
echo "$bundle" | grep -q omi-imo-meta-compile && echo "OK bundle header" || { echo "FAIL bundle"; FAIL=1; }

if [ "$FAIL" -eq 0 ]; then
  echo "=== ALL FINAL CHECKS PASSED ==="
  exit 0
else
  echo "=== SOME CHECKS FAILED ==="
  exit 1
fi
