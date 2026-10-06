# Tactics — player guide (canonical EN)

Source for in-game Help → Tactics tab (`help.tactics.*` in `en.json`).

---

## How our tactics system works (player-facing)

Tactics are a **SandboxPlan**: everything the match wrapper passes into the engine on top of your **XI + bench**. The engine itself is unchanged; career matches go through `buildMatchView` with squads built via `applySandboxPlan`.

### Layers you control on Lineup

1. **Formation** (`4-3-3`, `4-4-2`, `2-3-5`)  
   Changing formation **reloads a full default plan** for that shape: mentality, pressing, line height, width, tempo, intensity, fluidity, marking, and **role duties** (inverted full-backs vs overlapping, false nine vs poacher, etc.). Slots are re-filled for the new shape.

2. **Three style presets** (saved per save: Ballbesitz / Kompakt / Offensiv → default **4-3-3 / 4-4-2 / 2-3-5**)  
   Tapping a preset **does not change formation**; it only copies **mentality, pressing, line height** from that preset’s saved plan onto your **current** formation. You can **Save** the current sliders into a preset slot.

3. **Fine tuning** (three sliders)  
   - **Men** — mentality (0–100)  
   - **Prs** — pressing (0–100)  
   - **Lin** — defensive line (25–90 in UI)  

   The `Men / Prs / Lin` line on the tactics card is your quick readout.

Everything else in the plan (width, tempo, intensity, fluidity, marking, keeper/fullback/wide/striker duties) **rides along** from the formation default unless you change formation. Career UI does **not** expose those extra knobs yet.

### What opponents do

AI clubs get a formation from **club identity** (e.g. traditional/workers → `4-4-2`, others often `4-3-3`) and fixed-ish sliders from world templates. Identity tweaks mentality/tempo/marking; there is **no** hidden match bonus for being “ambitious.”

### How opponent scout analysis uses tactics

When the scout job finishes, **10 headless sims** run with the **same squads** as the real fixture; only **your** plan varies: sim 0 = your **current** plan, then cycles your **three presets’** plans. The Postfach card aggregates scorelines, a 4×3 grid, and 2–3 formation/risk rows — **not** the full 375-point lattice (that’s offline research only).

Risk tags are coarse: **high line** (line ≥ 62 and press ≥ 58), **low block** (line ≤ 45 and press ≤ 48), else **balanced**.

---

## If you want to play “well” as Nordstern — practical guidance

There is **no** universal best tactic; offline research on the same XI already shows **different top plans per opponent** on early matchdays. Still, a sensible playbook:

| Situation | Sensible starting point | Why |
|-----------|-------------------------|-----|
| **Default week, no scout** | **4-3-3** preset **Ballbesitz** (~M58 P64 L56) | Matches default preset 1; possession-ish duties; not crazy high line. |
| **Scout report available** | Prefer the **recommended formation + risk** row that matches your risk tolerance | Only 10 sims, but they’re tied to **your** presets and current plan. |
| **Study hint (early Nordstern)** | Often **high line (L72)** and **mid–high press** in top lattice cells | Underdog games stayed **low-scoring**; high line sometimes helped **goal diff**, not 70% wins. |
| **Away vs clearly stronger CA** | Lean **Kompakt** (lower line/press → often **low_block** tag) or **4-4-2** | Fewer open games; bad rows were often aggressive **2-3-5** with high press/line. |
| **Must chase a result** | **Offensiv** **2-3-5** with eyes open | More variance; can improve attack or worsen goals against depending on opponent. |

**Lineup still beats sliders:** weak CAs in wrong roles matter more than +6 on pressing. Tactics are the **marginal** layer on top of personnel.

**Align expectations with design:** Nordstern starts **~8–15 CA below the league median**; underdog is **start conflict**, not permanent victimhood. Relegation is **allowed**; growth and transfers are the long arc.

---

## Do tactics “tip the scales” when teams are even?

**What we measured:** Nordstern (underdog) vs three league opponents, **375 plans × 20 runs** each. On the **same squad**, best vs among-worst in the published top-10 band was on the order of **~0.3–0.5 goals per game** average goal difference and **large swings in win%** on small samples.

**What we did not measure:** two teams with **matched CA** and the same lattice. We should expect:

- When quality is **even**, the **quality gap stops dominating**, so the **same tactical edge should matter more in percentage points**.
- It still won’t feel like “chess every week” unless we tune further; the underdog study shows tactics as **marginal gains and damage control**, not overturning a big numbers disadvantage.

So:

- **Big CA gap (Nordstern start):** tactics help you **steal points and avoid bad plans**; they **don’t** make you favorites.  
- **Even teams (hypothesis, not yet studied):** same system should **tip scales more often** — roughly “regularly” in the sense of **meaningful win/draw swing**, not “win every time with the right slider.”

---

## Short recap

1. **Explain tactics:** formation + hidden duty package + three sliders you tune; three savable presets; engine reads full plan.  
2. **Play well:** scout when you can, don’t blindly max press/line as Nordstern, match risk to home/away and table situation; formation change is a **big** reset — use it deliberately.  
3. **Bad team / relegation / growth arc:** aligned with design; tactics are part of “hold on while the squad grows,” not a day-one cheat code.  
4. **Even teams:** plausible that tactics tip outcomes **more often** than for Nordstern; current numbers are **underdog-only** and support **modest** edges, not dominance.
