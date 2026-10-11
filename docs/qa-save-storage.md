# Manual QA — save storage, cloud sync, transient UI

**Context:** Post-refactor audit footguns (local write fail, cloud LWW, slot switch).  
**Not automated** — run before releases that touch persistence or shell bootstrap.

---

## 1. localStorage quota / write failure

1. Open DevTools → Application → Storage → set **localStorage** quota low (Chrome: simulate via private mode + fill storage, or block third-party storage).
2. Play until a spend or week advance triggers `tryWriteLocalSave`.
3. **Expect:** warning toast (`shell.saveWriteFailed` or equivalent); UI may show in-memory state.
4. **Reload tab.**
5. **Expect:** disk state wins — recent ghost progress **not** persisted (known P0; document if behavior differs).

---

## 2. Cloud push / pull (M1, if enabled)

Build must have `VITE_SUPABASE_*` configured. See [ops-cloud-save-m1.md](ops-cloud-save-m1.md).

| Step | Action | Expect |
|------|--------|--------|
| A | Device A: activate cloud on slot 1, play one week, wait for push | Cloud `updated_at` advances |
| B | Device B: same sync code, **Von Cloud laden** | Full replace of slot; same week/season |
| C | Device A: play locally **without** successful write (see §1), then pull on B | B may overwrite with older cloud blob — no merge UI (LWW) |
| D | Import/export JSON with **wrong** `save_version` | Reject message per PRD 08.10 |

---

## 3. Slot switch + `clearTransientUi`

1. Open player profile or foreign profile overlay on slot 1.
2. Open **Spielstände** → switch to slot 2 (or empty slot → new game).
3. **Expect:** profile overlays closed, postfach focus cleared, no stale modal from prior slot ([`clearTransientUi`](../src/ui/shell/bootstrap.ts)).

---

## 4. Hub week autoplay

1. Stay on **Manager Desk** hub; press header **NEXT** once (autoplay starts).
2. Confirm no redirect to Calendar/Training during routine day steps.
3. Press **NEXT** again to pause; reload tab and confirm save state matches disk.

---

## 5. Bootstrap after corrupt / version mismatch slot

1. DevTools → Application → edit `fm_save_slot_1` JSON to `"save_version": 1` in manifest (or invalid JSON).
2. Reload app with slot 1 active.
3. **Expect:** fresh game or empty slot path — no half-hydrated session (PRD 08.10).

---

**Sign-off:** Tester initials, build URL/hash, date.
