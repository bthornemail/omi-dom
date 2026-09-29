# 11 — The Path Protocol

**`shared/path-protocol.js`** — 74 checks, registered in `package.json` and
`final-test.sh`.

A protocol defines pathways and suggests shortcuts. It does not do the work: it
does not render, validate, interpret, or store. Those belong to the app.

```
X = data source        (an anchor)
Y = data target        (an anchor)
```

Computational cycles read in a sequence, so source and target are **anchors**
rather than free values. Binding targets closures and combinators, never people
— `apply(knot, fn)` in `ruler.js:86-88` is the canonical invocation, and
`bindPath(path, fn)` routes to it.

---

## 1. There is no wrong. Compare and exchange.

This is the whole protocol, in one function:

```js
compareExchange(cell, expected, replacement)
//   -> { matched, now, discrepancy }
```

`Atomics.compareExchange` on a request that does not match does **not** throw
and does **not** report an error. It leaves the cell alone and returns what was
actually there. So:

- `matched` — did the cell hold what was expected
- `now` — what it holds afterwards: the replacement, or the original
- `discrepancy` — `xor(cell, expected)`, non-zero exactly when they differ

**`xor ≠ 0` is not "wrong." It is the measurement.** Every operation in the
module is this one function composed with itself, which is why nothing in the
module returns an error, refuses, or throws on bad input. A non-closing pair,
an out-of-range pin, an unknown partition: each *states* the condition and
reports the difference. Deciding what to do about it is the app's job, not the
protocol's.

An earlier draft of this module returned `null` from `Q()` on a non-closing
pair. That was the wrong shape and it was wrong the same way in five other
places: it treated disagreement as failure. Disagreement is the only thing this
system measures.

---

## 2. The wordform is an open half

```js
const WORDFORM = /^[pn][0-9A-Za-z]\.?[0-9A-Za-z][np]$/;
```

The endcaps are `[p]` and `[n]`. And:

```
'p' ^ 'n'  =  0x70 ^ 0x6e  =  0x1E
```

**`0x1E` is the SECURE face mask** (`01-invariants.md`), and it is not zero. So a
single wordform does not close — it is an open half. Two of them, mirrored, do:

```
p0xn ^ n0xp = 0     p0bn ^ n0bp = 0
p0on ^ n0op = 0     p0dn ^ n0dp = 0
```

`stringXor` is the character-wise XOR, and `stringXor(a, b) === 0` is the only
validity test in the module. **This is why `Q` takes two arguments:** the two
anchors are what make the XOR vanish. One wordform cannot close a binding.

The four radices are four closed pairs — `/0[boxd]/` closes pairwise.

A wordform resolves by **XOR-folding its body**, never by base conversion:

```js
resolveWordform('p0xn').index  ===  '0'.charCodeAt(0) ^ 'x'.charCodeAt(0)
```

An index is an index, not a value. The only requirement of a reference is that
it can be XOR'd, so the fold is XOR and nothing else.

---

## 3. Q(x: Regex, y: Regex)

```
Q(x, y) = 60x² + 16xy + 4y²
```

The regex is the declarative form; resolving it yields the natural number the
Coq development quantifies over (`bqf : N -> N -> N`,
`coq/03-projection/BQFBridgePreservesForms.v`). The constraint reveals the
structure: the regex is the lens, the index is what the lens shows.

`Q` always returns a report. It states whether the pair `closed`, what the
`closure` XOR was, and the three terms — plus `exchange`, the compareExchange
over the two resolved indices. A pair that does not close gets a number for
`q` anyway. Nothing is refused.

See [10-bqf-foundation.md](10-bqf-foundation.md) for the form, the derivation
of the 60 from the two diagonal sets, and the delta law.

---

## 4. Four partitions, one thing

```js
PARTITIONS = [ 0b (2), 0o (8), 0d (10), 0x (16) ]   // ascending precision
PARTITION_XOR === 16                                 // the 16xy coefficient
```

Four precisions, and to `/0[pin]/` they are the same thing: place-value
indices, XOR-able. `0b ^ 0o ^ 0x ^ 0d === 16` — the four radices XOR to exactly
the chiral-bridge coefficient.

`rebase(partition, index, other)` re-expresses one index in another precision
and reports whether the *digits* agree: `16` is `10` in `0x` and `16` in `0d`,
so `matched: false` with the digit-wise discrepancy. Same digits → matched.

---

## 5. The read sequence

The protocol's answer to "cycles read in a sequence": the sequence is *defined*,
not merely required. Partitions in ascending precision, slots ascending:

```
4 partitions × 16 slots = 64 reads per cycle
```

`cycleIndex(partition, slot)` locates a read, and reports `-1` for anything
outside the cycle rather than throwing. If the order were left to each agent,
they would each pick one and disagree — the order *is* the protocol.

---

## 6. Pins, and collisions as facts

Any of `0x0`–`0xF` may be pinned to any node. Nothing is fixed; a pin is a
declaration, not an action.

`pinSet` reports `colliding` — two pins holding the same value on the same
node. Collisions are **stated, never resolved**: two agents may hold different
pins on one node, and that is a fact to be reported, not an error to be refused.
`pinExchange(pin, value, node)` reports what was already there.

---

## 7. Shortcuts are suggested, never chosen

```js
suggest(path)  // -> candidates. The caller selects, or declines.
```

`direct` is offered for a single-anchor path, the rest for multi-anchor paths.
An empty list is a valid answer meaning "no shortcut claimed." The protocol
never picks — that would be the app deciding, which is the line the protocol
does not cross.

---

## 8. What I guessed, and needs confirming

These are the two places I had no source for and chose the smallest reading:

1. **Wordform body length.** The regex requires a 2-character body (`p0xn`) and
   optionally a dotted form (`p1.5n`). I initially wrote tests against 3-char
   `p1n` and they failed — the regex was right and my tests were wrong. If the
   real forms are shorter or longer, only `WORDFORM` and `resolveWordform`
   change.
2. **The index resolution.** I read "the only requirement is that it can be
   XOR'd" as *the fold is XOR*, so `resolveWordform` XOR-folds the body rather
   than converting the base. If the body is meant to name a radix directly
   (`p0xn` → 16), that is one line in `resolveWordform`.

Also still open, and **not yet built**: the 4-slot treemap automaton
(`P(15,3) = 2730`, slot 0 pinned to Q, per-slot flip bits, the dual
`44x²`/XOR discrepancy). The four answers to that design are recorded below; the
module does not exist yet because the protocol layer is a precondition for it —
Q is a binding of two wordforms, and nothing can project through a form that
cannot be bound.

### Recorded, unbuilt: the treemap automaton

| # | Answer |
|---|---|
| 1 | Ordered triples. `P(15,3) = 2730 = 455 × 3!`. Slots 1–3 are positions, so swapping two is a real transition. |
| 2 | Input: the `wiki/chapters/*.json` node trees. **Correction:** they are *flat* node lists (86 nodes across 6 chapters), not trees — no parent/child field. Hierarchy is derivable only by declaring a lens (group by `role`: 33 resistor, 29 transistor, 12 rail, 6 bus, 5 LED, 1 gate; or band by `bRow`). That declaration *is* the declarative model. |
| 3 | Per-slot flip bit, not a fixed partition. Read = local, write = remote; each of the three slots carries its own. |
| 4 | Both. Structural `44x²` (constant lift) and positional XOR+popcount (variable). |
