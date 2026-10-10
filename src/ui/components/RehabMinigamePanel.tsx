import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import {
  rehabHitScore,
  rehabMinigameSuccess,
  rehabPhysioAssistSuccess,
  rehabTimingWindows,
  canUseRehabMinigame,
} from "../../medical/rehab-minigame.ts";
import { useT } from "../../i18n/react.ts";

/** Simple 3-hit timing strip for weekly rehab bonus (PRD F8.2). */
export function RehabMinigamePanel({
  playerId,
  playerName,
  season,
  week,
  masterSeed,
  medicalState,
  onComplete,
  bypassWeeklyCap = false,
  embedded = false,
}: {
  playerId: string;
  playerName: string;
  season: number;
  week: number;
  masterSeed: number;
  medicalState: {
    rehab_minigame_player_ids?: string[];
    rehab_minigame_week?: { season: number; week: number };
  };
  onComplete: (success: boolean) => void;
  /** Physio Mithelfen modal — no weekly rehab bonus cap. */
  bypassWeeklyCap?: boolean;
  embedded?: boolean;
}) {
  const t = useT();
  const windows = useMemo(() => {
    const raw = rehabTimingWindows(masterSeed, season, week, playerId);
    if (!embedded) return raw;
    return raw.map((window) => ({
      ...window,
      width: Math.min(24, window.width + 5),
    }));
  }, [embedded, masterSeed, season, week, playerId]);
  const [hits, setHits] = useState<number[]>([]);
  const [cursor, setCursor] = useState(0);
  const [running, setRunning] = useState(false);

  const allowed =
    bypassWeeklyCap ||
    canUseRehabMinigame(
      medicalState.rehab_minigame_player_ids,
      season,
      week,
      medicalState.rehab_minigame_week,
      playerId,
    );

  const finish = useCallback(
    (finalHits: number[]) => {
      const score = rehabHitScore(windows, finalHits);
      const success = embedded
        ? rehabPhysioAssistSuccess(score, windows.length)
        : rehabMinigameSuccess(score);
      onComplete(success);
      setRunning(false);
      if (!embedded) {
        setHits([]);
        setCursor(0);
      }
    },
    [embedded, onComplete, windows],
  );

  const hitInWindow = useCallback(
    (hit: number, index: number) => {
      const window = windows[index];
      if (!window) return false;
      return Math.abs(hit - window.center) <= window.width / 2;
    },
    [windows],
  );

  const tap = useCallback(() => {
    if (!running || hits.length >= windows.length) return;
    const nextHits = [...hits, cursor];
    setHits(nextHits);
    if (nextHits.length >= windows.length) {
      finish(nextHits);
      return;
    }
  }, [cursor, finish, hits, running, windows.length]);

  if (!allowed) {
    return (
      <p className="medical-muted">{t("medical.rehab.capUsed")}</p>
    );
  }

  return (
    <section
      className={embedded ? "medical-rehab-panel medical-rehab-panel--embedded" : "medical-rehab-panel"}
      aria-label={t("medical.rehab.aria")}
    >
      {!embedded ? (
        <header className="medical-rehab-head">
          <Activity size={18} strokeWidth={2.2} aria-hidden />
          <strong>{t("medical.rehab.title", { name: playerName })}</strong>
        </header>
      ) : null}
      <p className="medical-muted">
        {embedded ? t("medical.physio.rehabTimingHint") : t("medical.rehab.hint")}
      </p>
      {!running ? (
        <button type="button" className="ui-btn ui-btn--sm" onClick={() => setRunning(true)}>
          {t("medical.rehab.start")}
        </button>
      ) : (
        <>
          <div
            className="medical-rehab-track"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(cursor)}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                tap();
              }
            }}
            onClick={tap}
          >
            <div className="medical-rehab-cursor" style={{ left: `${cursor}%` }} />
            {hits.map((hit, index) => (
              <div
                key={`hit-${index}-${hit}`}
                className={
                  hitInWindow(hit, index) ? "medical-rehab-hit is-good" : "medical-rehab-hit is-miss"
                }
                style={{ left: `${hit}%` }}
                aria-hidden
              />
            ))}
            {windows.map((window, index) => (
              <div
                key={index}
                className="medical-rehab-window"
                style={{
                  left: `${window.center - window.width / 2}%`,
                  width: `${window.width}%`,
                }}
              />
            ))}
          </div>
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={tap}>
            {t("medical.rehab.tap")} ({hits.length}/{windows.length})
          </button>
        </>
      )}
      {running ? (
        <RehabCursorLoop onTick={setCursor} relaxed={embedded} />
      ) : null}
    </section>
  );
}

function RehabCursorLoop({
  onTick,
  relaxed = false,
}: {
  onTick: (value: number) => void;
  relaxed?: boolean;
}) {
  useEffect(() => {
    let dir = 1;
    let pos = 0;
    const step = relaxed ? 1.25 : 2.4;
    const intervalMs = relaxed ? 42 : 32;
    const id = window.setInterval(() => {
      pos += dir * step;
      if (pos >= 100) {
        pos = 100;
        dir = -1;
      }
      if (pos <= 0) {
        pos = 0;
        dir = 1;
      }
      onTick(pos);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [onTick, relaxed]);
  return null;
}
