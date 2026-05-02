import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../../shared/styles/LoginPage.css";
import LineIcon from "../../../shared/components/LineIcon";
import {
  API_BASE,
  clearAuth,
  getStoredUser,
  hasStoredSession,
  storeAuthSession,
} from "../../../shared/utils/api";

const InlineIcon = ({ name, size = 16, style }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      lineHeight: 0,
      flex: "0 0 auto",
      ...style,
    }}
    aria-hidden="true"
  >
    <LineIcon name={name} size={size} />
  </span>
);

const AUTH_MESSAGE_TRANSLATIONS = {
  "Đăng nhập thành công": "Login successful.",
  "Đăng ký thành công!": "Registration successful.",
  "Số điện thoại đã tồn tại. Vui lòng đăng nhập hoặc sử dụng số điện thoại khác.":
    "This phone number is already registered. Please sign in or use a different number.",
  "Số điện thoại không tồn tại. Vui lòng đăng ký.":
    "This phone number was not found. Please create an account.",
  "Số điện thoại không tồn tại.": "This phone number was not found.",
  "Mật khẩu không đúng.": "Incorrect password.",
  "Lỗi server khi đăng ký.": "Server error during registration.",
  "Lỗi server khi đăng nhập.": "Server error during login.",
  "Mã xác thực không đúng hoặc đã hết hạn.":
    "The verification code is invalid or has expired.",
  "Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.":
    "The verification code has expired. Please request a new one.",
  "Mật khẩu đã được reset thành công! Vui lòng đăng nhập lại.":
    "Your password has been reset successfully. Please sign in again.",
  "Mã xác thực đã được gửi. Vui lòng kiểm tra email của bạn.":
    "The verification code has been sent. Please check your email.",
  "Lỗi server khi gửi OTP.": "Server error while sending the verification code.",
  "Quá nhiều yêu cầu. Vui lòng thử lại sau.":
    "Too many requests. Please try again later.",
  "Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.":
    "Too many verification code requests. Please try again later.",
};

const translateAuthMessage = (message) => {
  if (!message) return "";
  const normalizedMessage = String(message).trim();
  return AUTH_MESSAGE_TRANSLATIONS[normalizedMessage] || normalizedMessage;
};

const Login = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(""); // Thêm state cho email
  const [password, setPassword] = useState(""); // Thêm state cho mật khẩu
  const [message, setMessage] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPhone, setResetPhone] = useState("");
  const [resetVerificationCode, setResetVerificationCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true); // Tab mode: true = Login, false = Register
  const loginPhoneRef = useRef(null);
  const loginPasswordRef = useRef(null);
  const loginButtonRef = useRef(null);
  const loginSubmittingRef = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const redirectAfterAuth = (targetPath) => {
    window.dispatchEvent(new CustomEvent("auth:changed"));

    if (typeof targetPath === "string" && targetPath.startsWith("/")) {
      navigate(targetPath, { replace: true });
      return;
    }

    if (typeof targetPath === "string" && /^https?:\/\//i.test(targetPath)) {
      window.location.href = targetPath;
      return;
    }

    navigate("/", { replace: true });
  };

  useEffect(() => {
    // Show session-expired message if redirected due to token expiry
    const params = new URLSearchParams(location.search);
    if (params.get('reason') === 'expired') {
      setMessage('Your session has expired. Please sign in again.');
    }
    let user = getStoredUser();
    const hasToken = hasStoredSession();
    if (user && !hasToken) {
      clearAuth();
      user = null;
    }
    if (user && hasToken && params.get('reason') !== 'expired') {
      navigate(['teacher', 'admin'].includes(user.role) ? "/admin" : "/");
    }
  }, [navigate, location.search]);

  const handleLogin = async () => {
    if (loginSubmittingRef.current) return;
    // Logic đăng nhập: chỉ cần phone và password
    if (!phone.trim() || !password.trim()) {
      setMessage("Please enter both phone number and password.");
      return;
    }

    // Kiểm tra số điện thoại Việt Nam (đầu số thực tế)
    const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    if (!vnPhoneRegex.test(phone.trim())) {
      setMessage(
        "Invalid phone number. Please enter a valid Vietnamese phone number (e.g. 0912345678)."
      );
      return;
    }

    try {
      if (loading) return;
      loginSubmittingRef.current = true;
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, password }), // Chỉ gửi phone và password
      });

      const data = await res.json();
      if (res.ok) {
        storeAuthSession({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });

        setMessage(translateAuthMessage(data.message));
        // If a redirect was requested before login, go back there
        const redirectTo = localStorage.getItem('postLoginRedirect');
        if (redirectTo) {
          localStorage.removeItem('postLoginRedirect');
          redirectAfterAuth(redirectTo);
          return;
        }

        redirectAfterAuth(['teacher', 'admin'].includes(data.user.role) ? "/admin" : "/");
      } else {
        setMessage(translateAuthMessage(data.message));
      }
    } catch (err) {
      setMessage("Unable to connect to the server.");
      console.error("Lỗi:", err);
    } finally {
      loginSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Logic đăng ký: cần name, phone, email và password
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setMessage(
        "Please enter your full name, phone number, email, and password."
      );
      return;
    }

    // Kiểm tra email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setMessage("Invalid email address. Please enter a valid email.");
      return;
    }

    // Kiểm tra số điện thoại Việt Nam (đầu số thực tế)
    const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    if (!vnPhoneRegex.test(phone.trim())) {
      setMessage(
        "Invalid phone number. Please enter a valid Vietnamese phone number (e.g. 0912345678)."
      );
      return;
    }

    try {
      // Log API_URL để kiểm tra đúng endpoint chưa
      // (debug log removed)
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        storeAuthSession({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        setMessage(translateAuthMessage(data.message));
        redirectAfterAuth(['teacher', 'admin'].includes(data.user.role) ? "/admin" : "/");
      } else {
        // Hiển thị status code và message để dễ debug
        setMessage(
          `[${res.status}] ${
            translateAuthMessage(data.message) || "Registration failed. Please try again later."
          }`
        );
        if (data.error) {
          console.error("Lỗi đăng ký:", data.error);
        }
      }
    } catch (err) {
      setMessage("Unable to connect to the server or database.");
      console.error("Lỗi kết nối server/database:", err);
    }
  };

  const handleResetPassword = async () => {
    if (
      !resetPhone.trim() ||
      !resetVerificationCode.trim() ||
      !resetPassword.trim() ||
      !resetConfirmPassword.trim()
    ) {
      alert("Please complete all fields.");
      return;
    }

    const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    if (!vnPhoneRegex.test(resetPhone.trim())) {
      alert("Invalid phone number. Please enter a valid Vietnamese phone number.");
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: resetPhone,
          verificationCode: resetVerificationCode,
          newPassword: resetPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(translateAuthMessage(data.message));
        setShowResetModal(false);
        setResetPhone("");
        setResetVerificationCode("");
        setResetPassword("");
        setResetConfirmPassword("");
      } else {
        alert(translateAuthMessage(data.message));
      }
    } catch (err) {
      alert("Unable to connect to the server.");
      console.error("Lỗi:", err);
    }
  };

  const handleSendOtp = async () => {
    const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    if (!vnPhoneRegex.test(resetPhone.trim())) {
      alert("Please enter a valid Vietnamese phone number (e.g. 0912345678).");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: resetPhone }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(translateAuthMessage(data.message));
        // Dev mode: OTP available in response (not logged)
        if (data.testOtp) {
          /* OTP test available in dev response */
        }
      } else {
        alert(translateAuthMessage(data.message));
      }
    } catch (err) {
      alert("Unable to connect to the server.");
      console.error("Lỗi:", err);
    }
  };

  const handleLoginPhoneKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    loginPasswordRef.current?.focus();
  };

  const handleLoginPasswordKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleLogin();
  };

  const handleLoginButtonKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleLogin();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f4ff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 0 20px rgba(0,0,0,0.1)",
            width: "100%",
            maxWidth: "360px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginBottom: 20, fontWeight: 700, color: "#0e276f" }}>
            STAREDU - IX
          </h2>

          {/* Tab Switcher */}
          <div className="login-page-toggleGroup">
            <button
              type="button"
              onClick={() => setIsLoginMode(true)}
              className={`login-page-toggleButton${isLoginMode ? " login-page-toggleButton--active" : ""}`}
            >
              <span>Login</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLoginMode(false)}
              className={`login-page-toggleButton${!isLoginMode ? " login-page-toggleButton--active" : ""}`}
            >
              <span>Register</span>
            </button>
          </div>

          {/* Login Form */}
          {isLoginMode ? (
            <>
              <input
                ref={loginPhoneRef}
                type="text"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={handleLoginPhoneKeyDown}
                style={inputStyle}
              />
              <input
                ref={loginPasswordRef}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleLoginPasswordKeyDown}
                style={inputStyle}
              />

              <button
                ref={loginButtonRef}
                type="button"
                onClick={handleLogin}
                onKeyDown={handleLoginButtonKeyDown}
                className="login-page-primaryButton"
                disabled={loading}
              >
                <span>{loading ? "Signing in..." : "Login"}</span>
              </button>

              <p style={{ color: "#d00", margin: "10px 0" }}>{message}</p>

              <button
                onClick={() => setShowResetModal(true)}
                style={{
                  color: "#0e276f",
                  cursor: "pointer",
                  fontSize: "14px",
                  textDecoration: "none",
                  marginBottom: "10px",
                  display: "inline-block",
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                Forgot password?
              </button>
            </>
          ) : (
            <>
              {/* Register Form */}
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />

              <div
                aria-label="Account role"
                aria-readonly="true"
                style={lockedRoleFieldStyle}
              >
                <InlineIcon
                  name="student"
                  size={18}
                  style={{ color: "#0e276f" }}
                />
                <span style={lockedRoleLabelStyle}>Student (default)</span>
                <InlineIcon
                  name="chevron-down"
                  size={16}
                  style={{ color: "#94a3b8", marginLeft: "auto" }}
                />
              </div>

              <div style={roleNoticeStyle}>
                <InlineIcon
                  name="teacher"
                  size={18}
                  style={roleNoticeIconStyle}
                />
                <span>
                  Need a teacher account? Contact admin to request a role
                  upgrade.
                </span>
              </div>

              <button
                type="button"
                onClick={handleRegister}
                className="login-page-primaryButton"
              >
                <span>Register</span>
              </button>

              <p style={{ color: "#d00", margin: "10px 0" }}>{message}</p>
            </>
          )}
        </div>
      </div>

      <footer>
        <div className="waves">
          <div className="wave" id="wave1"></div>
          <div className="wave" id="wave2"></div>
          <div className="wave" id="wave3"></div>
          <div className="wave" id="wave4"></div>
        </div>

        <p className="copyright"> Made with care in Vung Tau.</p>
      </footer>

      {/* Modal Reset Password */}
      {showResetModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowResetModal(false)}
        >
          <div
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 0 20px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
              Reset Password
            </h3>

            <input
              type="text"
              placeholder="Phone Number"
              value={resetPhone}
              onChange={(e) => setResetPhone(e.target.value)}
              style={inputStyle}
            />

            <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
              <input
                type="text"
                placeholder="Verification Code"
                value={resetVerificationCode}
                onChange={(e) => setResetVerificationCode(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={handleSendOtp}
                style={{
                  padding: "10px 15px",
                  borderRadius: "6px",
                  border: "1px solid #0099ff",
                  color: "#0099ff",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Send Code
              </button>
            </div>

            <input
              type="password"
              placeholder="New Password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              style={inputStyle}
            />

            <input
              type="password"
              placeholder="Confirm New Password"
              value={resetConfirmPassword}
              onChange={(e) => setResetConfirmPassword(e.target.value)}
              style={inputStyle}
            />

            <button
              type="button"
              onClick={handleResetPassword}
              className="login-page-primaryButton"
            >
              <span>Reset Password</span>
            </button>

            <p
              onClick={() => setShowResetModal(false)}
              style={{
                textAlign: "center",
                marginTop: "15px",
                cursor: "pointer",
                color: "#0e276f",
                fontSize: "14px",
              }}
            >
              Login to your account
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const inputStyle = {
  width: "100%",
  padding: "10px 0px",
  margin: "8px 0",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "16px",
};

const lockedRoleFieldStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "12px 14px",
  margin: "8px 0",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#f8fafc",
  color: "#334155",
  cursor: "not-allowed",
  boxSizing: "border-box",
};

const lockedRoleLabelStyle = {
  fontSize: "16px",
  lineHeight: 1.2,
};

const roleNoticeStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  margin: "6px 0 10px",
  padding: "10px 12px",
  borderRadius: "8px",
  backgroundColor: "#eff6ff",
  color: "#1e3a8a",
  fontSize: "13px",
  lineHeight: 1.5,
  textAlign: "left",
};

const roleNoticeIconStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  color: "#0e276f",
  marginTop: "1px",
};

export default Login;

