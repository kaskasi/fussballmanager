import { beforeEach, describe, expect, it, vi } from "vitest";

const { posthogInit, posthogCapture, sentryInit } = vi.hoisted(() => ({
  posthogInit: vi.fn(),
  posthogCapture: vi.fn(),
  sentryInit: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: {
    init: posthogInit,
    identify: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    capture: posthogCapture,
    captureException: vi.fn(),
    logger: { info: vi.fn(), warn: vi.fn() },
    getClient: vi.fn(),
  },
}));

vi.mock("@sentry/react", () => ({
  init: sentryInit,
  setUser: vi.fn(),
  getClient: vi.fn(() => ({ close: vi.fn() })),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

import {
  __resetAnalyticsModuleForTests,
  initAnalytics,
  trackEvent,
} from "./analytics.ts";
import type { ClientPreferences } from "../ui/accessibility.ts";

const basePrefs: ClientPreferences = {
  locale: "en",
  localeChosen: true,
  textScale: "default",
  colorScheme: "default",
  analyticsEnabled: true,
  diagnosticLogLevel: "error",
};

describe("analytics", () => {
  beforeEach(() => {
    __resetAnalyticsModuleForTests();
    posthogInit.mockClear();
    posthogCapture.mockClear();
    sentryInit.mockClear();
    vi.unstubAllEnvs();
  });

  it("does not throw when PostHog env is missing", () => {
    expect(() => initAnalytics(basePrefs)).not.toThrow();
  });

  it("does not throw when trackEvent runs with analytics inactive", () => {
    initAnalytics({ ...basePrefs, analyticsEnabled: false });
    expect(() => trackEvent("test_event")).not.toThrow();
  });

  it("passes privacy defaults to posthog.init when keys are set", () => {
    vi.stubEnv("VITE_POSTHOG_KEY", "phc_test_key");
    vi.stubEnv("VITE_POSTHOG_HOST", "https://eu.i.posthog.com");
    vi.stubEnv("VITE_SENTRY_DSN", "");

    initAnalytics(basePrefs);

    expect(posthogInit).toHaveBeenCalled();
    const options = posthogInit.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(options.autocapture).toBe(false);
    expect(options.capture_pageview).toBe(false);
    expect(options.disable_session_recording).toBe(true);
    expect(options.person_profiles).toBe("identified_only");
    const captureExceptions = options.capture_exceptions as Record<string, boolean>;
    expect(captureExceptions.capture_unhandled_errors).toBe(false);
    expect(captureExceptions.capture_unhandled_rejections).toBe(false);

    vi.unstubAllEnvs();
  });
});
