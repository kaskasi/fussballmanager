# Manual QA — analytics & diagnostic log

**Context:** Sentry + PostHog (optional env) and local diagnostic ring buffer.

---

## 1. Remote analytics (production deploy with keys)

1. Set `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` on build.
2. Fresh load — PostHog should receive `session_start` and `screen_view` when navigating TEAM screens.
3. Settings → Privacy → turn **off** analytics → reload → no new PostHog events (local diagnostic log still works).

**Privacy (client):** PostHog runs with autocapture, pageviews, session replay, and global exception hooks **off**; only explicit `capture` calls and opt-in PostHog logs. Missing env keys **never** throw — the game boots without remote analytics.

---

## 2. Diagnostic log (always local)

1. Settings → Diagnostics → **Verbose**.
2. Navigate hub → training → settings; preview should show `screen` lines with season/week context.
3. **Copy log** → paste into editor; no sync codes, no save JSON.
4. **Clear log** → preview empty (until next actions).

---

## 3. Persist failure

1. See [qa-save-storage.md](qa-save-storage.md) §1.
2. Expect `save_write_failed` in log at **error** level; optional Sentry/PostHog when analytics on.

---

## 4. React error boundary

1. Dev-only: temporarily throw in a screen render.
2. Expect boundary UI + `[error] exception` in diagnostic log.

---

**Bug reports from testers:** Verbose log + steps; leave analytics on unless they opt out in Settings.
