/**
 * Pseudo-persistent distributed circuit walkthrough
 *
 * Composes:
 *   · WebVTT cues as CUPS-style spool (timed print-jobs / steps)
 *   · BusyBox-style applets as circuit ops (echo, xor, connect, probe)
 *   · DOM data-omi-* nodes as interactive schematic
 *   · Optional witness hash for pseudo-persistence across reloads / peers
 *
 * Platform / hardware agnostic: pure JS + VTT + DOM.
 * "RF circuit" here is an *educational spectral simulation*
 * (dimensions / Fano / XOR gates) — not a real radio transmitter.
 */
'use strict';

/** Tutorial chapters → circuit build steps */
const DEFAULT_LESSONS = Object.freeze([
  {
    id: 'boot',
    title: 'Boot the bus',
    applet: 'echo',
    duration: 2,
    narrative: 'Allocate stdin/stdout/stderr (3! streams). No hardware required.',
    node: { id: 'bus', kind: 'bus', label: '3! bus' }
  },
  {
    id: 'xor-gate',
    title: 'Place XOR gate',
    applet: 'xor',
    duration: 2.5,
    narrative: 'Atomics.compareExchange reduces to XOR. One gate, every Boolean.',
    node: { id: 'xor1', kind: 'gate', label: 'XOR', op: 'xor' }
  },
  {
    id: 'fano-tick',
    title: 'Fano tick (−7D)',
    applet: 'probe',
    duration: 3,
    narrative: 'Phase mod 7 locks imaginary octonion directions before 8D.',
    node: { id: 'fano', kind: 'constraint', label: 'Fano −7D' }
  },
  {
    id: 'e8-shell',
    title: 'E₈ shell (240)',
    applet: 'connect',
    duration: 3,
    narrative: '240 roots ↔ 240-clock. Metric shell on the 8D stage.',
    node: { id: 'e8', kind: 'shell', label: 'E₈ 240' }
  },
  {
    id: 'observer',
    title: 'Observer @ 0D',
    applet: 'probe',
    duration: 2.5,
    narrative: 'PannerNode centroid. Fixed point 0x0000.',
    node: { id: 'obs', kind: 'observer', label: '0x0000' }
  },
  {
    id: 'persist',
    title: 'Witness & share',
    applet: 'digest',
    duration: 2,
    narrative: 'Hash the schematic. Reload or peer-agree for pseudo-persistence.',
    node: { id: 'wit', kind: 'witness', label: 'witness' }
  }
]);

function toVttTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const whole = Math.floor(secs);
  const ms = Math.round((secs - whole) * 1000);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(whole)}.${pad(ms, 3)}`;
}

/**
 * Spool lessons into WebVTT (CUPS print-job metaphor).
 */
function lessonsToVtt(lessons) {
  lessons = lessons || DEFAULT_LESSONS;
  let t = 0;
  let body = 'WEBVTT\n\nNOTE OMI circuit walkthrough — simulated RF / spectral\n\n';
  lessons.forEach((L, i) => {
    const start = t;
    const end = t + (L.duration || 2);
    t = end;
    const payload = {
      id: L.id,
      title: L.title,
      applet: L.applet,
      narrative: L.narrative,
      node: L.node,
      step: i + 1,
      total: lessons.length
    };
    body += `${i + 1}\n`;
    body += `${toVttTime(start)} --> ${toVttTime(end)}\n`;
    body += `${JSON.stringify(payload)}\n\n`;
  });
  return body;
}

/**
 * DOM fragment: interactive schematic nodes (platform-agnostic markup).
 */
function schematicHtml(lessons, opts) {
  opts = opts || {};
  lessons = lessons || DEFAULT_LESSONS;
  const mapName = opts.mapName || 'omi-circuit';
  const nodes = lessons.map((L, i) => {
    const n = L.node || {};
    const x = 40 + (i % 3) * 120;
    const y = 40 + Math.floor(i / 3) * 100;
    return {
      id: n.id || L.id,
      kind: n.kind || 'node',
      label: n.label || L.title,
      x,
      y,
      applet: L.applet,
      step: i + 1
    };
  });

  const areas = nodes
    .map((n) => {
      const x2 = n.x + 100;
      const y2 = n.y + 48;
      return `  <area id="area-${n.id}" shape="rect" coords="${n.x},${n.y},${x2},${y2}" href="#${n.id}" alt="${n.label}" data-omi-kind="${n.kind}" data-omi-applet="${n.applet}" data-omi-step="${n.step}">`;
    })
    .join('\n');

  const divs = nodes
    .map(
      (n) =>
        `<div id="${n.id}" class="omi-circuit-node" data-omi-kind="${n.kind}" data-omi-applet="${n.applet}" data-omi-step="${n.step}" style="position:absolute;left:${n.x}px;top:${n.y}px;min-width:96px;padding:8px;border:1px solid #888;border-radius:6px;font:14px system-ui;">` +
        `<strong>${n.label}</strong><br><small>${n.applet}</small></div>`
    )
    .join('\n');

  return {
    nodes,
    html:
      `<div class="omi-circuit-root" style="position:relative;min-height:280px;">\n` +
      divs +
      `\n<map name="${mapName}">\n${areas}\n</map>\n</div>`,
    mapName
  };
}

/**
 * BusyBox-style applet dispatch for a step (no real RF).
 */
function runApplet(applet, ctx) {
  ctx = ctx || {};
  switch (String(applet || '').toLowerCase()) {
    case 'echo':
      return { ok: true, out: String(ctx.message || 'bus ready'), applet: 'echo' };
    case 'xor': {
      const a = (ctx.a | 0) & 0xff;
      const b = (ctx.b | 0) & 0xff;
      return { ok: true, out: a ^ b, applet: 'xor', a, b };
    }
    case 'connect':
      return { ok: true, out: `link ${ctx.from || '?'} → ${ctx.to || '?'}`, applet: 'connect' };
    case 'probe':
      return { ok: true, out: { phase: ctx.phase || 0, centroid: '0x0000' }, applet: 'probe' };
    case 'digest': {
      const s = String(ctx.payload || '');
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) & 0xffff;
      return { ok: true, out: h, applet: 'digest', hex: '0x' + h.toString(16).padStart(4, '0') };
    }
    default:
      return { ok: false, out: 'unknown applet', applet };
  }
}

/**
 * Pseudo-persistence: stable witness from schematic node ids + kinds.
 */
function schematicWitness(nodes) {
  nodes = nodes || [];
  const payload = nodes.map((n) => `${n.id}:${n.kind}:${n.applet}`).join('|');
  let h = 0;
  for (let i = 0; i < payload.length; i++) h = (h ^ payload.charCodeAt(i) * (i + 1)) & 0xffff;
  return {
    version: 1,
    kind: 'circuit-walkthrough',
    nodes: nodes.length,
    digest: h,
    hex: '0x' + h.toString(16).padStart(4, '0'),
    payload
  };
}

/**
 * Full walkthrough package for client or headless.
 */
function createWalkthrough(opts) {
  opts = opts || {};
  const lessons = opts.lessons || DEFAULT_LESSONS;
  const vtt = lessonsToVtt(lessons);
  const schematic = schematicHtml(lessons, opts);
  const witness = schematicWitness(schematic.nodes);

  function stepAt(index) {
    const L = lessons[index];
    if (!L) return null;
    const result = runApplet(L.applet, opts.appletCtx || {});
    return { lesson: L, result, index };
  }

  function allSteps() {
    return lessons.map((_, i) => stepAt(i));
  }

  return {
    lessons,
    vtt,
    schematic,
    witness,
    stepAt,
    allSteps,
    /** CUPS-like spool: ordered cue jobs */
    spool: lessons.map((L, i) => ({
      job: i + 1,
      applet: L.applet,
      title: L.title,
      duration: L.duration
    }))
  };
}

function selfTest() {
  const results = [];
  const assert = (name, cond, detail) => {
    results.push({ name, pass: !!cond, detail: detail || '' });
  };

  const w = createWalkthrough();
  assert('lessons ≥ 6', w.lessons.length >= 6);
  assert('vtt header', w.vtt.indexOf('WEBVTT') === 0);
  assert('vtt has fano', w.vtt.indexOf('fano') !== -1 || w.vtt.indexOf('Fano') !== -1);
  assert('schematic html', w.schematic.html.indexOf('omi-circuit') !== -1);
  assert('nodes count', w.schematic.nodes.length === w.lessons.length);
  assert('xor applet', runApplet('xor', { a: 0x0f, b: 0xf0 }).out === 0xff);
  assert('digest applet', runApplet('digest', { payload: 'omi' }).ok);
  assert('witness hex', /^0x[0-9a-f]{4}$/.test(w.witness.hex));
  assert('spool jobs', w.spool.length === w.lessons.length);
  assert('step 0 boot', w.stepAt(0).lesson.id === 'boot');

  // agnostic: no window / radio APIs required
  assert('headless ok', typeof w.vtt === 'string' && w.witness.digest >= 0);

  const failed = results.filter((r) => !r.pass);
  return {
    passed: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results
  };
}

module.exports = {
  DEFAULT_LESSONS,
  lessonsToVtt,
  schematicHtml,
  runApplet,
  schematicWitness,
  createWalkthrough,
  selfTest
};
