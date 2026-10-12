import * as Sentry from "@sentry/react";
import posthog from "posthog-js";
import type { ClientPreferences } from "../ui/accessibility.ts";
import type { Screen } from "../ui/shell/types.ts";
import { buildSessionHeaderContext, getOrCreateDeviceId } from "./context.ts";
import {
  Diag,
  setDiagnosticErrorMirror,
  setDiagnosticLogLevel,
  writeDiagnosticSessionHeader,
} from "./diagnostic-log.ts";
import { effectiveDiagnosticLogLevel } from "../ui/accessibility.ts";

let analyticsActive = false;
let posthogActive = false;
let posthogInitialized = false;
let sessionStarted = false;
let posthogConfigNoticeLogged = false;

type PostHogLogAttributes = Record<string, string | number | boolean>;

const posthogLog = {
  info(message: string, attributes: PostHogLogAttributes): void {
    if (posthogActive) safeTelemetry(() => posthog.logger.info(message, attributes));
  },
  warn(message: string, attributes: PostHogLogAttributes): void {
    if (posthogActive) safeTelemetry(() => posthog.logger.warn(message, attributes));
  },
};

function sentryDsn(): string | undefined {
  return import.meta.env.VITE_SENTRY_DSN?.trim() || undefined;
}

function posthogKey(): string | undefined {
  return import.meta.env.VITE_POSTHOG_KEY?.trim() || undefined;
}

function posthogHost(): string | undefined {
  return import.meta.env.VITE_POSTHOG_HOST?.trim() || undefined;
}

/** Never throws — telemetry must not block gameplay or boot. */
function safeTelemetry(run: () => void): void {
  try {
    run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Diag.verbose(`telemetry call failed: ${message}`);
  }
}

function logPostHogConfigGap(): void {
  if (posthogConfigNoticeLogged) return;
  posthogConfigNoticeLogged = true;
  const missing: string[] = [];
  if (!posthogKey()) missing.push("VITE_POSTHOG_KEY");
  if (!posthogHost()) missing.push("VITE_POSTHOG_HOST");
  if (missing.length === 0) return;
  Diag.verbose(`PostHog skipped (missing ${missing.join(", ")})`);
}

function readPostHogConfig(): { ready: true; phKey: string; phHost: string } | { ready: false } {
  const phKey = posthogKey();
  const phHost = posthogHost();
  if (phKey && phHost) return { ready: true, phKey, phHost };
  logPostHogConfigGap();
  return { ready: false };
}

function initSentry(dsn: string, deviceId: string): void {
  safeTelemetry(() => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_BUILD ?? undefined,
      tracesSampleRate: 0,
    });
    Sentry.setUser({ id: deviceId });
    setDiagnosticErrorMirror((message) => {
      safeTelemetry(() => {
        Sentry.addBreadcrumb({ category: "diag", message, level: "error" });
      });
    });
  });
}

function initPostHog(phKey: string, phHost: string, deviceId: string): void {
  safeTelemetry(() => {
    if (!posthogInitialized) {
      posthog.init(phKey, {
        api_host: phHost,
        persistence: "localStorage",
        autocapture: false,
        capture_pageview: false,
        disable_session_recording: true,
        person_profiles: "identified_only",
        logs: {
          serviceName: "the-club-web",
          environment: import.meta.env.MODE,
          serviceVersion: import.meta.env.VITE_APP_BUILD?.trim() || undefined,
        },
        // Explicit capture only — avoid global error hooks (Sentry + boundary handle errors).
        capture_exceptions: {
          capture_unhandled_errors: false,
          capture_unhandled_rejections: false,
          capture_console_errors: false,
        },
      });
      posthogInitialized = true;
    }
    posthog.identify(deviceId);
    posthog.opt_in_capturing();
    posthogActive = true;
  });
}

export function shutdownAnalytics(): void {
  analyticsActive = false;
  posthogActive = false;
  sessionStarted = false;
  setDiagnosticErrorMirror(null);
  if (posthogInitialized) {
    safeTelemetry(() => posthog.opt_out_capturing());
  }
  safeTelemetry(() => {
    Sentry.getClient()?.close();
  });
}

export function initAnalytics(prefs: ClientPreferences): void {
  try {
    shutdownAnalytics();

    const diagLevel = effectiveDiagnosticLogLevel(prefs);
    setDiagnosticLogLevel(diagLevel);

    const deviceId = getOrCreateDeviceId();
    writeDiagnosticSessionHeader(
      buildSessionHeaderContext({ locale: prefs.locale, deviceId }),
    );

    if (!prefs.analyticsEnabled) {
      Diag.verbose("analytics disabled by user");
      return;
    }

    const dsn = sentryDsn();
    const posthogConfig = readPostHogConfig();
    if (!dsn && !posthogConfig.ready) {
      Diag.verbose("analytics skipped (no env keys)");
      return;
    }

    if (dsn) {
      initSentry(dsn, deviceId);
    }

    if (posthogConfig.ready) {
      initPostHog(posthogConfig.phKey, posthogConfig.phHost, deviceId);
      posthogLog.info("PostHog initialized", {
        event: "posthog_initialized",
        environment: import.meta.env.MODE,
      });
    }

    analyticsActive = Boolean(dsn || posthogActive);
    if (!sessionStarted) {
      sessionStarted = true;
      trackEvent("session_start", {
        locale: prefs.locale,
        analytics: true,
      });
    }
  } catch (error) {
    analyticsActive = false;
    posthogActive = false;
    const message = error instanceof Error ? error.message : String(error);
    Diag.error(`analytics init failed: ${message}`);
  }
}

export function isAnalyticsActive(): boolean {
  return analyticsActive;
}

export function logPostHogWarning(message: string, attributes: PostHogLogAttributes): void {
  posthogLog.warn(message, attributes);
}

export function logPostHogInfo(message: string, attributes: PostHogLogAttributes): void {
  posthogLog.info(message, attributes);
}

export function trackScreen(
  screen: Screen,
  props?: { previous_screen?: Screen | null; week_context?: string },
): void {
  Diag.screen(props?.previous_screen ?? null, screen, props?.week_context);
  if (!posthogActive) return;
  safeTelemetry(() => posthog.capture("screen_view", { screen, ...props }));
}

export function trackEvent(name: string, props?: Record<string, string | number | boolean>): void {
  if (name === "save_write_failed") {
    Diag.error(`save_write_failed ${JSON.stringify(props ?? {})}`);
  }
  if (!analyticsActive) return;
  if (posthogActive) {
    safeTelemetry(() => posthog.capture(name, props));
  }
  if (name === "save_write_failed") {
    safeTelemetry(() => {
      Sentry.captureMessage("save_write_failed", { level: "warning", extra: props });
    });
  }
}

export function captureException(error: unknown, context?: Record<string, string>): void {
  const exception = error instanceof Error ? error : new Error(String(error));
  Diag.error(`exception ${exception.message}`);
  if (!analyticsActive) return;
  safeTelemetry(() => Sentry.captureException(exception, { extra: context }));
  if (posthogActive) {
    safeTelemetry(() => posthog.captureException(exception, context));
  }
}

/** @internal Vitest — reset module singletons between cases. */
export function __resetAnalyticsModuleForTests(): void {
  shutdownAnalytics();
  posthogInitialized = false;
  posthogConfigNoticeLogged = false;
}
