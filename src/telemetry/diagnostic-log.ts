import type { Screen } from "../ui/shell/types.ts";

export type DiagnosticLogLevel = "off" | "error" | "verbose";

export const DIAG_LEVEL_ORDER: Record<DiagnosticLogLevel, number> = {
  off: 0,
  error: 1,
  verbose: 2,
};

const MAX_LINES = 400;
const DISPLAY_CAP = 200;

type LogSeverity = "error" | "verbose";

interface LogLine {
  at: string;
  severity: LogSeverity;
  message: string;
}

let level: DiagnosticLogLevel = "error";
let sessionHeaderWritten = false;
const lines: LogLine[] = [];
const listeners = new Set<() => void>();

let mirrorErrorToRemote: ((message: string) => void) | null = null;

export function setDiagnosticLogLevel(next: DiagnosticLogLevel): void {
  level = next;
}

export function getDiagnosticLogLevel(): DiagnosticLogLevel {
  return level;
}

export function setDiagnosticErrorMirror(handler: ((message: string) => void) | null): void {
  mirrorErrorToRemote = handler;
}

export function subscribeDiagnosticLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function shouldLog(severity: LogSeverity): boolean {
  if (level === "off") return false;
  if (severity === "error") return DIAG_LEVEL_ORDER[level] >= DIAG_LEVEL_ORDER.error;
  return level === "verbose";
}

function append(severity: LogSeverity, message: string): void {
  if (!shouldLog(severity)) return;
  lines.push({ at: new Date().toISOString(), severity, message });
  while (lines.length > MAX_LINES) {
    lines.shift();
  }
  if (severity === "error" && mirrorErrorToRemote) {
    mirrorErrorToRemote(message);
  }
  notify();
}

export function writeDiagnosticSessionHeader(header: string): void {
  if (sessionHeaderWritten || level === "off") return;
  sessionHeaderWritten = true;
  lines.unshift({ at: new Date().toISOString(), severity: "verbose", message: `# session ${header}` });
  while (lines.length > MAX_LINES) lines.shift();
  notify();
}

export function clearDiagnosticLog(): void {
  lines.length = 0;
  sessionHeaderWritten = false;
  notify();
}

const SYNC_CODE_PATTERN = /fuss-[a-z0-9]{4}-[a-z0-9]{4}/gi;

export function formatDiagnosticLogForExport(inputLines: readonly LogLine[] = lines): string {
  return inputLines
    .map((line) => {
      let text = `${line.at} [${line.severity}] ${line.message}`;
      text = text.replace(SYNC_CODE_PATTERN, "fuss-****-****");
      if (text.length > 500) text = `${text.slice(0, 497)}...`;
      return text;
    })
    .join("\n");
}

export function getDiagnosticLogPreview(): string {
  const slice = lines.length > DISPLAY_CAP ? lines.slice(lines.length - DISPLAY_CAP) : lines;
  return formatDiagnosticLogForExport(slice);
}

export function getDiagnosticLogLineCount(): number {
  return lines.length;
}

export const Diag = {
  error(message: string): void {
    append("error", message);
  },
  verbose(message: string): void {
    append("verbose", message);
  },
  screen(from: Screen | null, to: Screen, context?: string): void {
    const ctx = context ? ` ${context}` : "";
    append("verbose", `screen ${from ?? "—"} → ${to}${ctx}`);
  },
  persist(ok: boolean, slot: number, detail?: string): void {
    const suffix = detail ? ` ${detail}` : "";
    append(ok ? "verbose" : "error", `persist ${ok ? "ok" : "fail"} slot=${slot}${suffix}`);
  },
  next(action: string): void {
    append("verbose", `next ${action}`);
  },
  saveAction(action: string, slot?: number): void {
    append("verbose", `save ${action}${slot !== undefined ? ` slot=${slot}` : ""}`);
  },
  cloud(action: string, ok: boolean): void {
    append(ok ? "verbose" : "error", `cloud ${action} ${ok ? "ok" : "fail"}`);
  },
};
