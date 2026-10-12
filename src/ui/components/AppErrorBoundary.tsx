import { Component, type ErrorInfo, type ReactNode } from "react";
import { t } from "../../i18n/index.ts";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Keeps a playtest session usable when a screen throws during render. */
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("App render error", error, info.componentStack);
    void import("../../telemetry/analytics.ts").then(({ captureException }) => {
      captureException(error, { component_stack: info.componentStack?.slice(0, 200) ?? "" });
    });
  }

  private reload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }
    const detail = this.state.error?.message?.trim();
    return (
      <div className="app-error-boundary" role="alert">
        <p>{t("shell.crashMessage")}</p>
        {detail ? (
          <p className="app-error-boundary-detail">
            <code>{detail.slice(0, 240)}</code>
          </p>
        ) : null}
        <button type="button" className="btn btn-secondary" onClick={this.reload}>
          {t("shell.crashReload")}
        </button>
      </div>
    );
  }
}
