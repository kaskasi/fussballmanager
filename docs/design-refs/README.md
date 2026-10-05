# Design reference images (not shipped in game)

These files guide UI layout and mood. They are **not** runtime assets (PRD 01: no generative AI in shipped visuals). Lumo mocks are conversation exports; replace `design.png` when the master board updates.

| File | design.md | Notes |
| --- | --- | --- |
| [design.png](./design.png) | §1–§8 overview | Master board / annotations — overwrite locally as needed |
| [lumo/aufstellung_pitch_sidebar.png](./lumo/aufstellung_pitch_sidebar.png) | §9.1 | Pitch + squad list |
| [lumo/aufstellung_taktik_context.png](./lumo/aufstellung_taktik_context.png) | §9.1 | Tactics pills + opponent card |
| [lumo/aufstellung_compact.png](./lumo/aufstellung_compact.png) | §9.1 | Variant pitch + list |
| [lumo/finanzen_balken_kpi.png](./lumo/finanzen_balken_kpi.png) | §9.2 | Bar rows + KPI stack |
| [lumo/hub_menu_shell.png](./lumo/hub_menu_shell.png) | §6, §9.10 | Shell + TEAM nav |

**Prompt snippet:** *Implement screen X per `docs/prd/design.md` §9.x; layout ref `docs/design-refs/lumo/…` or FM2001 `fmscreens/fm2001/…`.*

Verbindliche ASCII wireframes remain in [design.md](../prd/design.md) §9.
