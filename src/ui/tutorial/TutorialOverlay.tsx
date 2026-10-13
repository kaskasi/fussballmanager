/** WIREFRAME: PRD 25 — coach mark overlay (design.md panel + tinte outline) */
import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { BookOpen, Check, Circle } from "lucide-react";
import type { ResolvedTutorialStep } from "../../tutorial/index.ts";
import {
  COACH_TARGET,
  isMissionComplete,
  phase1DeskTrackComplete,
  TUTORIAL_MISSIONS,
} from "../../tutorial/index.ts";
import type { StoryState } from "../../narrative/story-state.ts";
import { useT } from "../../i18n/react.ts";

export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measureTarget(targetId: string): TargetRect | null {
  const el = document.querySelector(`[data-coach-target="${targetId}"]`);
  if (!el || !(el instanceof HTMLElement)) return null;
  el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

export function TutorialOverlay({
  step,
  storyState,
  onContinue,
  onDismissScreen,
  onDisableAll,
  onLater,
  dismissScreenChecked,
  onDismissScreenCheckedChange,
}: {
  step: ResolvedTutorialStep;
  storyState: StoryState;
  onContinue: () => void;
  onDismissScreen: () => void;
  onDisableAll: () => void;
  onLater: () => void;
  dismissScreenChecked: boolean;
  onDismissScreenCheckedChange: (value: boolean) => void;
}) {
  const t = useT();
  const { definition, bodyKey, bodyParams } = step;
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const targetId = definition.target ?? null;

  useLayoutEffect(() => {
    if (definition.mode !== "spotlight" || !targetId) {
      setTargetRect(null);
      return;
    }
    const update = () => setTargetRect(measureTarget(targetId));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [definition.mode, targetId, definition.id]);

  useEffect(() => {
    if (definition.mode !== "spotlight" || !targetId || !definition.completeOnTargetClick) {
      return;
    }
    const el = document.querySelector(`[data-coach-target="${targetId}"]`);
    if (!el) return;
    const handler = () => {
      onContinue();
    };
    el.addEventListener("click", handler, { capture: true, once: true });
    return () => el.removeEventListener("click", handler, { capture: true });
  }, [definition, targetId, onContinue]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onLater();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onLater]);

  const title = t(definition.titleKey);
  const body = t(bodyKey, bodyParams);
  const showMissionChecklist = !phase1DeskTrackComplete(storyState);

  const anchorHeaderNext =
    definition.mode === "spotlight" && targetId === COACH_TARGET.headerNext;

  const panelStyle = useMemo((): CSSProperties | undefined => {
    if (!anchorHeaderNext) return undefined;
    if (targetRect) {
      const targetRight = targetRect.left + targetRect.width;
      return {
        top: targetRect.top + targetRect.height + 18,
        right: Math.max(12, window.innerWidth - targetRight),
        left: "auto",
        transform: "none",
        maxWidth: Math.min(420, Math.max(280, targetRight - 16)),
      };
    }
    return {
      top: "5.75rem",
      right: "1rem",
      left: "auto",
      transform: "none",
    };
  }, [anchorHeaderNext, targetRect]);

  const spotlight =
    definition.mode === "spotlight" && targetRect ? (
      <div
        className="tutorial-coach-spotlight"
        style={{
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
        }}
        aria-hidden
      />
    ) : definition.mode === "spotlight" ? (
      <div className="tutorial-coach-scrim tutorial-coach-scrim--full" aria-hidden />
    ) : null;

  const scrim =
    definition.mode === "panel" ? (
      <div className="tutorial-coach-scrim tutorial-coach-scrim--full" aria-hidden />
    ) : null;

  return (
    <div className="tutorial-coach-root" role="presentation">
      {scrim}
      {spotlight}
      <div
        className={
          anchorHeaderNext
            ? "tutorial-coach-panel tutorial-coach-panel--below-header"
            : "tutorial-coach-panel tutorial-coach-panel--center"
        }
        style={panelStyle}
        role="dialog"
        aria-labelledby="tutorial-coach-title"
        aria-describedby="tutorial-coach-body"
      >
        <div className="tutorial-coach-panel-head">
          <BookOpen size={22} strokeWidth={2} aria-hidden />
          <h2 id="tutorial-coach-title">{title}</h2>
        </div>
        <p id="tutorial-coach-body" className="tutorial-coach-body">
          {body}
        </p>
        {showMissionChecklist ? (
          <ul className="tutorial-coach-missions" aria-label={t("tutorial.missions.aria")}>
            {TUTORIAL_MISSIONS.map((mission) => {
              const done = isMissionComplete(storyState, mission);
              return (
                <li
                  key={mission.id}
                  className={done ? "tutorial-coach-mission is-done" : "tutorial-coach-mission is-pending"}
                >
                  {done ? (
                    <Check size={14} strokeWidth={2.5} className="tutorial-coach-mission-icon" aria-hidden />
                  ) : (
                    <Circle size={14} strokeWidth={2} className="tutorial-coach-mission-icon" aria-hidden />
                  )}
                  <span>{t(mission.labelKey)}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
        <label className="tutorial-coach-dismiss-row">
          <input
            type="checkbox"
            checked={dismissScreenChecked}
            onChange={(event) => onDismissScreenCheckedChange(event.target.checked)}
          />
          <span>{t("tutorial.dismissScreen")}</span>
        </label>
        <div className="tutorial-coach-actions">
          <button type="button" className="save-modal-btn" onClick={onLater}>
            {t("tutorial.later")}
          </button>
          <button
            type="button"
            className="save-modal-btn tutorial-coach-primary"
            onClick={() => {
              if (dismissScreenChecked) onDismissScreen();
              onContinue();
            }}
          >
            {definition.mode === "spotlight" && definition.completeOnTargetClick
              ? t("tutorial.gotIt")
              : t("tutorial.continue")}
          </button>
        </div>
        <button type="button" className="tutorial-coach-disable-all" onClick={onDisableAll}>
          {t("tutorial.disableAll")}
        </button>
      </div>
    </div>
  );
}
