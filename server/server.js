/**
 * OMI-IMO HTTP/1.1 Content-Negotiation + SSE Server
 * Serves:
 *   Accept: text/html          → bootstrap.html (Full DOM Stack)
 *   Accept: text/event-stream  → SSE event stream
 *   Static client assets
 *
 * Orthogonal transport layer of the seven-layer stack.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 8742;
const ROOT = path.resolve(__dirname, '..');
const CLIENT = path.join(ROOT, 'client');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg':  'image/svg+xml'
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function contentType(filePath) {
  return MIME[path.extname(filePath)] || 'application/octet-stream';
}

function preferHtml(accept) {
  if (!accept) return true;
  const parts = accept.split(',').map(s => s.trim().toLowerCase());
  const htmlQ = parts.find(p => p.startsWith('text/html')) ? 1 : 0;
  const sseQ  = parts.find(p => p.startsWith('text/event-stream')) ? 1 : 0;
  // Simple preference: if both present, HTML wins for navigation; SSE for EventSource
  return htmlQ >= sseQ;
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
      return;
    }
    send(res, 200, {
      'Content-Type': contentType(filePath),
      'Cache-Control': 'no-cache',
      'Vary': 'Accept'
    }, data);
  });
}

function handleSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Vary': 'Accept',
    'X-OMI-Layer': 'http1.1-carrier'
  });

  // Initial comment / retry
  res.write(': OMI-IMO SSE stream\n');
  res.write('retry: 3000\n\n');

  let tick = 0;
  const timer = setInterval(() => {
    tick++;
    const payload = JSON.stringify({
      tick,
      t: Date.now(),
      layer: 'carrier',
      msg: 'heartbeat'
    });
    res.write(`id: ${tick}\n`);
    res.write(`event: omi\n`);
    res.write(`data: ${payload}\n\n`);
  }, 2000);

  req.on('close', () => {
    clearInterval(timer);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const accept = req.headers.accept || '';

  // CORS for local experimentation
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE endpoint
  if (url.pathname === '/events' || accept.includes('text/event-stream')) {
    handleSSE(req, res);
    return;
  }

  // Root / bootstrap — content negotiation
  if (url.pathname === '/' || url.pathname === '/bootstrap' || url.pathname === '/index.html') {
    if (preferHtml(accept) || !accept.includes('text/event-stream')) {
      serveFile(res, path.join(CLIENT, 'bootstrap.html'));
      return;
    }
    // rare: client asked for event-stream on /
    handleSSE(req, res);
    return;
  }

  // Adoption bootstrap demo
  if (url.pathname === '/adopt' || url.pathname === '/adopt.html') {
    serveFile(res, path.join(CLIENT, 'adopt.html'));
    return;
  }

  // Genesis narrative walkthrough
  if (url.pathname === '/genesis' || url.pathname === '/genesis.html') {
    serveFile(res, path.join(CLIENT, 'genesis.html'));
    return;
  }

  // Interactive fold: torus ↔ Dali Cross
  if (url.pathname === '/genesis-fold' || url.pathname === '/genesis-fold.html') {
    serveFile(res, path.join(CLIENT, 'genesis-fold.html'));
    return;
  }

  // Walkthrough wiki: the data-driven breadboard player
  if (url.pathname === '/wiki' || url.pathname === '/wiki.html') {
    serveFile(res, path.join(CLIENT, 'wiki.html'));
    return;
  }

  // Walkthrough wiki chapter data + generated index
  if (url.pathname === '/wiki/index.json') {
    try {
      const { compileWiki } = require(path.join(__dirname, '..', 'wiki', 'meta-compile.js'));
      const result = compileWiki();
      if (!result.ok) throw new Error(result.errors.join('; '));
      send(res, 200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' },
        JSON.stringify({ index: result.bundle.index, centroid: result.bundle.centroid, tally: result.bundle.tally }, null, 2));
    } catch (err) {
      send(res, 500, { 'Content-Type': 'application/json' }, JSON.stringify({ ok: false, error: String(err.message || err) }));
    }
    return;
  }
  if (url.pathname.startsWith('/wiki/chapters/')) {
    const safe = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(ROOT, safe);
    if (!filePath.startsWith(path.join(ROOT, 'wiki', 'chapters'))) {
      send(res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');
      return;
    }
    serveFile(res, filePath);
    return;
  }
  if (url.pathname === '/api/wiki') {
    try {
      const { compileWiki } = require(path.join(__dirname, '..', 'wiki', 'meta-compile.js'));
      const result = compileWiki();
      if (!result.ok) {
        send(res, 500, { 'Content-Type': 'application/json' }, JSON.stringify({ ok: false, errors: result.errors }));
        return;
      }
      const body = JSON.stringify({
        ok: true,
        name: result.bundle.name,
        version: result.bundle.version,
        index: result.bundle.index,
        tally: result.bundle.tally,
        faces: result.bundle.faces,
        centroid: result.bundle.centroid,
        vtt: result.bundle.vtt,
        digest: result.bundle.digest,
        chapters: result.bundle.chapters
      }, null, 2);
      send(res, 200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' }, body);
    } catch (err) {
      send(res, 500, { 'Content-Type': 'application/json' }, JSON.stringify({ ok: false, error: String(err.message || err) }));
    }
    return;
  }

  // Docs (markdown as text/markdown)
  if (url.pathname.startsWith('/docs/')) {
    const safe = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(ROOT, safe);
    if (!filePath.startsWith(path.join(ROOT, 'docs'))) {
      send(res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        send(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
        return;
      }
      const ct = filePath.endsWith('.md') ? 'text/markdown; charset=utf-8' : contentType(filePath);
      send(res, 200, { 'Content-Type': ct }, data);
    });
    return;
  }

  // Static client assets
  if (url.pathname.startsWith('/client/')) {
    const safe = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(ROOT, safe);
    if (!filePath.startsWith(ROOT)) {
      send(res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');
      return;
    }
    serveFile(res, filePath);
    return;
  }

  // Shared modules (for Node workers later)
  if (url.pathname.startsWith('/shared/')) {
    const safe = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(ROOT, safe);
    if (!filePath.startsWith(ROOT)) {
      send(res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');
      return;
    }
    serveFile(res, filePath);
    return;
  }

  // Meta-compile: downloadable / shareable client + shared sources + genesis index
  if (url.pathname === '/api/bundle') {
    try {
      const readSafe = (rel) => {
        try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (_) { return null; }
      };
      const clientFiles = ['bootstrap.html', 'adopt.html', 'genesis.html', 'genesis-fold.html', 'wiki.html', 'wiki.js', 'genesis-interactive.js', 'webgl-renderer.js', 'webaudio-renderer.js', 'texttrack-attach.js', 'dom-stack.js', 'svg-worker.js'];
      const sharedFiles = [
        'pattern-pipeline.js', 'plugin-api.js', 'ruler.js', 'dimension-pipeline.js',
        'constraint-pipeline.js', 'regex-constraints.js', 'solid-toolkit.js',
        'solid-toolkit-extended.js', 'solid-to-triple.js', 'edge-ngram.js',
        'spatial-gnn.js', 'contrasting-orchestrator.js', 'clock-sliderule.js',
        'hit-zones-cues.js', 'busybox.js', 'parallel-engine.js', 'ascii-table.js'
      ];
      const client = {};
      for (const f of clientFiles) {
        const c = readSafe(path.join('client', f));
        if (c != null) client[f] = c;
      }
      const shared = {};
      for (const f of sharedFiles) {
        const c = readSafe(path.join('shared', f));
        if (c != null) shared[f] = c;
      }
      const bundle = {
        name: 'omi-imo-meta-compile',
        version: '2.0.0',
        license: 'CC0-1.0',
        generatedAt: new Date().toISOString(),
        genesisChapters: 23,
        routes: ['/', '/adopt', '/genesis', '/api/pipeline', '/api/bundle', '/wiki', '/api/wiki'],
        client,
        shared,
        wiki: (() => {
          try {
            const { compileWiki } = require(path.join(__dirname, '..', 'wiki', 'meta-compile.js'));
            const result = compileWiki();
            if (!result.ok) return { ok: false, errors: result.errors };
            return {
              ok: true,
              name: result.bundle.name,
              version: result.bundle.version,
              index: result.bundle.index,
              streamComplete: result.bundle.streamComplete,
              vtt: result.bundle.vtt,
              tally: result.bundle.tally,
              faces: result.bundle.faces,
              centroid: result.bundle.centroid,
              digest: result.bundle.digest
            };
          } catch (_) {
            return { ok: false };
          }
        })(),
        docs: {
          'GENESIS.md': readSafe(path.join('docs', 'GENESIS.md')),
          'BOOTSTRAP.md': readSafe(path.join('docs', 'BOOTSTRAP.md')),
          'README.md': readSafe(path.join('docs', 'README.md'))
        },
        note: 'Share or unpack client/ + shared/ sources. Run with Node >=16: node server/server.js after restoring server.js from the repo or rebuilding.'
      };
      const body = JSON.stringify(bundle, null, 2);
      send(res, 200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="omi-imo-bundle.json"',
        'Cache-Control': 'no-cache'
      }, body);
    } catch (err) {
      send(res, 500, { 'Content-Type': 'application/json' }, JSON.stringify({ ok: false, error: String(err.message || err) }));
    }
    return;
  }

  // API: run full −5D→10D pipeline + instantiate areas/cues/clock
  if (url.pathname === '/api/pipeline' && (req.method === 'GET' || req.method === 'POST')) {
    let body = '';
    const finish = (text) => {
      try {
        const { runFullPipeline } = require(path.join(ROOT, 'shared', 'dimension-pipeline'));
        const { instantiateFromPipeline } = require(path.join(ROOT, 'shared', 'hit-zones-cues'));
        const input = text || url.searchParams.get('q') || 'OMI bootstrap\r\ncolor Band1';
        const pipe = runFullPipeline(input);
        const inst = instantiateFromPipeline(pipe, { wireClock: true, structuredVtt: true });
        const payload = {
          ok: pipe.ok,
          tokens: pipe.tokens,
          observer: pipe.observer,
          points: pipe.points,
          rects: pipe.rects,
          matrix: pipe.matrix,
          elements: pipe.elements,
          cues: pipe.cues,
          color: pipe.color,
          svg: pipe.svg,
          validation: pipe.validation,
          mapHtml: inst.mapHtml,
          vtt: inst.vtt,
          metrics: inst.metrics,
          scheduleMetrics: inst.schedule ? inst.schedule.metrics : null
        };
        send(res, 200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' }, JSON.stringify(payload));
      } catch (err) {
        send(res, 500, { 'Content-Type': 'application/json' }, JSON.stringify({ ok: false, error: String(err.message || err) }));
      }
    };
    if (req.method === 'POST') {
      req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
      req.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          finish(parsed.text || parsed.q || body);
        } catch (_) {
          finish(body);
        }
      });
    } else {
      finish();
    }
    return;
  }

  // --- Inter-instance agreement API ---
  const readJsonBody = (req) => new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (_) { resolve({}); }
    });
  });

  if (url.pathname === '/api/witness' && req.method === 'POST') {
    readJsonBody(req).then((payload) => {
      try {
        const { makeWitness } = require(path.join(ROOT, 'shared', 'codex-agreement'));
        const { submit } = require(path.join(ROOT, 'shared', 'witness-exchange'));
        const { runPatternPipeline } = require(path.join(ROOT, 'shared', 'pattern-pipeline'));
        let witness = payload.witness;
        if (!witness && payload.input) {
          const result = runPatternPipeline(payload.input, payload.config || {});
          witness = makeWitness(payload.instance_id || 'anonymous', payload.input, result);
        }
        if (!witness) {
          send(res, 400, { 'Content-Type': 'application/json' }, JSON.stringify({ error: 'witness or input required' }));
          return;
        }
        const id = submit(witness);
        if (typeof global.__OMI_BROADCAST_WITNESS__ === 'function') {
          global.__OMI_BROADCAST_WITNESS__(witness);
        }
        send(res, 200, { 'Content-Type': 'application/json' }, JSON.stringify({ id, witness }));
      } catch (err) {
        send(res, 500, { 'Content-Type': 'application/json' }, JSON.stringify({ error: String(err.message || err) }));
      }
    });
    return;
  }

  if (url.pathname.startsWith('/api/witness/') && req.method === 'GET') {
    const id = decodeURIComponent(url.pathname.slice('/api/witness/'.length));
    try {
      const { retrieve } = require(path.join(ROOT, 'shared', 'witness-exchange'));
      const w = retrieve(id);
      if (!w) {
        send(res, 404, { 'Content-Type': 'application/json' }, JSON.stringify({ error: 'not found' }));
        return;
      }
      send(res, 200, { 'Content-Type': 'application/json' }, JSON.stringify(w));
    } catch (err) {
      send(res, 500, { 'Content-Type': 'application/json' }, JSON.stringify({ error: String(err.message || err) }));
    }
    return;
  }

  if (url.pathname === '/api/agree' && req.method === 'POST') {
    readJsonBody(req).then((payload) => {
      try {
        const { compare } = require(path.join(ROOT, 'shared', 'witness-exchange'));
        const { agree, makeWitness } = require(path.join(ROOT, 'shared', 'codex-agreement'));
        const { runPatternPipeline } = require(path.join(ROOT, 'shared', 'pattern-pipeline'));
        if (payload.idA && payload.idB) {
          send(res, 200, { 'Content-Type': 'application/json' }, JSON.stringify(compare(payload.idA, payload.idB)));
          return;
        }
        if (payload.input) {
          const r1 = runPatternPipeline(payload.input, payload.config || {});
          const r2 = runPatternPipeline(payload.input, payload.config || {});
          const w1 = makeWitness(payload.instance_a || 'A', payload.input, r1);
          const w2 = makeWitness(payload.instance_b || 'B', payload.input, r2);
          send(res, 200, { 'Content-Type': 'application/json' }, JSON.stringify(agree(w1, w2)));
          return;
        }
        send(res, 400, { 'Content-Type': 'application/json' }, JSON.stringify({ error: 'idA/idB or input required' }));
      } catch (err) {
        send(res, 500, { 'Content-Type': 'application/json' }, JSON.stringify({ error: String(err.message || err) }));
      }
    });
    return;
  }

  if (url.pathname === '/api/observers' && req.method === 'GET') {
    try {
      const { list } = require(path.join(ROOT, 'shared', 'observer-sync'));
      send(res, 200, { 'Content-Type': 'application/json' }, JSON.stringify({ observers: list() }));
    } catch (err) {
      send(res, 500, { 'Content-Type': 'application/json' }, JSON.stringify({ error: String(err.message || err) }));
    }
    return;
  }

  if (url.pathname === '/api/observers' && req.method === 'POST') {
    readJsonBody(req).then((payload) => {
      try {
        const { register, list } = require(path.join(ROOT, 'shared', 'observer-sync'));
        if (!payload.id) {
          send(res, 400, { 'Content-Type': 'application/json' }, JSON.stringify({ error: 'id required' }));
          return;
        }
        register(payload.id, payload.position || {});
        send(res, 200, { 'Content-Type': 'application/json' }, JSON.stringify({ observers: list() }));
      } catch (err) {
        send(res, 500, { 'Content-Type': 'application/json' }, JSON.stringify({ error: String(err.message || err) }));
      }
    });
    return;
  }

  send(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
});

let signaling = null;
try {
  const { createSignalingServer } = require('./signaling');
  signaling = createSignalingServer(server, { path: '/signal' });
  global.__OMI_SIGNALING__ = signaling;
} catch (err) {
  console.warn('[signal] WebSocket signaling unavailable:', err.message);
}

// Broadcast when witnesses are submitted (re-require path is already in POST /api/witness)
function broadcastWitness(w) {
  if (signaling && w) signaling.broadcast({ type: 'witness', witness: w });
}
global.__OMI_BROADCAST_WITNESS__ = broadcastWitness;

server.listen(PORT, () => {
  console.log(`OMI-IMO Full DOM Stack server listening on http://localhost:${PORT}`);
  console.log(`  GET /              → bootstrap HTML (content-negotiated)`);
  console.log(`  GET /events        → text/event-stream`);
  console.log(`  GET|POST /api/pipeline → runFullPipeline + instantiateFromPipeline`);
  console.log(`  POST /api/witness · GET /api/witness/:id · POST /api/agree · GET|POST /api/observers`);
  console.log(`  WS  /signal        → WebRTC signaling + witness gossip`);
  console.log(`  GET /client/*      → static assets`);
});
