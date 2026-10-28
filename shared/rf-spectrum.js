/**
 * OMI-IMO trichromatic RF spectrum map (US public / Part 15 & 95 style)
 *
 * Machine-readable reference for agents. Power figures are regulatory
 * ceilings — not design targets to exceed.
 *
 * Mapping:
 *   R → HF CB (Part 95D)     → Canvas A / audio pipeline
 *   G → VHF MURS (Part 95J)  → Canvas B / video pipeline
 *   B → UHF ISM-915 (15.247) → Canvas C / layout pipeline
 *   (FRS listed as alternate UHF voice)
 *
 * Software does not transmit RF. Hardware path is external modules
 * operated within licensed-by-rule limits.
 */
'use strict';

const SPECTRUM = Object.freeze({
  protocol: 'OMI-IMO-TRICHROMATIC-RF',
  version: '1.0.0',
  global_fixed_point: '0x0000',
  packet_budget_bits: 64,
  spectrum_matrix: Object.freeze({
    channel_r: Object.freeze({
      band: 'HF',
      allocation: 'CB',
      cfr: '47 CFR Part 95 Subpart D',
      frequency_min_mhz: 26.965,
      frequency_max_mhz: 27.405,
      channel_count: 40,
      spacing_khz: 10.0,
      max_power_watts: 4.0,
      max_power_ssb_watts: 12.0,
      reference_channels_mhz: Object.freeze({
        ch1: 26.965,
        ch9_emergency: 27.065,
        ch40: 27.405
      }),
      pipeline_target: 'Canvas_A_Audio',
      notes: 'Skywave possible; high atmospheric noise'
    }),
    channel_g: Object.freeze({
      band: 'VHF',
      allocation: 'MURS',
      cfr: '47 CFR Part 95 Subpart J',
      discrete_channels_mhz: Object.freeze([
        151.82, 151.88, 151.94, 154.57, 154.6
      ]),
      max_power_watts: 2.0,
      pipeline_target: 'Canvas_B_Video',
      notes: 'LOS outdoor; weak indoor penetration'
    }),
    channel_b: Object.freeze({
      band: 'UHF',
      allocation: 'ISM-915',
      cfr: '47 CFR Part 15.247',
      frequency_min_mhz: 902.0,
      frequency_max_mhz: 928.0,
      mode: 'FHSS_LORA',
      max_power_watts: 1.0,
      max_eirp_watts: 4.0,
      pipeline_target: 'Canvas_C_RGB_Layout',
      notes: 'Recommended data mesh; indoor penetration'
    }),
    channel_b_frs: Object.freeze({
      band: 'UHF',
      allocation: 'FRS',
      cfr: '47 CFR Part 95 Subpart B',
      frequency_min_mhz: 462.5625,
      frequency_max_mhz: 467.7125,
      channel_count: 22,
      max_power_watts: 2.0,
      channels_8_14_max_watts: 0.5,
      pipeline_target: 'Canvas_C_RGB_Layout',
      notes: 'Voice-oriented alternate UHF'
    })
  })
});

function bandForPipeline(target) {
  const m = SPECTRUM.spectrum_matrix;
  for (const key of Object.keys(m)) {
    if (m[key].pipeline_target === target) return { key, ...m[key] };
  }
  return null;
}

function listChannels(key) {
  const b = SPECTRUM.spectrum_matrix[key];
  if (!b) return [];
  if (b.discrete_channels_mhz) return b.discrete_channels_mhz.slice();
  if (key === 'channel_r') {
    // CB: ch1 = 26.965, then +10 kHz, with standard CB gaps handled loosely for agents
    const out = [];
    let f = 26.965;
    for (let i = 0; i < 40; i++) {
      out.push(Math.round(f * 1000) / 1000);
      f += 0.01;
    }
    return out;
  }
  return [];
}

function withinBand(mhz, key) {
  const b = SPECTRUM.spectrum_matrix[key];
  if (!b) return false;
  if (b.discrete_channels_mhz) {
    return b.discrete_channels_mhz.some((c) => Math.abs(c - mhz) < 0.001);
  }
  return mhz >= b.frequency_min_mhz && mhz <= b.frequency_max_mhz;
}

function selfTest() {
  const results = [];
  const assert = (name, cond, detail) => {
    results.push({ name, pass: !!cond, detail: detail || '' });
  };

  assert('protocol id', SPECTRUM.protocol.indexOf('OMI') === 0);
  assert('fixed point', SPECTRUM.global_fixed_point === '0x0000');
  assert('CB min', SPECTRUM.spectrum_matrix.channel_r.frequency_min_mhz === 26.965);
  assert('MURS 5 ch', SPECTRUM.spectrum_matrix.channel_g.discrete_channels_mhz.length === 5);
  assert('ISM 902-928', SPECTRUM.spectrum_matrix.channel_b.frequency_min_mhz === 902);
  assert('power CB ≤4', SPECTRUM.spectrum_matrix.channel_r.max_power_watts === 4);
  assert('power MURS ≤2', SPECTRUM.spectrum_matrix.channel_g.max_power_watts === 2);
  assert('power ISM ≤1', SPECTRUM.spectrum_matrix.channel_b.max_power_watts === 1);
  assert('pipeline A', bandForPipeline('Canvas_A_Audio').band === 'HF');
  assert('MURS hit', withinBand(151.88, 'channel_g'));
  assert('ISM hit', withinBand(915, 'channel_b'));
  assert('64-bit budget', SPECTRUM.packet_budget_bits === 64);

  const failed = results.filter((r) => !r.pass);
  return {
    passed: failed.length === 0,
    total: results.length,
    failed: failed.length,
    results
  };
}

module.exports = {
  SPECTRUM,
  bandForPipeline,
  listChannels,
  withinBand,
  selfTest
};
