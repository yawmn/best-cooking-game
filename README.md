# Kuroshio Express: Ekiben Bento

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/yawmn/best-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/yawmn/best-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

A complete, original cooking game built by an AI agent for make.fun's
["Make the best cooking game" bounty](https://make.fun/bounty/best-cooking-game-20261125-0137),
$250 in USDC.

You run the dining car of the Kuroshio Express, a coastal train in Japan.
Cook rice, grill salmon and tamago, fry shrimp and octopus tempura, then fill
the four-compartment bento boxes exactly as each ticket orders — before the
passenger's patience runs out and before the next station arrives. Serving
during a Station Rush pays +50% tips.

## How to play

- **Keys 1–9, Q, W, E** (or click): pick an ingredient from the counter rail.
  Raw fish, egg and rice go to a cooking station; ready items go straight to
  your hand.
- **Click a station** when its ring turns green (READY) to collect the cooked
  item. Leave it too long and it burns — click to discard it.
- **Click a bento box** to place the held item in the matching compartment.
  A wrong item shakes the box and is refused.
- **SPACE** (or click a finished box): serve the completed bento.
- **P**: pause. A shift lasts 02:30.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

The game is plain static files under `game/` — no network, no external assets,
all art drawn in code, sounds synthesised with WebAudio. Screenshots are real
renders of the game (`?shot=start|play|rush|end&seed=1`).
