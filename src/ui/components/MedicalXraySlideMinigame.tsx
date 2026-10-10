import { useCallback, useRef, useState } from "react";
import type { BodyRegion } from "../../medical/medical-symptoms.ts";
import {
  BODY_REGION_LAMP_X,
  BODY_REGION_MARK_Y,
  xrayLampAligned,
} from "../../medical/physio-assist.ts";
import { useT } from "../../i18n/react.ts";

/** Slide the X-ray lamp horizontally above a player lying on a table. */
export function MedicalXraySlideMinigame({
  targetRegion,
  onSuccess,
}: {
  targetRegion: BodyRegion;
  onSuccess: () => void;
}) {
  const t = useT();
  const trackRef = useRef<HTMLDivElement>(null);
  const [lampX, setLampX] = useState(8);
  const targetX = BODY_REGION_LAMP_X[targetRegion];
  const markY = BODY_REGION_MARK_Y[targetRegion];

  const updateFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    setLampX(Math.min(100, Math.max(0, ratio * 100)));
  }, []);

  const tryFinish = useCallback(
    (x: number) => {
      if (xrayLampAligned(x, targetX)) onSuccess();
    },
    [onSuccess, targetX],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    updateFromClientX(event.clientX);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const x = Math.min(100, Math.max(0, ratio * 100));
    setLampX(x);
    tryFinish(x);
  };

  const aligned = xrayLampAligned(lampX, targetX);

  return (
    <div className="medical-xray-minigame">
      <p className="medical-muted">{t("medical.physio.xrayHint")}</p>
      <div
        ref={trackRef}
        className="medical-xray-track medical-xray-track--horizontal"
        role="application"
        aria-label={t("medical.physio.xrayAria")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className={aligned ? "medical-xray-lamp medical-xray-lamp--over is-aligned" : "medical-xray-lamp medical-xray-lamp--over"}
          style={{ left: `${lampX}%` }}
          aria-hidden
        >
          <div className="medical-xray-lamp-head" />
          <div className="medical-xray-beam medical-xray-beam--down" />
        </div>
        <svg className="medical-xray-player medical-xray-player--horizontal" viewBox="0 0 100 56" aria-hidden>
          <rect x="4" y="38" width="92" height="14" rx="3" className="medical-xray-table" />
          <ellipse cx="14" cy="32" rx="8" ry="9" className="medical-body-silhouette" />
          <rect x="22" y="28" width="28" height="10" rx="4" className="medical-body-silhouette" />
          <line x1="50" y1="31" x2="68" y2="31" className="medical-body-limb" />
          <line x1="68" y1="31" x2="82" y2="31" className="medical-body-limb" />
          <line x1="82" y1="31" x2="90" y2="31" className="medical-body-limb" />
          <line x1="30" y1="38" x2="28" y2="44" className="medical-body-limb" />
          <line x1="58" y1="38" x2="56" y2="44" className="medical-body-limb" />
          <circle cx={targetX} cy={markY} r="4.5" className="medical-xray-mark" />
        </svg>
      </div>
      <p className="medical-xray-status" role="status">
        {aligned ? t("medical.physio.xrayAligned") : t("medical.physio.xrayMove")}
      </p>
    </div>
  );
}
