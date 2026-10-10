# /docs/prd/19_story_choice_seeds.md

**Version:** 1.1  
**Last Updated:** 2026-10-08  
**Status:** Draft backlog (feeds `render.ts` / inbox before Ollama)

**Parent:** [19_career_acts.md](./19_career_acts.md)

Canon choices use `story_state.choices` + `scheduled_payoffs`. Payoffs fire 1–2 seasons later unless noted.

---

## Chairman / board

| ID | Beat | Choice A | Choice B | Payoff A (timing) | Payoff B (timing) |
|----|------|----------|----------|-------------------|-------------------|
| `chair_youth_minutes` | Act 2 week 6 | Promise U19 minutes in cups | Promise first-team only if table top 8 | S2: +fanbase if youth played; board pressure if not | S2: cash bonus if top 8; morale hit if missed |
| `chair_infra_vote` | Act 2 pre-stadium unlock | Prioritize stand roof | Prioritize training hall | S2: matchday cash +; training hall delayed 8 wk | S2: F2.3 unlock earlier; ticket revenue flat |
| `chair_debt_patience` | Act 2 mid-season | Accept wage freeze 12 wk | Push for one marquee loan signing | S2: wage cap headroom; transfer window quiet | S2: board pressure spike if signing flops |
| `chair_relegation_fear` | Act 1 week 20 | Public calm interview | Attack journalist | S1 end: media_hype stable | S1 end: hype drop but fan_feed loyalty beat |

---

## Video analysis salesman (F4.10 gate)

| ID | Beat | Choice A | Choice B | Payoff A | Payoff B |
|----|------|----------|----------|----------|----------|
| `salesman_analysis_s1` | Act 2 inbox | Buy module (cash) | Defer one season | Unlock `opponent_scout_module`; cash hit | S2: rival club gets flavor “first analysis” line; you unlock cheaper |
| `salesman_analysis_bundle` | Act 2 if deferred | Buy bundled with sponsor | Refuse entirely | F4.10 + small sponsor cash | S3: harder opponent prep (flavor only) + chronicle |

---

## Captain / dressing room

| ID | Beat | Choice A | Choice B | Payoff A | Payoff B |
|----|------|----------|----------|----------|----------|
| `captain_rotation` | Act 1 week 12 | Back captain on strict XI | Rotate for youth | S1: captain morale +; youth minutes low | S1: youth growth visible; captain `drive` perception beat |
| `captain_contract` | Act 2 | Extend captain 2 yr | Name new captain next season | S2: leadership buff in crunch weeks | S2: new captain inbox arc |
| `captain_board_defense` | Act 1 post-loss streak | Captain speaks to fans | You take press alone | Fanbase stabilizes S1 | media_hype drops; chairman trust + |

---

## Assistant coach

| ID | Beat | Choice A | Choice B | Payoff A | Payoff B |
|----|------|----------|----------|----------|----------|
| `asst_training_keys` | Act 2 training unlock | Let assistant set week | You take manual immediately | Auto plan quality +2 wk | Player learns manual; neglect risk if skipped |
| `asst_scout_trip` | Act 2 | Send assistant to region trip | Keep at training ground | S2: home region knowledge + | S2: fitness recovery + |

---

## Journalist / press

| ID | Beat | Choice A | Choice B | Payoff A | Payoff B |
|----|------|----------|----------|----------|----------|
| `press_youth_hype` | Act 1 | Hype wonderkid | Downplay expectations | S1: media_hype +; prodigy trap risk F4.8 flavor | S1: calmer board; scout CI tighter |
| `press_ally_exclusive` | Act 2 | Give ally exclusive | Snub for hostile | S2: positive chronicle chain | S2: hostile pressure spike one month |
| `press_transfer_leak` | Act 3 | Deny rumor | Confirm interest | Transfer fee modifier flavor | Morale hit if deal fails |

---

## Fans / local NPCs

| ID | Beat | Choice A | Choice B | Payoff A | Payoff B |
|----|------|----------|----------|----------|----------|
| `fan_ticket_price` | Act 1 | Hold prices | Raise for roof fund | Fanbase +; cash tight | Cash +; fan_feed negative beat |
| `fan_bratwurst_ritual` | Act 1 | Sponsor stand | Keep family vendor | F6.5 cash; chronicle “sold soul” joke | Fan loyalty; hospitality beat later |
| `fan_ultras_meeting` | Act 2 | Meet ultras before derby | Ignore | Derby ambiance +; discipline risk flavor | Neutral |

---

## Camp leader / youth

| ID | Beat | Choice A | Choice B | Payoff A | Payoff B |
|----|------|----------|----------|----------|----------|
| `camp_leader_strict` | F3.9 hire | Discipline-focused leader | Development-focused | Camp intake meanShift −; mental_mod high | Higher variance youths |
| `camp_takeover_now` | Camp roster | Promote camp star immediately | Season in camp | Pro minutes earlier; pressure | Better CA jump S2 |
| `youth_agent_cut` | Act 2 | Pay agent fee for wonderkid | Walk away | Player joins; cash − | Rival signs flavor in S2 |

---

## Scout chief

| ID | Beat | Choice A | Choice B | Payoff A | Payoff B |
|----|------|----------|----------|----------|----------|
| `scout_home_first` | Act 1 (auto) | — scripted | — | Home region pool seeded | — |
| `scout_region_expand` | Act 2 unlock | Open Fördeküste first | Open Hansestadt first | Regional talents skew | Different club links S2 |
| `scout_false_positive` | Act 2 | Sign hyped prospect | Wait one more report | F4.8 trap possible | Miss window flavor |

---

## Nordstern Act 1 finale

| ID | Beat | Choice A | Choice B | Payoff A | Payoff B |
|----|------|----------|----------|----------|----------|
| `nord_relegation_speech` | Season end drop | Thank fans | Blame board publicly | Chronicle “legend”; Act 2 offer tone warm | Offer still comes; chairman wary |
| `nord_youth_keep` | Act 1 end | Promise to watch youths elsewhere | Cut ties cleanly | Act 2 chronicle callbacks with names | Clean slate |

---

## Act 3 / empire (sketch)

| ID | Beat | Choice A | Choice B | Payoff A | Payoff B |
|----|------|----------|----------|----------|----------|
| `empire_hotel_vs_pitch` | Act 3 | Expand hotel | Expand pitch | F7.3 hospitality arc | F7.2 capacity |
| `empire_cup_risk` | Pre-final | Rest starters | Full strength | Fitness S+1; injury risk flavor | Cup run chronicle |
| `empire_international_cup_won` | Post-final win (sim) | View chronicle | Unlock Elite World (PRD 21) | Client unlock profile | New `elite_world` save |

---

## Finanzierung (F6.6 — PRD 11.12)

Story-Kanäle: max. **3 Angebote** pro Karriere (lifetime), jeder Kanal **einmal** (Accept oder Decline schließt dauerhaft). Bank (`bank_term_loan`) ist **nicht** hier — nur Finanzscreen.

| ID | Beat | Choice A | Choice B | Payoff A | Payoff B |
|----|------|----------|----------|----------|----------|
| `fan_stadium_coop` | Fanrat / Kurve | Genossenschaft — Anteile | Ablehnen | Einmal-Cash; Merch-Anteil Fans; Chronik | Kanal zu |
| `loan_shark_instant` | Knochenbrecher | Sofortkredit nehmen | Ablehnen | Cash; extremer Wochenzins (§11.12.6) | Kanal zu |
| `naming_rights_sale` | Vorstand / Sponsor | Namen verkaufen | Name behalten | Cash; `naming_rights_sponsor`; Fanbase-Dip | Kanal zu |
| `merch_digi_drop` | Merch / Marketing | Limited Digi-Drop | Standard-Kollektion | `limited_drop` Boost 8–12 Wo | Kanal zu |

---

## Player availability (Story–Sim Input Boundary)

Canon beats may set **availability** only — not match scores. See PRD 01.

| ID | Beat | Choice A | Choice B | Payoff A | Payoff B |
|----|------|----------|----------|----------|----------|
| `player_awol_crisis` | Act 2+ inbox | Grant leave (3 wk) | Fine + force return | `awol` 3 wk; morale split | Shorter ban; captain friction flavor |

---

## Gimmick lane (non-canon, optional)

Small fan/morale nudges without `scheduled_payoffs` — use sparingly, never block progression.

| ID | Example | Effect |
|----|---------|--------|
| `gimmick_beggar` | Ignore street ask | −0.5% fanbase (optional, off by default in canon mode) |
| `gimmick_photo_op` | Skip kid birthday | Harmless flavor line only |

---

## Count

**24 canon choice rows** above (excluding gimmicks and Act 3 TBD). Expand to 30+ as beats are authored.
