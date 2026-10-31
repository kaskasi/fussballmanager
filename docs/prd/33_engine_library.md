# PRD 33 — The match engine as a deterministic library

**Status:** Proposed · 2026-10-31 · Owner direction: the final form of the project.
**Decisions:** ADR 0007 (deterministic core, build not buy, accepted) · ADR 0008
(attribute model, proposed).
**Touches:** ADR 0003 (calibration), ADR 0004 (point 3 amended by the event
pitch, §9), PRD 16 (commentary director), PRD 26 (kits on player cards),
PRD 30 (roadmap order, §15).

---

## 1. Why

After replaying Anstoß, Nutmeg and FM, the owner settled on the final form of
the project (2026-10-31): extract the match engine as a library. It is a
deterministic football engine with a pitch view, a text mode and optional
hand-voiced commentary in German and English. The audience is developers who
build games with LLMs and need building blocks they can prompt into a game
quickly.

The owner prototyped an NFL GM game on txfl. The LLM integrated it without
trouble, but every run gave different results. This library makes the
opposite promise: the same input, seed and decisions give the same match,
event by event, on every supported platform. Determinism is the product
(ADR 0007).

The Club stays the first consumer. The game talks to the engine only through
the library's public API, so there is one engine, not two.

## 2. Users and jobs

| User | Job |
|---|---|
| Developer building a game with an LLM | Get a credible football match into the game in minutes; results repeat for saves, replays, tests and server-authoritative multiplayer |
| The same developer, with their own player model | Feed 1, 6 or 40 attributes on any scale without breaking the engine's balance |
| The same developer, presenting matches | Text commentary in German and English, an event pitch, optional voice, without writing a renderer |
| The Club | One engine for live matches, background leagues and previews |

## 3. Principles

1. **Determinism is the product.** Engine version, input, seed and decision log
   give an identical event log, bit for bit, on every supported platform
   (ADR 0007).
2. **Events are the contract.** Text, pitch, voice, statistics and replays read
   the event log and nothing else (the line ADR 0004 started).
3. **Bring your own attributes.** Any attribute schema maps onto the engine's
   canonical abilities (ADR 0008).
4. **Calibrated by default, tunable on purpose.** Realistic statistics out of
   the box (ADR 0003 bands), a report that shows them, and a few named knobs.
5. **LLM-first ergonomics.** One obvious entry point, defaults for everything,
   JSON schemas, presets, recipes, and errors that name the fix.
6. **Project rules carry over.** No 3D, no generative AI assets, no cloud LLM.

## 4. Scope (v1)

**In**
- Full match simulation with events, statistics and final state; a step API
  for interactive matches (substitutions and tactic changes at decision
  points).
- Rules options: 3 or 5 substitutions, extra time, penalty shootout, cards and
  injuries on or off.
- Attribute schema adapter with presets (ADR 0008).
- Quick result model and win/draw/loss prediction, fitted to the full engine.
- Calibration report and tuning knobs.
- Commentary: a commentary plan, German and English text catalogues, a voice
  manifest and scheduler. Voice packs are separate (§11).
- Event pitch: scene model, SVG renderer and player cards (§9).
- Conformance test vectors; documentation written for LLMs.

**Out (v1)**
- 3D, continuous-motion 2D, networking, text-to-speech, voice cloning.
- Management systems: transfers, finances, youth, growth. They stay in The Club.
- Platforms other than JavaScript (planned for v2, §12).

## 5. Packages (target)

| Package | Content | From today's code |
|---|---|---|
| core | Simulation, step API, rules, events, statistics; no dependencies | `server/src/engine` (about 9,400 lines with tests); `shared/src` match contract, `rng.ts`, `pitch.ts`, formations |
| schema | Attribute adapter, presets, strength per role | `shared/src/career-squad-bridge.ts` becomes the "The Club" preset |
| quick | Quick results and prediction, fitted to core | `src/sim/division-matchday.ts` (strength model, not fitted today) |
| commentary | Commentary plan, text catalogues, voice manifest and scheduler | `server/src/commentary` (director, beats, line copy; about 2,800 lines) |
| pitch | Scene model, SVG renderer, player cards | New; the frames contract exists (`shared/src/match-view.ts`) |
| calibrate | Bands, report, tuner | `server/src/engine/calibration*`, `scripts/run-engine-calibration.ts` |

The packages start inside this repository. Publication follows once the API
stops moving (slice 7).

## 6. API shape (names not final)

| Call | Purpose |
|---|---|
| simulate match | A whole match in one call: events, statistics, final score |
| create match → advance until decision → decide | Interactive match. It runs to the next decision point (half-time, injury, a pause asked by the game), takes a substitution or tactic change, and continues. A replay is seed plus decision log |
| quick result / predict | A result, or win/draw/loss probabilities and expected goals, without an event log. For background leagues, previews and AI decisions |
| define schema / presets | Map a game's attributes onto canonical abilities |
| commentary | Commentary lines for a level (key, extended, full) and language. The same plan drives voice |
| pitch scenes / render pitch | Scenes as data for any renderer; an SVG renderer for the web |
| calibration report | Bands with traffic lights and suggested knob values |

## 7. Determinism (ADR 0007)

- **Contract.** Engine version, input, seed and decision log give the same
  event log on every platform. Every result and replay carries the engine
  version.
- **Today.** The core is mostly deterministic already. The Mulberry32 state
  lives in the match state, and `step` is pure. Commentary picks variants by a
  hash of seed, event `seq` and line id, and never draws from the match's
  random numbers. A golden match exists (`server/src/engine/golden/seed-2026.json`).
- **Gaps.** Three calls are platform-dependent: `Math.exp` in `weights.ts` and
  `Math.hypot` in `helpers.ts` and `pass-graph.ts`. Results carry no engine
  version, and nothing tests across platforms.
- **Random streams.** Each match seed gives three named streams: `sim`,
  `commentary` and `presentation`. Only `sim` decides the match.
- **Conformance vectors** are the specification. Each one is an input, a seed
  and a decision log, with the hash of the expected event log. They run in
  Node, Chromium, Firefox and WebKit. Every later port must pass them.

## 8. Attributes (ADR 0008)

- **Canonical abilities** are what the engine reads. Today that is nine skills
  on 0–100 plus height, form, fatigue and one of eight roles.
- **Schema adapter.** A game declares its attributes and scales. It gives at
  least two anchors per scale ("average pro", "world class"), a weight matrix
  onto the canonical abilities, and its positions mapped to engine roles.
- **Coverage.** Abilities that a schema covers poorly are filled from role
  profiles and overall strength. A one-number schema and a 40-attribute schema
  run on the same mechanism; fewer attributes mean less nuance per player, not
  a different balance.
- **Ability and tendency are separate.** Abilities decide whether an action
  works; tendencies decide how often a player tries it. This is also the fix
  for the shot concentration measured in ADR 0003.
- **Level.** Duels depend on the difference between the players involved. The
  absolute level acts through the existing level pooling (85 % towards
  reference skill 60) and an explicit level parameter.
- **Strength per role** comes from the same weights the engine uses, so a
  number a game displays predicts what the player does in a match.

## 9. Event pitch

**Why the old pitch failed.** The engine produces one position snapshot per
event, about 1,600 per match, roughly one every 3.4 seconds of match time.
The removed live pitch filled the gaps with interpolation and synthetic
frames, which looked wrong (ADR 0004).

**The new idea (owner, 2026-10-31).** Show each event where it happens on the
pitch, together with the cards of the players involved. A pass briefly shows
both the passer and the receiver. Nothing moves between events. The view
shows what the event says and nothing more.

**Data.** Every event already carries the ball position and the involved
players with their positions at that moment (`shared/src/match-event.ts`,
coordinates 0–100 from the home goal line). No engine change is needed.

**Scene content per event**

| Event | On the pitch | Cards |
|---|---|---|
| Pass (complete or not) | Ball path from passer to target | Passer and receiver, briefly |
| Carry | Path of the carry | Carrier |
| Duel (tackle, aerial, dribble) | Marker at the duel | Both players, winner highlighted |
| Shot | Line towards goal, outcome (goal, save, block, wide, woodwork) | Shooter and keeper |
| Goal | Emphasised line and marker | Scorer and assister |
| Foul or card | Marker, card colour | Offender and fouled player |
| Set piece | Marker at the spot | Taker |
| Substitution, injury | Marker at the touchline | Players off and on, injured player |

- **Card content:** shirt number, name, role and club colours (PRD 26). The
  card also shows the ability the event tests (passing for a pass, shooting
  for a shot, tackling or dribbling for a duel, aerial plus height in the air)
  and the player's match statistics so far.
- **Motion:** only the ball moves, along the event's own path (from passer to
  target, for example). Both endpoints are event data. Players never move
  between scenes.
- **Context dots:** the other players can appear as faint dots from the same
  event's frame (`frames[].dots`). This is off by default.
- **Pacing:** the scene changes with the commentary line. It follows the
  highlight levels of PRD 16 (key, extended, full), with a minimum and maximum
  scene time, and quiet phases are skipped.
- **Headless first:** the library returns scenes as data: positions, cards,
  path, emphasis and a duration hint. The SVG renderer is one consumer;
  Phaser, Godot or Unity users draw their own.
- **Accessibility:** the commentary line is each scene's text equivalent.
  Reduced motion turns the ball animation off.
- **Determinism:** scenes are a pure function of the events plus the
  `presentation` stream. The same match always looks the same.

**In The Club:** this amends ADR 0004 point 3 (a note is added there).
Commentary stays the hero. The event pitch is a panel beside it on desktop and
a collapsible panel above it on phones. It reuses the lineup pitch (`tc-pitch`
tokens) and its mini card (number, name, club · position, touches; design.md
§4). The matchday wireframe (`design/09.15-matchday.md`) is updated before it
is built.

## 10. Commentary: text and voice

- **Text.** The PRD 16 director becomes the commentary package: beat ids,
  highlight levels, play-by-play plus colour, German and English catalogues.
- **One plan, two outputs.** The director produces a plan of line ids. Text
  renders it; voice plays the clips with the same ids. Subtitles always match
  what is spoken.
- **Voice manifest.** Each clip has an id, language, text, beat ids, intensity
  (calm, excited, peak), duration and speaker (play-by-play or colour).
- **Scheduler.**
  - Priorities: goal, then big chance, then card, then build-up.
  - A goal interrupts the clip that is playing.
  - A minimum gap separates clips, and fillers cover quiet spells.
  - A small memory allows callbacks ("him again").
- **Names.** Clips contain no player names. Instead:
  - Shirt numbers ("Die Neun zieht ab!", "The number nine shoots!"), which
    needs 99 clips per language.
  - Lines without names.
  - An optional name bank for a game's own squad.
  - In German a name stands alone or opens the sentence, in the nominative
    only, so no case endings are needed.
- **First pack (estimate).** About 30 beat types × 3 intensities × 3 variants
  ≈ 270 clips, plus about 50 fillers and 99 shirt numbers. That is about 420
  clips per language.
- **Recording.** One voice per pack, the same room and microphone, lossless
  masters, compressed delivery for the web, consistent loudness. No
  text-to-speech and no voice cloning (no generative AI assets).

## 11. Licensing (recommendation; owner decision open)

- **Code and text catalogues:** permissive open source, MIT recommended
  (Apache-2.0 if an explicit patent grant matters). Games built with LLMs pick
  libraries that are open, on npm and documented. What sets this library apart
  is determinism, calibration and documentation, not secrecy.
- **Voice recordings: not under an open licence.**
  - A voice is personal. Open licences such as CC0 or CC-BY cannot be
    withdrawn, and they do not stop voice cloning or model training.
  - The owner's voice is also the signature of The Club.
- **Recommended split for voice:**
  - The manifest format and scheduler are open, so anyone can record and
    license their own pack. Community packs are welcome.
  - A small free starter pack (about 100 clips per language) under an own
    asset licence: use in games allowed, credit required, no redistribution as
    a standalone pack, no voice cloning or AI training.
  - The full pack ships with The Club and could later be sold as an add-on.
  - A lawyer should check the asset licence text before release.

## 12. Platforms

- **v1:** everywhere JavaScript runs: browsers, Node, Deno, Bun, web workers,
  and React Native's Hermes engine. The engine's own math functions (ADR 0007)
  make results identical across JavaScript engines.
- **v2:** Unity (C#) and Godot.
  - The cheapest bridge is a sidecar command-line tool: JSON input in, event
    log out.
  - The deeper options are ports that pass the conformance vectors, or a
    WebAssembly build.
  - Demand decides which; the vectors are the specification either way.
- **Port rules:**
  - IEEE 754 doubles, with no fused multiply-add (turn contraction off in
    C and C++).
  - The same operation order.
  - JavaScript semantics for rounding (`Math.round` rounds halves up) and for
    32-bit integer operations.

## 13. Documentation for LLMs

- One reference written for LLMs (`llms.txt` plus a full reference), with ten
  recipes:
  - a match in one call;
  - a live match with text commentary;
  - an event pitch in a web page;
  - a league season with quick results;
  - an own attribute schema;
  - substitutions through decisions;
  - a penalty shootout;
  - a replay from a log;
  - a calibration report;
  - voice commentary with a pack.
- JSON schemas for every input, with defaults for every optional field.
- Presets: a team from one overall rating, standard formations, the schema
  presets.
- Errors that name the fix, for example: "player 7 has no role; set one of GK,
  FB, CB, DM, CM, AM, W, ST".
- Documented, stable event types, each with an example.

## 14. Prerequisites in today's engine

| Item | Today | Needed |
|---|---|---|
| Goals per match, career set (ADR 0003 band 2.4–3.6) | 2.0–2.3 in every tier | In band |
| Top shooter's share of a team's shots (band ≤ 45 %) | 53–55 % | In band, through tendencies (ADR 0008) |
| Matches with a hat-trick (band ≤ 6 %) | 4–11 % | In band |
| Level | Pooled 85 % towards reference skill 60 (ADR 0003) | Kept; level becomes an explicit parameter |
| Rules | 3 substitutions, two halves | 3 or 5 substitutions, extra time, shootout |
| Platform math | `Math.exp` once, `Math.hypot` twice | Own functions (ADR 0007) |
| Random numbers | Mulberry32 in the match state; commentary by hash | Named, documented streams |
| Engine version in results | None | Stamped |
| Coupling to The Club | Hard-wired bridge from 15 attributes to 9 | Schema preset |

## 15. Order in the roadmap (PRD 30)

Proposal, pending an owner decision: the library work (E) starts after
phase 2 is merged and before phases 5, 6 and 9.
- Cups (phase 5) need extra time and shootouts, which are rules options.
- In-match management (phase 6) is the decision API.
- Set-piece takers (phase 9) are an engine change.

Phases 3 (suspensions) and 4 (season calendar) are game-side and can run
alongside.

## 16. Slices

1. **Determinism hardening.** Own `exp` and distance functions; named random
   streams; an engine version stamp; conformance vectors (the golden match plus
   generated inputs) in Node and three browsers; a test that finds forbidden
   calls in the core. Re-measure calibration (ADR 0003) and re-record the
   golden match.
2. **Package boundary and API.** Core as a package, with simulate match and the
   step API (advance, decide). Rules options. The match-view wrapper becomes a
   library function. The Club uses only the public API.
3. **Attribute model (ADR 0008).** Schema adapter, presets, tendencies,
   strength per role. Shot concentration and goals back in their bands. A
   schema-invariance test.
4. **Commentary package.** Director, beats and catalogues move. Commentary
   plan, voice manifest and scheduler, tested with the owner's first
   recordings as they come in.
5. **Event pitch.** Scene model, SVG renderer and player cards. Integration in
   The Club, with the wireframe first and a note on ADR 0004.
6. **Quick model** fitted to the core; prediction; calibration report and tuner.
7. **Documentation and release.** Docs for LLMs, recipes, the LLM probe (§17),
   licence, first 0.x release on npm.
8. **v2: platform bridges.** The sidecar command-line tool, then a port or a
   WebAssembly build.

Recording the voice pack is the owner's own track and runs alongside.

## 17. Acceptance

- **Determinism.**
  - 1,000 generated inputs with fixed seeds give identical event-log hashes in
    Node, Chromium, Firefox and WebKit.
  - Changing commentary, pitch or voice settings never changes a hash.
  - A replay from input, seed and decision log reproduces the live match.
- **Calibration.** Every ADR 0003 band is green, for the career set and for
  every schema preset.
- **Schema invariance.** A reference team's win probability against a fixed
  opponent differs by at most 3 percentage points between the presets: one
  rating, six values, FM-like and The Club. The threshold is confirmed by the
  first measurement.
- **Event pitch.** Every event type has a scene. A scene never shows a
  position that is not in its event.
- **LLM probe.** A fresh model with only the documentation solves at least 4 of
  5 standard tasks, and running its code twice gives identical results.
- **The Club** runs on the public API only, with its tests and the long run
  green.

## 18. Open questions

| Question | Default if unanswered |
|---|---|
| Library name | Decided before slice 7 |
| Licence | MIT for code and text; own asset licence for the voice (§11) |
| Event pitch placement in The Club | Panel beside commentary (desktop), collapsible above it (phone) |
| Platform after JavaScript | Sidecar CLI first; Unity or Godot by demand |
| Separate repository at release | Packages in this repo until slice 7, then decide |
| Growth engine (PRD 02) as a later package | Not in v1 |

## Progress

Proposed 2026-10-31. Nothing built.
