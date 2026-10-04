# How to create an Infrastructure MiniGame Or what I learned from Uwe Rosenberg

**Date:** 2026-10-04  
**For:** itch devlog / social (copy from `---` below)  
**Internal refs:** PRD 14.7, 11.3 (`infrastructure` ledger), `data/infrastructure/*`

---

## itch — title

**How to create an Infrastructure MiniGame Or what I learned from Uwe Rosenberg**

## itch — body

I didn’t set out to ship SimCity inside a football manager. I set out to fix a feeling: **the club should be a place you upgrade**, not a menu where money is a number you click away.

In the 2002 screenshots I keep coming back to, **Bandenwerbung** is already inventory — empty boards are hunger, filled boards are income. FM11 finishes that fantasy: you live at the desk, the week happens around you. Our sim was ahead of our *rooms*. Infrastructure is the room where the underdog campaign becomes visible: start with Regionalliga emptiness, end (years later) with a ground that looks like someone cared.

That’s the campaign. Players **and** environment.

### Why it’s three games in one (and why that’s a tradeoff, not scope creep)

We talked this to death, because it *is* three hobbies glued together:

1. **Football Manager** — squad, week, matchday money, youth campus levels.  
2. **SimCity (lite)** — streets connect; bus, S-Bahn, arena, and kiosks only “work” on the network; draw roads, click ⚠️ when you were dumb.  
3. **Uwe Rosenberg** — you don’t unlock the map one random tile at a time; you buy **2×5 plates** on the sides, alternating left/right, until the board grows in a way that *looks* like a plan.

The tradeoff we accepted: **one data model now**, not three half systems we throw away in a month. “Just footprints first, streets later” sounded sensible until we admitted a huge open grid **kills the Rosenberg bite** — if everything is free, buying land is theatre.

So “right” meant:

- A **bigger board**, but only a **farm** around the stadium is playable at start.  
- **Expansion plates** (four of them, 2×5, left/right alternating) — not a wreath of 1×1 unlock cells. That’s the board-game lesson: purchases should feel like *chapters*, not confetti.  
- From day one, a **road from the city to the arena**. You’re not punished for forgetting roads exist; you’re punished for **building in the wrong place** and leaving bonuses on the table. ⚠️ is the receipt.  
- **Footprints**: a building is a rectangle with a **minimum size** (training patch 2×3, Gelände tile 3×3, sausage stand 1×1…). Drag edges, shrink back to min so you can rearrange. Effect scales with **area**, not icon count.  
- **Caps**: only **parking** and **Bratwurst** may exist many times. One fanshop, one S-Bahn, one bus — but they can still *grow*. Quality (shop levels, training hall tiers) is separate from **land**.

Land vs. quality was the other big argument. Footprint is **how much ground you spend**; levels are **how good the building is**. Both stack. Otherwise you’d only ever click “upgrade” and never make the painful “park vs. youth pitch vs. sausage” choice.

### Matchday math we argued into the design

This one mattered for “tycoon” feel:

- **Money from kiosks** (Wurst, shop, beer tent) scales with **how full the stadium was** on matchday — half full means half the shirts and half the sausages. Plausible.  
- **Training effects do not** scale with ticket fill. Physio doesn’t care if the Nordkurve was sold out.  
- **Per-stand capacity**, not one global sausage pool — ten thousand people don’t magically buy ten thousand wursts through one counter; each stand has its own ceiling so spamming 1×1 icons isn’t optimal.

Non-match weeks still get a trickle (people wander the ground, a few sales) — that’s the Stardew settlement screen idea for later. Home games stay the honest receipt.

### Tribünen, Banden, Finanzen

**Grundriss** tab: the pitch map stays. Sponsor slots sit on the **tribune cards**, not painted on the grass — same DNA as Bandenwerbung. **Steh-/Sitz-Ausbau** in the **Ausbau** tab isn’t cosmetic; it unlocks **more boards** to sell.

When you spend capital — plates, streets, tribune expansion — it hits **club cash**, not the transfer budget, and it shows up in **Finanzen** as **🏗️ Ausbau**. That was a deliberate answer to “I just click buttons and make it rain.” If €650k on curves doesn’t leave a scar in the waterfall, it’s not a tycoon game yet.

### What we did *not* pretend is finished

- No 3D stadium editor. 2D grid, SVG/CSS, full stop.  
- No loans / investors (stack rule for v1).  
- Hotel, museum, merch **SKU** story — PRD M3. The **Bratwurst is here**; “they came for the new shirt” is a different feature.  
- Some academy tiers in JSON are still **hunger** until the sim catches up.

If you playtest: **Stadion → Gelände**, draw a street like you mean it, put a bus on the network, buy a side plate, then open **Finanzen** after a home game and see if the sausage money matches your fill rate. Tell me where it lies.

Thanks for reading. Next devlog might be about why money still doesn’t hurt enough — that’s the session after this one.

---

## Deutsch (optional zweiter Post)

**Titel:** Wie man ein Infrastruktur-MiniGame baut (oder: was ich von Uwe Rosenberg gelernt habe)

Kurz die gleiche Story in Deutsch — wenn ihr lieber DE lest, nehmt diesen Block statt dem Englischen oben.

Der Verein soll ein **Ort** sein, den du ausbautst — nicht ein Menü. 2002 **Bandenwerbung** war schon Inventar; leere Flächen sind Hunger. Infrastructure ist der Raum, in dem die Underdog-Kampagne sichtbar wird.

Drei Spiele in einem — bewusst, nicht aus Versehen: **FM** (Kader, Woche, Campus), **SimCity-light** (Straßennetz, ⚠️ wenn du blöd baust), **Rosenberg** (**2×5-Plättchen** links/rechts, kein 1×1-Kranz). Ein großes offenes Grid hätte den Biss verschenkt.

Start: **Straße Stadt → Arena**. Wurst & Shop verdienen anteilig zur **Auslastung**; **Training nicht**. Tribünen-Ausbau = mehr **Banden**. Kapitalkäufe = **🏗️ Ausbau** in den Finanzen, nicht Transferbudget.

Noch WIP: kein 3D, kein Merch-SKU-Drama, manche Akademie-Stufen noch Möbel.

---

## Internal (not for players)

| Decision | Source in discussions |
|----------|------------------------|
| Three layers: FM / SimCity / Rosenberg | User msg 2026-10-03 ~23:17, plan “Gelände Footprints” |
| Locked core + buyable ring → 2×5 side plates | User msg 2026-10-04 ~00:53; PRD 14.7 |
| Start street city→arena | Same; “wer blöd baut verschenkt Boni” |
| Occupancy for kiosk $, not training | Bugfix session 2026-10-04; option B non-matchday trickle |
| `infrastructure` ledger category | Finances / “make it rain” session 2026-10-04 |
| Gelände vs Trainingsplatz | User: Gelände = % on Gelände building; Platz = training bonus |
