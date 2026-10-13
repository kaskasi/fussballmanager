/** WIREFRAME: PRD 25 — coach mark overlay (design.md panel + tinte outline) */
import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { BookOpen, Check, ChevronDown, ChevronUp, Circle } from "lucide-react";
import type { ResolvedTutorialStep } from "../../tutorial/index.ts";
import {
  COACH_TARGET,
  currentTutorialMission,
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

function unionRects(a: TargetRect, b: TargetRect): TargetRect {
  const top = Math.min(a.top, b.top);
  const left = Math.min(a.left, b.left);
  const right = Math.max(a.left + a.width, b.left + b.width);
  const bottom = Math.max(a.top + a.height, b.top + b.height);
  return { top, left, width: right - left, height: bottom - top };
}

/** Steps that complete via gameplay — no Continue (avoids skipping ahead). */
const STEPS_WITHOUT_CONTINUE = new Set(["training.set_plan"]);

function panelPlacementForStep(
  stepId: string,
  targetId: string | null,
): "center" | "below-header" | "corner-bl" | "below-target" {
  if (targetId === COACH_TARGET.headerNext) return "below-header";
  if (
    stepId === "training.set_plan" ||
    stepId === "training.today_sessions" ||
    targetId === COACH_TARGET.trainingPickSlot ||
    targetId === COACH_TARGET.trainingUnitPicker
  ) {
    return "corner-bl";
  }
  if (targetId === COACH_TARGET.trainingTodayColumn) return "corner-bl";
  return "center";
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
  const [missionsOpen, setMissionsOpen] = useState(false);

  const targetId = definition.target ?? null;
  const placement = panelPlacementForStep(definition.id, targetId);
  const hideContinue = STEPS_WITHOUT_CONTINUE.has(definition.id);
  const interactiveTraining = definition.id === "training.set_plan";

  useLayoutEffect(() => {
    if (definition.mode !== "spotlight" || !targetId) {
      setTargetRect(null);
      return;
    }
    const update = () => {
      let rect = measureTarget(targetId);
      if (definition.id === "training.set_plan") {
        const pickerRect = measureTarget(COACH_TARGET.trainingUnitPicker);
        if (rect && pickerRect) rect = unionRects(rect, pickerRect);
        else if (pickerRect) rect = pickerRect;
      }
      setTargetRect(rect);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const poll = window.setInterval(update, 200);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(poll);
    };
  }, [definition.mode, targetId, definition.id]);

  useEffect(() => {
    document.documentElement.dataset.tutorialCoachStep = definition.id;
    return () => {
      delete document.documentElement.dataset.tutorialCoachStep;
    };
  }, [definition.id]);

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
  const currentMission = currentTutorialMission(storyState);
  const collapsedMissionLabel = currentMission
    ? t(currentMission.labelKey)
    : t("tutorial.missions.allDone");

  const panelStyle = useMemo((): CSSProperties | undefined => {
    if (placement === "corner-bl") {
      return {
        bottom: "max(1rem, env(safe-area-inset-bottom))",
        left: "max(1rem, env(safe-area-inset-left))",
        top: "auto",
        right: "auto",
        transform: "none",
        maxWidth: "min(340px, calc(100vw - 2rem))",
      };
    }
    if (placement !== "below-header") return undefined;
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
  }, [placement, targetRect]);

  const panelClass =
    placement === "corner-bl"
      ? "tutorial-coach-panel tutorial-coach-panel--corner-bl"
      : placement === "below-header"
        ? "tutorial-coach-panel tutorial-coach-panel--below-header"
        : "tutorial-coach-panel tutorial-coach-panel--center";

  const spotlightClass =
    interactiveTraining || targetId === COACH_TARGET.trainingPickSlot
      ? "tutorial-coach-spotlight tutorial-coach-spotlight--emphasis"
      : "tutorial-coach-spotlight";

  const spotlight =
    definition.mode === "spotlight" && targetRect ? (
      <div
        className={spotlightClass}
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
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
    <div
      className={
        interactiveTraining ? "tutorial-coach-root tutorial-coach-root--interactive" : "tutorial-coach-root"
      }
      role="presentation"
    >
      {scrim}
      {spotlight}
      <div
        className={panelClass}
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
          <div className="tutorial-coach-missions-wrap">
            <button
              type="button"
              className="tutorial-coach-missions-toggle"
              aria-expanded={missionsOpen}
              onClick={() => setMissionsOpen((open) => !open)}
            >
              <span className="tutorial-coach-missions-toggle-label">{collapsedMissionLabel}</span>
              {missionsOpen ? (
                <ChevronUp size={16} strokeWidth={2.5} aria-hidden />
              ) : (
                <ChevronDown size={16} strokeWidth={2.5} aria-hidden />
              )}
            </button>
            {missionsOpen ? (
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
          </div>
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
          {hideContinue ? null : (
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
          )}
        </div>
        <button type="button" className="tutorial-coach-disable-all" onClick={onDisableAll}>
          {t("tutorial.disableAll")}
        </button>
      </div>
    </div>
  );
}
