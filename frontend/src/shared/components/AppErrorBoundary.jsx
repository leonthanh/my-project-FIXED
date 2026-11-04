import React from "react";

const AUTO_RECOVERY_KEY = "app-error-boundary:auto-recovery";
const AUTO_RECOVERY_LIMIT = 2;
const AUTO_RECOVERY_WINDOW_MS = 15000;
const AUTO_RECOVERY_DELAY_MS = 180;
const STABLE_SESSION_CLEAR_MS = 10000;

const readAutoRecoveryState = () => {
  if (typeof window === "undefined") return null;

  try {
    const rawState = sessionStorage.getItem(AUTO_RECOVERY_KEY);
    return rawState ? JSON.parse(rawState) : null;
  } catch (error) {
    console.warn("Unable to read app recovery state:", error);
    return null;
  }
};

const writeAutoRecoveryState = (nextState) => {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(AUTO_RECOVERY_KEY, JSON.stringify(nextState));
  } catch (error) {
    console.warn("Unable to persist app recovery state:", error);
  }
};

const clearAutoRecoveryState = () => {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(AUTO_RECOVERY_KEY);
};

class AppErrorBoundary extends React.Component {
  static performAppReload() {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  constructor(props) {
    super(props);
    this.state = { hasError: false, recoveryFailed: false };
    this.recoveryTimer = null;
    this.stableTimer = null;
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidMount() {
    if (typeof window === "undefined") return;

    this.stableTimer = window.setTimeout(() => {
      clearAutoRecoveryState();
    }, STABLE_SESSION_CLEAR_MS);
  }

  componentDidCatch(error, info) {
    // Keep logging in console for debugging while avoiding a blank white page for users.
    console.error("App crash:", error, info);
    this.scheduleAutoRecovery();
  }

  componentWillUnmount() {
    if (this.recoveryTimer) {
      window.clearTimeout(this.recoveryTimer);
    }
    if (this.stableTimer) {
      window.clearTimeout(this.stableTimer);
    }
  }

  scheduleAutoRecovery = () => {
    if (typeof window === "undefined" || this.recoveryTimer) return;

    if (this.stableTimer) {
      window.clearTimeout(this.stableTimer);
      this.stableTimer = null;
    }

    const now = Date.now();
    const currentState = readAutoRecoveryState();
    const isExpired = !currentState?.firstAt || now - currentState.firstAt > AUTO_RECOVERY_WINDOW_MS;
    const nextState = isExpired
      ? { count: 1, firstAt: now }
      : { count: (currentState.count || 0) + 1, firstAt: currentState.firstAt };

    writeAutoRecoveryState(nextState);

    this.recoveryTimer = window.setTimeout(() => {
      if (nextState.count <= AUTO_RECOVERY_LIMIT) {
        AppErrorBoundary.performAppReload();
        return;
      }

      this.setState({ recoveryFailed: true });
    }, AUTO_RECOVERY_DELAY_MS);
  }

  handleRetry = () => {
    clearAutoRecoveryState();
    AppErrorBoundary.performAppReload();
  };

  handleHome = () => {
    clearAutoRecoveryState();
    window.location.assign("/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#f8fafc",
            display: "grid",
            placeItems: "center",
          }}
          aria-live="polite"
          aria-busy={!this.state.recoveryFailed}
        >
          {this.state.recoveryFailed ? (
            <div role="alert" style={{ textAlign: "center", padding: 24 }}>
              <p>Trang gặp lỗi và không thể tự khôi phục. Phiên đăng nhập của bạn vẫn được giữ.</p>
              <button type="button" onClick={this.handleRetry}>Thử lại</button>{" "}
              <button type="button" onClick={this.handleHome}>Về trang chủ</button>
            </div>
          ) : (
            <span>Đang tải lại trang...</span>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
