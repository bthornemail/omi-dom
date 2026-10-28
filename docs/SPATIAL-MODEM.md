# Spatial modem — hobbyist path (&lt; $20 class)

## Intent

Build a **low-power, legal-by-rule** spatial modem concept that:

- Uses **XOR gates on a breadboard** for baseband / packet logic  
- Uses a **cheap certified-style module + antenna** for RF (not a homebrew PA)  
- Maps **R/G/B** pipelines to **HF CB / VHF MURS / UHF ISM-915**  
- Stays **hobbyist**: low watt, low volt, Part 15 / Part 95 style limits  

Software in this repo **does not transmit**. RF is external hardware you operate within your country’s rules (US figures below are reference only).

---

## Spectrum map (agents)

Source of truth: `shared/rf-spectrum.js`

| Channel | Band | Allocation | Approx limits (US ref.) | Pipeline |
|---------|------|------------|-------------------------|----------|
| **R** | HF | CB Part 95D | 26.965–27.405 MHz · ≤4 W AM | Canvas A audio |
| **G** | VHF | MURS Part 95J | 5 discrete ch · ≤2 W | Canvas B video |
| **B** | UHF | ISM 902–928 Part 15.247 | ≤1 W (≤4 W EIRP dir.) | Canvas C layout |

Fixed point for packet digests: **0x0000**. Target frame: **64-bit** budget for low-baud hardware.

---

## Architecture

```
[ sensors / DOM / VTT cues ]
        ↓
[ breadboard XOR · 74HC86 ]  ← baseband, packet, bind/apply/eval metaphor
        ↓ UART / SPI
[ cheap RF module ]          ← LoRa / ISM-915 recommended for mesh data
        ↓
[ antenna ]                  ← stock whip / wire for the module
```

**Do not** build a discrete high-power HF PA on a breadboard for CB. Use **commercial CB/MURS/FRS** or **Part 15 modules** already designed for those limits.

---

## Under-~$20 BOM (ISM-915 data path — recommended)

Typical street prices fluctuate; aim for this class of parts:

| Item | Example class | Role | ~USD |
|------|----------------|------|------|
| Breadboard + jumpers | half-size | logic | 3–5 |
| **74HC86** quad XOR | DIP | baseband XOR / parity | 0.50–1 |
| MCU or USB-UART | CH340 / ATmega / RP2040 leftover | host | 2–5 |
| **SX1278 / RA-02** (or similar 433/915 LoRa) | module | RF modem | 4–8 |
| Antenna | module stock / 1/4-wave wire | radiate | 1–2 |
| 3.3 V regulator + caps | AMS1117 etc. | power | 1–2 |
| **Total** | | | **often ≤ $15–20** |

**CB/MURS/FRS voice** is usually cheaper as a **finished HT** than as discrete RF on a breadboard. Use those radios as the R/G channels; use LoRa/ISM for the B data mesh.

### XOR breadboard (baseband only)

- **74HC86**: four XOR gates — parity, simple differential encoding, “everything is XOR” demos  
- 3.3 V or 5 V logic only — **not** RF power stages  
- Feed module **digital** lines (SPI/UART/GPIO), not antenna pins through HC logic  

### Antenna

- Use the **antenna the module is designed for**  
- Keep cable short; no “boost” amps that push you over EIRP  
- Hobby antennas for 915 MHz: short whip or printed; for CB: mobile whip on a real CB radio  

---

## Packet sketch (64-bit)

```
[ 16-bit witness/digest ][ 16-bit seq ][ 16-bit type/coords ][ 16-bit payload ]
         XOR-fold → compare to 0x0000 for sync frames
```

Aligns with OMI digest / centroid story; baud rates stay low for noisy HF/VHF.

---

## Trichromatic pipelines

| RF | Software canvas (existing stack) |
|----|----------------------------------|
| R HF | Audio worklet / Canvas A |
| G VHF | Video / Canvas B |
| B UHF ISM | Layout / RGB / Canvas C |

Walkthrough UI: `client/circuit.html` + `shared/circuit-walkthrough.js` (simulated steps until hardware is wired).

---

## Legal / safety (non-negotiable)

1. Stay within **published** Part 15 / Part 95 (or your local) power and band limits.  
2. **No** amplifiers, “linear,” or antenna tricks meant to exceed limits.  
3. CB emergency channel **9** is for emergency/sync — not a playground.  
4. This doc is **not** a license, type-acceptance, or guarantee of compliance.  
5. If unsure, use **receive-only** or a **certified finished radio**.

---

## Software API

```js
const { SPECTRUM, withinBand, bandForPipeline } = require('./shared/rf-spectrum');
withinBand(915, 'channel_b');           // true
bandForPipeline('Canvas_A_Audio');      // CB HF block
SPECTRUM.global_fixed_point;            // '0x0000'
```

```bash
node -e "console.log(require('./shared/rf-spectrum').selfTest())"
```

---

## Bottom line

**Yes** — XOR on a breadboard + a **cheap ISM module + antenna** can make a **&lt;$20-class spatial data modem** for hobby mesh, mapped to the trichromatic pipelines.  
**HF/VHF voice** is better bought as **compliant radios** than reinvented on a breadboard.  
**All** RF operation stays **outside** this Node/DOM stack, at **legal** power, with digests still converging on **0x0000**.
