/** WIREFRAME: storyboard opening POC — dev-only (?storyboard=poc) */
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  STORYBOARD_POC_SEQUENCES,
  type StoryboardPocSequenceId,
  storyboardPocPanelUrl,
} from "../../narrative/storyboard-poc-sequence.ts";
import { useT } from "../../i18n/react.ts";
import { t } from "../../i18n/index.ts";

const SEQUENCE_IDS = Object.keys(STORYBOARD_POC_SEQUENCES) as StoryboardPocSequenceId[];

function closePoc() {
  const url = new URL(window.location.href);
  url.searchParams.delete("storyboard");
  window.location.replace(url.pathname + url.search + url.hash);
}

export function StoryboardPocScreen() {
  const tr = useT();
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const [sequenceId, setSequenceId] = useState<StoryboardPocSequenceId>("passionate_letter");
  const sequence = STORYBOARD_POC_SEQUENCES[sequenceId];
  const [index, setIndex] = useState(0);

  const frames = sequence.frames;
  const frame = frames[index]!;
  const atEnd = index >= frames.length - 1;

  const onPickSequence = (id: StoryboardPocSequenceId) => {
    setSequenceId(id);
    setIndex(0);
  };

  if (reducedMotion) {
    return (
      <main className="storyboard-poc storyboard-poc--reduced" aria-label={tr("storyboard.poc.aria")}>
        <header className="storyboard-poc-head">
          <h1>{tr("storyboard.poc.title")}</h1>
          <button type="button" className="storyboard-poc-close" onClick={closePoc} aria-label={t("shell.modal.close")}>
            <X size={20} aria-hidden />
          </button>
        </header>
        <p className="storyboard-poc-note">{tr("storyboard.poc.reducedMotion")}</p>
        <a className="storyboard-poc-contact" href="/assets/storyboard-poc/contact-sheet.svg" target="_blank" rel="noreferrer">
          {tr("storyboard.poc.contactSheet")}
        </a>
        <ul className="storyboard-poc-grid">
          {frames.map((f) => (
            <li key={f.panelId}>
              <img src={storyboardPocPanelUrl(f.panelId)} alt="" />
              <p>{tr(f.captionKey)}</p>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  return (
    <main className="storyboard-poc" aria-label={tr("storyboard.poc.aria")}>
      <header className="storyboard-poc-head">
        <h1>{tr("storyboard.poc.title")}</h1>
        <button type="button" className="storyboard-poc-close" onClick={closePoc} aria-label={t("shell.modal.close")}>
          <X size={20} aria-hidden />
        </button>
      </header>

      <div className="storyboard-poc-seq" role="tablist" aria-label={tr("storyboard.poc.seq.aria")}>
        {SEQUENCE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={sequenceId === id}
            className={sequenceId === id ? "storyboard-poc-seq-btn is-active" : "storyboard-poc-seq-btn"}
            onClick={() => onPickSequence(id)}
          >
            {tr(STORYBOARD_POC_SEQUENCES[id].labelKey)}
          </button>
        ))}
      </div>

      <figure className="storyboard-poc-panel">
        <img
          key={frame.panelId}
          className="storyboard-poc-art"
          src={storyboardPocPanelUrl(frame.panelId)}
          alt=""
        />
        <figcaption className="storyboard-poc-caption">{tr(frame.captionKey)}</figcaption>
        <p className="storyboard-poc-progress">
          {tr("storyboard.poc.progress", { current: index + 1, total: frames.length })}
        </p>
      </figure>

      <footer className="storyboard-poc-actions">
        <button
          type="button"
          className="storyboard-poc-btn"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft size={18} aria-hidden />
          {tr("storyboard.poc.back")}
        </button>
        {atEnd ? (
          <button type="button" className="storyboard-poc-btn storyboard-poc-btn-primary" onClick={closePoc}>
            {tr("storyboard.poc.done")}
          </button>
        ) : (
          <button type="button" className="storyboard-poc-btn storyboard-poc-btn-primary" onClick={() => setIndex((i) => i + 1)}>
            {tr("storyboard.poc.next")}
            <ChevronRight size={18} aria-hidden />
          </button>
        )}
        <button type="button" className="storyboard-poc-btn storyboard-poc-skip" onClick={closePoc}>
          {tr("storyboard.poc.skip")}
        </button>
      </footer>
    </main>
  );
}

export function isStoryboardPocUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("storyboard") === "poc";
}
