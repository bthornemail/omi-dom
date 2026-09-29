/**
 * portal.js — the DOM portal.
 *
 * It loads the real shared/peers.js and shared/declare.js over /shared/* and
 * runs them as they are. It deliberately does NOT re-implement the engine in
 * the page: the thing being demonstrated is the tested code, so a copy here
 * would be a different thing wearing the same name.
 *
 * There is no server, no clock and no state in this file. Every state change
 * goes through Atomics.compareExchange inside peers.js. Nothing here holds a
 * copy of the truth; it only renders what the XOR says.
 *
 * 'use strict';
 */

(function () {
  // ---- the smallest CommonJS loader that can resolve peers.js -> ./peers.js
  const cache = Object.create(null);
  async function loadModule(path) {
    if (cache[path]) return cache[path].exports;
    const res = await fetch(path);
    if (!res.ok) throw new Error('cannot load ' + path);
    const src = await res.text();
    const mod = { exports: {} };
    cache[path] = mod;
    const dir = path.slice(0, path.lastIndexOf('/') + 1);
    const req = (spec) => {
      const target = dir + spec.replace(/^\.\//, '');
      if (cache[target]) return cache[target].exports;
      throw new Error('module not preloaded: ' + spec);
    };
    // eslint-disable-next-line no-new-func
    new Function('require', 'module', 'exports', src)(req, mod, mod.exports);
    return mod.exports;
  }

  // ---- peers, wired
  const peers = {};
  let A = null, B = null;
  let lastReport = null;

  const $ = (id) => document.getElementById(id);
  const el = {
    wA: $('wA'), wB: $('wB'), bA: $('bA'), bB: $('bB'),
    eA: $('eA'), eB: $('eB'), offA: $('offA'), offB: $('offB'),
    pA: $('pA'), pB: $('pB'), mA: $('mA'), mB: $('mB'),
    dist: $('dist'), detail: $('detail'), xorBox: $('xorBox'),
    src: $('src'), log: $('log'), modeLine: $('modeLine'),
  };

  const hex = peers.hex32 || ((v) => '0x' + (v >>> 0).toString(16).toUpperCase().padStart(8, '0'));

  // A byte box, so a difference is visible as a *position*, not just a number.
  function byteBoxes(container, value, hot) {
    container.innerHTML = '';
    for (let k = 3; k >= 0; k--) {
      const b = (value >>> (8 * k)) & 0xff;
      const d = document.createElement('div');
      d.className = 'byte' + (hot && hot.has(k) ? ' hot' : '');
      d.textContent = b.toString(16).toUpperCase().padStart(2, '0');
      container.appendChild(d);
    }
  }

  function render() {
    const a = A.read(), b = B.read();
    el.wA.textContent = hex(a);
    el.wB.textContent = hex(b);
    const rep = peers.divergence(A, B);
    const hotA = new Set(rep.bytes.map((x) => x.byte));
    const hotB = new Set(rep.bytes.map((x) => x.byte));
    byteBoxes(el.bA, a, rep.agreed ? null : hotA);
    byteBoxes(el.bB, b, rep.agreed ? null : hotB);
    el.pA.classList.toggle('off', !!A.offline);
    el.pB.classList.toggle('off', !!B.offline);
    el.mA.textContent = A.mode;
    el.mB.textContent = B.mode;
    el.dist.textContent = String(rep.popcount);
    el.dist.className = 'dist ' + (rep.agreed ? 'agreed' : 'diverged');
    el.xorBox.classList.toggle('agreed', rep.agreed);
    if (rep.agreed) {
      el.detail.textContent = 'agreement — xor is 0x00000000. the states are the same.';
    } else {
      const cells = rep.cells.map((c) => c.hex).join(' ');
      el.detail.textContent = 'xor ' + cells + '  ·  ' + rep.popcount
        + ' bit' + (rep.popcount === 1 ? '' : 's') + ' across '
        + rep.bytes.length + ' byte' + (rep.bytes.length === 1 ? '' : 's')
        + '  ·  ' + rep.cells_agreed + '/' + rep.cells_total + ' cells agree';
    }
  }

  function say(msg, cls) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.innerHTML = msg;
    el.log.appendChild(d);
    el.log.scrollTop = el.log.scrollHeight;
  }

  function sayLine(n, tag, body, cls) {
    say('<span class="ln">' + String(n).padStart(2, '0') + '  ' + tag + '</span>  ' + body, cls);
  }

  function fromInput(peer, input) {
    const t = input.value.trim();
    let v;
    if (/^0x[0-9a-f]+$/i.test(t)) v = parseInt(t.slice(2), 16);
    else if (/^0b[01]+$/i.test(t)) v = parseInt(t.slice(2), 2);
    else if (/^0o[0-7]+$/i.test(t)) v = parseInt(t.slice(2), 8);
    else if (/^[0-9a-f]+$/i.test(t) && /[a-f]/i.test(t)) v = parseInt(t, 16);
    else v = parseInt(t, 10);
    if (!Number.isFinite(v)) return null;
    input.value = hex(v);
    return v >>> 0;
  }

  // ---- actions. Every one of these is one operation, not a simulation.
  function doRead() {
    lastReport = peers.divergence(A, B);
    render();
    sayLine(0, 'read',
      'xor ' + (lastReport.agreed ? '0x00000000' : hex(lastReport.fold))
      + '  popcount ' + lastReport.popcount
      + (lastReport.agreed ? '  <b>AGREEMENT</b>' : '  bytes differ at ' + lastReport.bytes.map((x) => x.byte).join(', ')),
      lastReport.agreed ? 'ok' : 'warn');
  }

  function doRoll() {
    // Act on the report the user just looked at. If a peer moved in between,
    // peers.js reports the clobber instead of pretending the repair happened.
    const r = peers.repair(A, B, lastReport);
    if (r.report.agreed) {
      sayLine(0, 'roll', 'nothing to do — already agreeing', 'ok');
    } else if (r.clobbered) {
      sayLine(0, 'roll',
        'clobbered: bob moved between the read and the roll (expected ' + hex(r.before)
        + ', found ' + hex(r.after) + '). <b>not overwritten.</b>', 'bad');
    } else {
      sayLine(0, 'roll',
        'applied the displacement ' + hex(r.report.fold) + ' — bob ' + hex(r.before) + ' → ' + hex(r.after)
        + '  ·  <b>AGREEMENT</b>', 'ok');
    }
    lastReport = null;
    render();
  }

  function doWitness() {
    const wa = A.witness(), wb = B.witness();
    sayLine(0, 'witness', 'alice  state ' + hex(wa.state) + '  fold ' + hex(wa.fold) + '  steps ' + wa.steps
      + (wa.state !== wa.fold && wa.steps ? '  <b>tampered</b>' : ''), wa.steps && wa.state !== wa.fold ? 'bad' : 'ok');
    sayLine(0, 'witness', 'bob    state ' + hex(wb.state) + '  fold ' + hex(wb.fold) + '  steps ' + wb.steps
      + (wb.state !== wb.fold && wb.steps ? '  <b>tampered</b>' : ''), wb.steps && wb.state !== wb.fold ? 'bad' : 'ok');
  }

  function doBind() {
    const f = peers.bind021(A.view);
    sayLine(0, 'bind', '0, 2, 1 — three possibilities, extremes first.  centre ' + f.hex
      + '  →  is this <b>' + f.classified + '</b>?  (0=origin, 2=offset, 1=unit)', 'ok');
  }

  function doSplit() {
    // Go offline, edit both, come back. The whole point, in three actions.
    A.offline = true; B.offline = true;
    const va = fromInput(A, el.eA), vb = fromInput(B, el.eB);
    if (va !== null) A.write(va);
    if (vb !== null) B.write(vb);
    // A plausible divergence: they each got a different value while apart.
    A.write((A.read() ^ 0x0badf00d) >>> 0);
    B.write((B.read() ^ 0x00000003) >>> 0);
    el.eA.value = hex(A.read());
    el.eB.value = hex(B.read());
    A.offline = false; B.offline = false;
    el.offA.checked = false; el.offB.checked = false;
    lastReport = null;
    render();
    sayLine(0, 'split', 'both went offline and edited independently. now read, then roll.', 'warn');
  }

  function doReset() {
    A.reset(); B.reset();
    el.eA.value = '0x00000000'; el.eB.value = '0x00000000';
    el.offA.checked = false; el.offB.checked = false;
    lastReport = null;
    render();
    sayLine(0, 'reset', 'both peers zeroed.', 'ok');
  }

  // ---- the declarative panel
  const DEMO = [
    '# both peers start at zero and agree',
    'peer alice 0x0',
    'peer bob   0x0',
    'link alice bob',
    'read alice bob',
    '',
    '# they go offline and each edit independently',
    'offline alice',
    'offline bob',
    'edit alice 0x0BADF00D',
    'edit bob   0x0BAFF00D',
    'online alice',
    '',
    '# one XOR: how far apart, and exactly which bytes',
    'read alice bob',
    '',
    '# apply the displacement that was already measured',
    'roll alice bob',
    'read alice bob',
    '',
    '# is this 0, 1, or 2?',
    'bind',
  ].join('\n');

  function doRun() {
    el.log.innerHTML = '';
    let out;
    try {
      out = declare.run(el.src.value);
    } catch (e) {
      // A line that is not properly structured is refused, with a coordinate.
      const c = e.coordinate || {};
      sayLine(c.line || 0, 'refused', '<span class="bad">' + escapeHtml(e.message) + '</span>'
        + (c.source ? '  <span class="ln">at: ' + escapeHtml(c.source) + '</span>' : ''), 'bad');
      return;
    }
    for (const entry of out.log) {
      const r = entry.result;
      let body = '', cls = 'ok';
      switch (entry.op) {
        case 'peer': body = r.name + ' seeded ' + (r.seed ? '0x' + r.seed.toString(16).toUpperCase() : '0') + '  [' + r.mode + ']'; break;
        case 'link': body = r.from + ' → ' + r.to; break;
        case 'offline': case 'online': body = r.name + (r.offline ? ' offline' : ' online'); break;
        case 'edit': case 'tamper': body = r.name + ' = ' + r.hex; break;
        case 'read':
          body = 'xor ' + (r.agreed ? '0x00000000' : r.hex) + '  popcount ' + r.popcount
            + (r.agreed ? '  <b>AGREEMENT</b>' : '  bytes: ' + r.bytes.map((x) => x.byte + ':' + x.hex).join(' '));
          cls = r.agreed ? 'ok' : 'warn';
          break;
        case 'roll':
          body = r.moved ? 'repaired — ' + r.before + ' → ' + r.after : (r.clobbered ? '<b>clobbered</b>, not overwritten' : 'already agreeing');
          cls = r.moved ? 'ok' : (r.clobbered ? 'bad' : 'ok');
          break;
        case 'witness':
          body = r.name + '  state ' + r.state + '  fold ' + r.fold + '  steps ' + r.steps;
          cls = r.intact ? 'ok' : 'bad';
          break;
        case 'bind': body = '0, 2, 1 → centre ' + r.hex + '  is this <b>' + r.classified + '</b>?'; break;
        case 'reset': body = 'cleared'; break;
        default: body = JSON.stringify(r);
      }
      sayLine(entry.line, entry.op, body, cls);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // ---- wiring
  async function boot() {
    // peers first: declare.js requires it at module load, synchronously.
    peers.peers = await loadModule('/shared/peers.js');
    peers.declare = await loadModule('/shared/declare.js');
    declare = peers.declare;

    A = peers.peers.createPeer({ name: 'alice', cells: 1 });
    B = peers.peers.createPeer({ name: 'bob', cells: 1 });

    el.modeLine.textContent = 'memory: ' + A.mode
      + (A.shared ? ' — SharedArrayBuffer present, compareExchange is atomic across the peer boundary.'
        : ' — no SharedArrayBuffer here, so compareExchange is local-only. The arithmetic is identical; the atomicity guarantee is not.');

    $('btnRead').onclick = doRead;
    $('btnRoll').onclick = doRoll;
    $('btnWitness').onclick = doWitness;
    $('btnBind').onclick = doBind;
    $('btnSplit').onclick = doSplit;
    $('btnReset').onclick = doReset;
    $('btnRun').onclick = doRun;
    $('btnDemo').onclick = () => { el.src.value = DEMO; doRun(); };

    for (const [box, input, off] of [[el.pA, el.eA, el.offA], [el.pB, el.eB, el.offB]]) {
      void box;
      input.addEventListener('change', () => {
        const p = input === el.eA ? A : B;
        const v = fromInput(p, input);
        if (v === null) { input.value = hex(p.read()); return; }
        p.write(v);
        lastReport = null;
        render();
      });
      off.addEventListener('change', () => {
        (input === el.eA ? A : B).offline = off.checked;
        render();
      });
    }

    el.src.value = DEMO;
    render();
    sayLine(0, 'ready', 'two peers, no server. press <b>read</b>, or <b>split them</b> then <b>roll back</b>.', 'ok');
  }

  let declare = null;
  boot().catch((e) => {
    document.body.insertAdjacentHTML('afterbegin',
      '<pre style="color:#f87171;padding:20px">portal failed to boot: ' + escapeHtml(e.message) + '</pre>');
  });
})();
