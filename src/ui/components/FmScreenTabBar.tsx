import type { ComponentPropsWithoutRef, ReactNode } from "react";

/** Screen-level fm2001 tab band; `.fm-tab__vlabel` wraps the label; mobile shows a horizontal segmented band via CSS. */
export function FmScreenTabBar({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  const classes = ["fm-tab-bar", "fm-tab-bar--screen-tabs", className].filter(Boolean).join(" ");
  return <div className={classes} {...props} />;
}

export function FmScreenTab({
  className,
  children,
  title,
  ...props
}: ComponentPropsWithoutRef<"button"> & { children: ReactNode }) {
  const classes = ["fm-tab", className].filter(Boolean).join(" ");
  const label =
    typeof children === "string" || typeof children === "number" ? String(children) : undefined;
  return (
    <button
      type="button"
      className={classes}
      title={title ?? label}
      {...props}
    >
      <span className="fm-tab__vlabel">{children}</span>
    </button>
  );
}
