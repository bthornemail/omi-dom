# 13 — Two Peers, No Server, No Clock

`shared/peers.js`, `shared/declare.js`, `client/portal.html` + `client/portal.js`.

The claim this has to earn, and can:

> Divergence detection and repair between two parties, with no central
> authority, no coordination, no clock, and no merge function.

It is possible because the metric and the displacement are the same object:

```
distance(A, B) = popcount(A XOR B)     how far apart
A XOR B                                 by how much
(A XOR B) XOR B == A                    and the inverse is free
```

Every other scheme pays for repair separately — vector clocks for ordering,
CRDTs for a merge, a server for truth. Here rollback is not an algorithm. It is
the same XOR that detected the divergence.

## What it deliberately does not do

XOR is commutative, so `a ^ b == b ^ a`. It measures the **magnitude** of a
divergence and never the **order** of two concurrent edits.

```
a=0b0011  b=0b1010
a^b = 9    b^a = 9    symmetric -> no ordering
```

So it is **not** a vector clock, not a Lamport clock, and it cannot replace one.
There is a self-test that asserts this boundary explicitly:

```js
assert('XOR is symmetric, so it cannot order two edits', (e1 ^ e2) === (e2 ^ e1));
```

The honest claim is the narrow one, and the narrow claim is still excellent:
**clocks exist in order to order events. If all you need is how far apart two
states are, and how to undo the difference, you need no clock at all.**

## Tamper evidence, for free

A peer's state is one word, and the peer keeps the XOR-fold of everything it has
ever published. An honest write goes through CAS and advances the fold. A write
that comes from behind the peer's back does not.

```js
t.write(0x11111111);   t.witness()  // state 0x11111111, fold 0x11111111
t.tamper(0x22222222);  t.witness()  // state 0x22222222, fold 0x11111111  <- caught
```

This is not a security primitive. It is a consequence of the state being one
word, which is why it costs nothing and why it cannot be quietly rewritten.

## The clobber is reported, not hidden

Repair takes the report you already showed the user, because that is the real
shape of the interaction: you Read, they look at the number, they click Roll —
and in between, the peer may have moved.

```js
const stale = divergence(x, y);   // the report on screen
y.tamper(9);                     // the peer moved while they looked
repair(x, y, stale).clobbered    // true — and the write is not overwritten
```

The exchange is checked against the report's own observation, not a fresh read.
A fresh read would always succeed and would silently clobber. This was a real bug
during the build, and the test that caught it is in the file.

## The space, run as three exchanges

`0, 2, 1` — the original bind, asking three possibilities in the order that
makes them definable: `0` the origin, `2` the offset, `1` the unit. The extremes
first, because the middle is only definable once the extremes are known.

```js
exchange(0, 2, 1) ^ exchange(1, 0, 2) ^ exchange(2, 1, 0)
```

## The declarative syntax

`shared/declare.js` declares **arrangements, not meanings**. Every line names
peers and says which comparison to run. Nothing in it assigns a value to a point
or an order to two edits — that is the user's, and the file says so.

```
peer alice 0x00000000
peer bob   0x00000000
link  alice bob
offline alice
edit alice 0x0BADF00D
edit bob   0x0BAFF00D
online alice
read  alice bob          # one XOR: how far, and exactly which bytes
roll  alice bob          # apply the displacement already measured
bind                      # is this 0, 1, or 2?
```

A number reads the same in all four radices — `0xF`, `0b1111`, `0o17`, `0d15` are
one number, and the file takes the radix as a *reading*, not a value. Zero is zero
in all four.

Two tiers, the same discipline as the space. A line that is not properly
structured is refused with a `DeclarationError` carrying the **1-based line
number**:

```js
parse('\n\nbad op here')   // DeclarationError at line 3, coordinate.line === 3
```

A line that is well formed but merely disagrees is a reading, and readings are
never refusals.

## The portal

`client/portal.html` — two panels, a distance readout, per-byte difference
markers, and the declarative panel.

It loads the real `shared/peers.js` and `shared/declare.js` over `/shared/*`
through a ~20 line CommonJS loader and runs them as they are. It does **not**
re-implement the engine in the page: a copy in the page would be a different
thing wearing the same name, and the whole point is that the demo runs the
tested code.

There is no server, no clock, and no state in `portal.js`. Every state change
goes through `Atomics.compareExchange` inside `peers.js`. The page only renders
what the XOR says.

### Running it

```
node server/server.js      →  http://localhost:8742
open http://localhost:8742/client/portal.html
```

**split them** → **roll back** is the whole demonstration in two clicks. Or load
the offline demo into the declarative panel and read the log.

## Memory mode, reported not hidden

`peers.js` uses `SharedArrayBuffer` when available, so `compareExchange` is a
genuine atomic across the peer boundary. In Node that is always true, and the
tests run against it. In a browser without cross-origin isolation `SAB` is
absent, and the module degrades to `ArrayBuffer`: the arithmetic is identical,
the atomicity guarantee is not, and the portal says which mode it is in rather
than implying the stronger one.

## Tests

| Module | Checks | Registered in |
|---|---|---|
| `shared/peers.js` | 27 | `package.json`, `final-test.sh`, `/api/bundle` |
| `shared/declare.js` | 20 | `package.json`, `final-test.sh`, `/api/bundle` |

Full gate: `npm test` green, `node test/inter-instance.test.js` 32/32.
