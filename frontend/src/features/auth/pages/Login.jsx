import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../../shared/styles/Login.css";
import { API_BASE } from "../../../shared/utils/api";

const Login = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(""); // ✅ Thêm state cho email
  const [password, setPassword] = useState(""); // ✅ Thêm state cho mật khẩu
  const [role, setRole] = useState("student");
  const [message, setMessage] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPhone, setResetPhone] = useState("");
  const [resetVerificationCode, setResetVerificationCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true); // ✅ Tab mode: true = Login, false = Register

  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show session-expired message if redirected due to token expiry
    const params = new URLSearchParams(location.search);
    if (params.get('reason') === 'expired') {
      setMessage('⚠️ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && params.get('reason') !== 'expired') {
      navigate(['teacher', 'admin'].includes(user.role) ? "/admin" : "/");
    }
  }, [navigate, location.search]);

  const handleLogin = async () => {
    // ✅ Logic đăng nhập: chỉ cần phone và password
    if (!phone.trim() || !password.trim()) {
      setMessage("❌ Vui lòng nhập đầy đủ số điện thoại và mật khẩu.");
      return;
    }

    // ✅ Kiểm tra số điện thoại Việt Nam (đầu số thực tế)
    const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    if (!vnPhoneRegex.test(phone.trim())) {
      setMessage(
        "❌ Số điện thoại không hợp lệ. Vui lòng nhập số Việt Nam hợp lệ (VD: 0912345678)."
      );
      return;
    }

    try {
      if (loading) return;
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, password }), // ✅ Chỉ gửi phone và password
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        // Store access token so we can send Authorization headers for protected endpoints
        if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);

        setMessage("✅ " + data.message);
        // If a redirect was requested before login, go back there
        const redirectTo = localStorage.getItem('postLoginRedirect');
        if (redirectTo) {
          localStorage.removeItem('postLoginRedirect');
          window.location.href = redirectTo;
          return;
        }

        window.location.href = ['teacher', 'admin'].includes(data.user.role) ? "/admin" : "/";
      } else {
        setMessage("❌ " + data.message);
      }
    } catch (err) {
      setMessage("Lỗi kết nối server.");
      console.error("❌ Lỗi:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // ✅ Logic đăng ký: cần name, phone, email và password
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setMessage(
        "❌ Vui lòng nhập đầy đủ họ tên, số điện thoại, email và mật khẩu."
      );
      return;
    }

    // ✅ Kiểm tra email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setMessage("❌ Email không hợp lệ. Vui lòng nhập email đúng định dạng.");
      return;
    }

    // ✅ Kiểm tra số điện thoại Việt Nam (đầu số thực tế)
    const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    if (!vnPhoneRegex.test(phone.trim())) {
      setMessage(
        "❌ Số điện thoại không hợp lệ. Vui lòng nhập số Việt Nam hợp lệ (VD: 0912345678)."
      );
      return;
    }

    try {
      // Log API_URL để kiểm tra đúng endpoint chưa
      // (debug log removed)
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, password, role }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setMessage("✅ " + data.message);
        window.location.href = ['teacher', 'admin'].includes(data.user.role) ? "/admin" : "/";
      } else {
        // Hiển thị status code và message để dễ debug
        setMessage(
          `❌ [${res.status}] ${
            data.message || "Lỗi đăng ký. Vui lòng thử lại sau."
          }`
        );
        if (data.error) {
          console.error("❌ Lỗi đăng ký:", data.error);
        }
      }
    } catch (err) {
      setMessage("Lỗi kết nối server hoặc database.");
      console.error("❌ Lỗi kết nối server/database:", err);
    }
  };

  const handleResetPassword = async () => {
    if (
      !resetPhone.trim() ||
      !resetVerificationCode.trim() ||
      !resetPassword.trim() ||
      !resetConfirmPassword.trim()
    ) {
      alert("❌ Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    if (!vnPhoneRegex.test(resetPhone.trim())) {
      alert("❌ Số điện thoại không hợp lệ. Vui lòng nhập số Việt Nam hợp lệ.");
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      alert("❌ Mật khẩu không khớp.");
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
        alert("✅ " + data.message);
        setShowResetModal(false);
        setResetPhone("");
        setResetVerificationCode("");
        setResetPassword("");
        setResetConfirmPassword("");
      } else {
        alert("❌ " + data.message);
      }
    } catch (err) {
      alert("Lỗi kết nối server.");
      console.error("❌ Lỗi:", err);
    }
  };

  const handleSendOtp = async () => {
    const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    if (!vnPhoneRegex.test(resetPhone.trim())) {
      alert("❌ Vui lòng nhập số điện thoại Việt Nam hợp lệ (VD: 0912345678).");
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
        alert("✅ " + data.message);
        // ✅ Dev mode: OTP available in response (not logged)
        if (data.testOtp) {
          /* OTP test available in dev response */
        }
      } else {
        alert("❌ " + data.message);
      }
    } catch (err) {
      alert("Lỗi kết nối server.");
      console.error("❌ Lỗi:", err);
    }
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
          <div style={{ display: "flex", marginBottom: "20px", gap: "10px" }}>
            <button
              onClick={() => setIsLoginMode(true)}
              style={{
                flex: 1,
                padding: "10px",
                border: "none",
                borderRadius: "8px",
                background: isLoginMode ? "#0e276f" : "#f0f0f0",
                color: isLoginMode ? "#fff" : "#666",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => setIsLoginMode(false)}
              style={{
                flex: 1,
                padding: "10px",
                border: "none",
                borderRadius: "8px",
                background: !isLoginMode ? "#0e276f" : "#f0f0f0",
                color: !isLoginMode ? "#fff" : "#666",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              Đăng ký
            </button>
          </div>

          {/* Login Form */}
          {isLoginMode ? (
            <>
              <input
                type="text"
                placeholder=" Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder=" Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />

              <button onClick={handleLogin} style={loginBtn} disabled={loading}>
                {loading ? "Đang đăng nhập..." : "Login"}
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
                Quên mật khẩu?
              </button>
            </>
          ) : (
            <>
              {/* Register Form */}
              <input
                type="text"
                placeholder=" Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder=" Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
              <input
                type="email"
                placeholder=" Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder=" Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={inputStyle}
              >
                <option value="student">🎓 Học sinh</option>
                <option value="teacher">📚 Giáo viên</option>
              </select>

              <button onClick={handleRegister} style={registerBtn}>
                Register
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

        <p className="copyright"> Made with ❤️ in Vũng Tàu.</p>
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
              Reset mật khẩu
            </h3>

            <input
              type="text"
              placeholder="Số điện thoại"
              value={resetPhone}
              onChange={(e) => setResetPhone(e.target.value)}
              style={inputStyle}
            />

            <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
              <input
                type="text"
                placeholder="Mã xác thực của bạn"
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
                Gửi mã
              </button>
            </div>

            <input
              type="password"
              placeholder="Nhập mật khẩu của bạn"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              style={inputStyle}
            />

            <input
              type="password"
              placeholder="Vui lòng nhập lại mật khẩu"
              value={resetConfirmPassword}
              onChange={(e) => setResetConfirmPassword(e.target.value)}
              style={inputStyle}
            />

            <button onClick={handleResetPassword} style={loginBtn}>
              Submit
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

const loginBtn = {
  width: "100%",
  backgroundColor: "#0e276f",
  color: "white",
  padding: "10px",
  border: "none",
  borderRadius: "6px",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
  marginTop: "10px",
};

const registerBtn = {
  ...loginBtn,
  backgroundColor: "#e03",
  marginTop: "10px",
};

export default Login;
