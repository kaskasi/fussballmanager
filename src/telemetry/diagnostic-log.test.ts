import { describe, expect, it, beforeEach } from "vitest";
import {
  clearDiagnosticLog,
  Diag,
  formatDiagnosticLogForExport,
  getDiagnosticLogPreview,
  setDiagnosticLogLevel,
} from "./diagnostic-log.ts";

beforeEach(() => {
  clearDiagnosticLog();
  setDiagnosticLogLevel("verbose");
});

describe("diagnostic log", () => {
  it("records verbose and error lines", () => {
    Diag.verbose("hello");
    Diag.error("boom");
    const text = getDiagnosticLogPreview();
    expect(text).toContain("[verbose] hello");
    expect(text).toContain("[error] boom");
  });

  it("respects off level", () => {
    setDiagnosticLogLevel("off");
    Diag.error("hidden");
    expect(getDiagnosticLogPreview()).toBe("");
  });

  it("redacts sync codes on export", () => {
    Diag.verbose("code fuss-abcd-efgh here");
    const exported = formatDiagnosticLogForExport();
    expect(exported).toContain("fuss-****-****");
    expect(exported).not.toContain("fuss-abcd-efgh");
  });
});
