# Hub v2 parity checklist (Manager Desk)

Compare [`ManagerDeskHub`](../src/ui/screens/ManagerDeskHub.tsx) vs legacy [`PipelineDashboard`](../src/ui/screens/PipelineDashboard.tsx) before removing the flag in [`config.ts`](../src/hub/config.ts).

- [ ] Inbox decisions gate NEXT (Monday youth queue)
- [ ] Training 3-day window reflects plan changes after Training screen edit
- [ ] Match preview on pre-match day + scout entry
- [ ] Board objectives carousel
- [ ] League ±3 snippet
- [ ] Growth + fitness heatmaps; development movers
- [ ] Finance crisis vs merch low-stock panel
- [ ] Week autoplay from hub (pause on blockers); no forced Calendar/Training redirect
- [ ] Matchday header flow unchanged (lineup → live → report)

Legacy hub remains available when `MANAGER_DESK_HUB_ENABLED = false`.
