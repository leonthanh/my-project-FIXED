import React from "react";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep logging in console for debugging while avoiding a blank white page for users.
    console.error("App crash:", error, info);
  }

  handleResetToLogin = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.location.replace("/login");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 16,
            background: "#f8fafc",
            fontFamily: "Segoe UI, sans-serif",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 20,
              textAlign: "center",
              boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
            }}
          >
            <h2 style={{ margin: "0 0 8px", color: "#0f172a" }}>Trang gap loi tam thoi</h2>
            <p style={{ margin: "0 0 16px", color: "#475569", fontSize: 14 }}>
              Ban bam tai lai, hoac dang nhap lai de tiep tuc.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 14px",
                  background: "#0e276f",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Tai lai
              </button>
              <button
                type="button"
                onClick={this.handleResetToLogin}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "10px 14px",
                  background: "#fff",
                  color: "#0f172a",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Dang nhap lai
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
