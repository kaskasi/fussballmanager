# /docs/prd/playtest_protocol.md

**Version:** 1.0  
**Last Updated:** 2026-10-08  
**Status:** Draft (process law — not a feature ID)

---

## Purpose

Structured **live-observed playtesting** before expanding PRD 19 story UI or PRD 21 Act 4 implementation. External review (2026-10-08): loop feel and friction matter more than additional narrative scope.

**Minimum program:** **4 sessions × 30 minutes**, facilitated, documented.

---

## When to run

| Gate | Rule |
|------|------|
| PRD 19 slices B–E | Do not ship major new career chrome until **≥2 sessions** completed and readout filed |
| PRD 21 slices C–E | Victory menu + elite world UI blocked until same readout |
| PRD 20 | P0–P2 DoD should be in build under test |

---

## Session setup

| Item | Spec |
|------|------|
| Build | `main` or agreed branch; fresh or Nordstern tutorial save |
| Devices | **1280×720** desktop + **390×844** mobile (or Steam Deck once available) |
| Locale | Tester’s choice; note in log |
| Facilitator | One observer, minimal coaching; think-aloud encouraged |
| Recording | Optional screen + notes; no PII beyond tester consent |

---

## Facilitator script (30 min)

| Min | Activity |
|-----|----------|
| 0–3 | Consent, think-aloud instructions, “play as you would at home” |
| 3–8 | Opening + first hub visits (Act 1 curtain if enabled) |
| 8–18 | Advance **≥3 weeks** via NEXT; touch youth inbox if prompted |
| 18–25 | Open squad, training, scouting (whatever nav allows); one failed/confusing path OK |
| 25–28 | “What would you do next?” — no leading |
| 28–30 | Debrief: one delight, one friction, would they return tomorrow? |

**Do not** explain hidden systems unless tester is hard-blocked >2 min.

---

## Capture template (per session)

Copy into `docs/research/playtest-logs/YYYY-MM-DD-session-N.md` (create folder on first use):

```markdown
# Playtest session N — YYYY-MM-DD

- Tester: (id or initials)
- Build / commit:
- Device:
- Locale:

## Friction log (timestamp → issue)
- 

## Quotes (verbatim)
- 

## Task success
- [ ] Found NEXT / advanced week
- [ ] Understood youth decision (if shown)
- [ ] Navigated without dead-end

## Scores (1–5)
- Clarity of goals:
- Pacing / NEXT loop:
- Visual coherence:
- Would play again:

## Facilitator notes
- 
```

---

## Readout (after session 2)

One-page summary in `docs/research/playtest-readout-YYYY-MM.md`:

1. Top 5 friction themes (with frequency)
2. Blockers vs polish
3. Go / no-go for PRD 19 B–E and PRD 21 C–E
4. PRD 20 presentation mode feedback (comic vs dense) if discussed

---

## References

- [playtest_ideas.md](./playtest_ideas.md) — scenario ideas
- [19_career_acts.md](./19_career_acts.md) — Act 1 loop under test
- [21_career_act4_elite_world.md](./21_career_act4_elite_world.md) — gated slices
