# PRD index

One line per doc, so agents open only what a task needs.

**Precedence:** `AGENTS.md` → numbered PRDs below → [PRD.md](PRD.md) (archived vision; its §4 scope table is still the in/out reference). Tokens, header and the yellow NEXT rule: [design.md](design.md) wins. Which component to use: PRD 20 wins. Decisions that override PRDs: `docs/adr/`.

| Doc | Covers |
|---|---|
| [01_vision](01_vision.md) | Product vision, tone, narrative rules; asset policy (no generative image AI) |
| [02_growth_engine](02_growth_engine.md) | Weekly attribute growth: age curves × anlage × drive × environment, no fixed potential |
| [03_youth_academy](03_youth_academy.md) | Youth intake, auto-simulated youth teams, decision points |
| [04_scouting](04_scouting.md) | Bayesian scouting: confidence intervals, never exact values (own players excepted) |
| [05_transfers](05_transfers.md) | Transfers, contract negotiation, AI market, deterministic `market_value` |
| [06_breakouts](06_breakouts.md) | Breakout/slump life events that change drive, anlage, maturity |
| [07_player_schema](07_player_schema.md) | Full TypeScript `Player` definition: fields, defaults, invariants |
| [08_savegame](08_savegame.md) | Save structure, versioning, migrations, export anti-cheat; §08.10 pre-release rule |
| [09_ui_screens](09_ui_screens.md) | Talent-pipeline screens (8 + 2 modals), ASCII wireframes, 2-click rule |
| [10_feature_list](10_feature_list.md) | Prioritized feature catalog and milestones M1–M4; source of truth for scope |
| [11_finances](11_finances.md) | Club economy: budgets, recurring income/expenses, monthly cashflow |
| [12_league_world](12_league_world.md) | League structure; seeded procedural world per save |
| [13_story_slice_relegation](13_story_slice_relegation.md) | First narrative slice (relegation fight), templates only |
| [14_ui_cockpit](14_ui_cockpit.md) | Club cockpit: how built systems look ("rooms, not an admin shell") |
| [15_feature_gap](15_feature_gap.md) | Gap analysis against reference games (FM 2002, TCM 2003, …) |
| [16_match_broadcast_beats](16_match_broadcast_beats.md) | Match beats and director: pacing, play-by-play + color commentary |
| [17_target_architecture](17_target_architecture.md) | Target architecture: framework-free core, offline-first client |
| [18_cloud_save_m1](18_cloud_save_m1.md) | Optional save sync via sync code (Supabase blob) |
| [18_localization](18_localization.md) | Locale packs DE/EN/zh-Hans; what is and isn't translated |
| [18_ruhephase_loop](18_ruhephase_loop.md) | Breaks between matchdays against NEXT-spamming (draft) |
| [19_assistant_scouting_scope](19_assistant_scouting_scope.md) | Assistant delegation toggle for scouting |
| [19_career_acts](19_career_acts.md) | Three-act career arc, tutorial season, feature curtain |
| [19_story_choice_seeds](19_story_choice_seeds.md) | Story choice backlog with delayed payoffs |
| [20_design_language](20_design_language.md) | Shared UI primitives, tokens, localization rules (implementation side of design.md) |
| [20_scout_batch_actions_future](20_scout_batch_actions_future.md) | Deferred: player-initiated batch actions on the scout map |
| [21_career_act4_elite_world](21_career_act4_elite_world.md) | Act 4 completion, victory screen, Elite World New Game+ |
| [21_scout_map_route_minigame](21_scout_map_route_minigame.md) | Scout map route minigame |
| [22_opponent_scout_sims](22_opponent_scout_sims.md) | Opponent scouting via bundled deterministic sims |
| [23_board_objectives](23_board_objectives.md) | Board tiers and season objectives |
| [24_game_modes](24_game_modes.md) | Three modes on one sim: Regionalliga Manager, Story Mode, New Game+ |
| [25_contextual_tutorial](25_contextual_tutorial.md) | Per-screen coach marks |
| [26_club_kits](26_club_kits.md) | Home kits on faces.js portraits |
| [27_live_substitutions](27_live_substitutions.md) | Live substitutions and half-time changes (draft) |
| [28_press_conferences](28_press_conferences.md) | Press conferences moving morale, press, board, fans (draft) |
| [29_mentoring](29_mentoring.md) | Mentor/talent pairs |
| [30_core_gaps_roadmap](30_core_gaps_roadmap.md) | Multi-session plan + status board: retirement, 5-tier pyramid, suspensions, season calendar, cups, in-match management, chronicle, friendlies, set pieces, difficulty, player happiness |
| [design.md](design.md) | Visual language: tokens, type, icons, header, layout, Definition of Done |
| [design/](design/) | Per-screen wireframes, `09.NN-<screen>.md` (design.md §9.NN) |
| [PRD.md](PRD.md) | Archived original vision; §4 scope table (in/out of v1) |
| [playtest_protocol](playtest_protocol.md) | Process for live-observed playtests |
| [playtest_ideas](playtest_ideas.md) | Raw playtest notes, unsorted |
