import { useCallback, useRef, useState } from "react";
import type { CareerMatchSetup } from "../../sim/career-match-setup.ts";
import type { NavPrimaryAction } from "../nav-primary-action.ts";

/** Career matchday UI state (lineup / live / report) — extracted from App. */
export function useCareerMatchFlow() {
  const [careerMatchSetup, setCareerMatchSetup] = useState<CareerMatchSetup | null>(null);
  const [careerMatchUiVisible, setCareerMatchUiVisible] = useState(true);
  const careerMatchInLineupRef = useRef(true);
  const matchLineupPrepKeyRef = useRef<string | null>(null);
  const careerMatchFlowRef = useRef(false);
  const [matchNavAction, setMatchNavActionState] = useState<NavPrimaryAction | null>(null);
  const matchNavActionRef = useRef<NavPrimaryAction | null>(null);
  const [matchSkipToReport, setMatchSkipToReport] = useState<(() => void) | null>(null);

  const setMatchNavAction = useCallback((action: NavPrimaryAction | null) => {
    matchNavActionRef.current = action;
    setMatchNavActionState((prev) => {
      const same =
        prev === action ||
        (prev != null &&
          action != null &&
          prev.label === action.label &&
          prev.disabled === action.disabled &&
          prev.title === action.title);
      return same ? prev : action;
    });
  }, []);

  const registerMatchSkipToReport = useCallback((handler: (() => void) | null) => {
    if (handler === null) {
      setMatchSkipToReport(null);
      return;
    }
    setMatchSkipToReport(() => handler);
  }, []);

  return {
    careerMatchSetup,
    setCareerMatchSetup,
    careerMatchUiVisible,
    setCareerMatchUiVisible,
    careerMatchInLineupRef,
    matchLineupPrepKeyRef,
    careerMatchFlowRef,
    matchNavAction,
    matchNavActionRef,
    setMatchNavAction,
    matchSkipToReport,
    registerMatchSkipToReport,
  };
}
