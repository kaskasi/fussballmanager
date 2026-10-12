# Product analytics setup (Sentry + PostHog)

Optional for local dev; set on **production / playtest** Vite builds.

## Sentry

1. Create a **Browser** project at [sentry.io](https://sentry.io).
2. Copy the **DSN** into deploy env as `VITE_SENTRY_DSN`.
3. CI (optional): upload source maps with `@sentry/cli` using `VITE_APP_BUILD` as release name.

## PostHog (EU)

1. Create project at [posthog.com](https://posthog.com) — choose **EU cloud**.
2. Copy project API key → `VITE_POSTHOG_KEY`.
3. Set `VITE_POSTHOG_HOST=https://eu.i.posthog.com`.

## Client behavior

- Analytics **on by default**; players opt out under **Settings → Privacy**.
- Local **diagnostic log** is independent (Settings → Diagnostics); use **Verbose** + **Copy log** for bug reports.
- PostHog: no autocapture, pageviews, replay, or global error hooks — explicit events only. Sentry: anonymous `user.id` only (device id). Telemetry failures are swallowed so gameplay never blocks on third-party SDKs.

See [qa-analytics.md](qa-analytics.md) for manual QA.
