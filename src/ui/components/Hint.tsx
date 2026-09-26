import { useEffect, useRef, useState, type ReactNode } from "react";

const HINT_DELAY_MS = 3000;

export function Hint({
  text,
  children,
  block = false,
}: {
  text: string;
  children: ReactNode;
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function showLater() {
    clearTimer();
    timer.current = setTimeout(() => setOpen(true), HINT_DELAY_MS);
  }

  function hide() {
    clearTimer();
    setOpen(false);
  }

  useEffect(() => () => clearTimer(), []);

  return (
    <span
      className={block ? "hint hint-block" : "hint"}
      onMouseEnter={showLater}
      onMouseLeave={hide}
      onFocus={showLater}
      onBlur={hide}
    >
      {children}
      {open ? <span className="hint-popover" role="tooltip">{text}</span> : null}
    </span>
  );
}
