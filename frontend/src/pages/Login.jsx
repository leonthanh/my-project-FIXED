import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(''); // ✅ Thêm state cho mật khẩu
  const [role, setRole] = useState('student');
  const [message, setMessage] = useState('');

  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL.replace(/\/+$/, '');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      navigate(user.role === 'teacher' ? '/admin' : '/');
    }
  }, [navigate]);

  const handleLogin = async () => {
    // ✅ Logic đăng nhập: chỉ cần phone và password
    if (!phone.trim() || !password.trim()) {
      setMessage('❌ Vui lòng nhập đầy đủ số điện thoại và mật khẩu.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }) // ✅ Chỉ gửi phone và password
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setMessage('✅ ' + data.message);
        window.location.href = data.user.role === 'teacher' ? '/admin' : '/';
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch (err) {
      setMessage('Lỗi kết nối server.');
      console.error('❌ Lỗi:', err);
    }
  };

  const handleRegister = async () => {
    // ✅ Logic đăng ký: cần name, phone và password
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setMessage('❌ Vui lòng nhập đầy đủ họ tên, số điện thoại và mật khẩu.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password, role }) // ✅ Gửi cả name, phone và password
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setMessage('✅ ' + data.message);
        window.location.href = data.user.role === 'teacher' ? '/admin' : '/';
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch (err) {
      setMessage('Lỗi kết nối server.');
      console.error('❌ Lỗi:', err);
    }
  };

  return (
    <div style={{
      height: '100vh',
      background: '#f0f4ff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Segoe UI, sans-serif'
    }}>
      <div style={{
        background: '#fff',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 0 20px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '360px',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: 20, fontWeight: 600 }}>
          STAREDU - IX Writing
        </h2>

        <input
          type="text"
          placeholder=" Name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder=" Phone Number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          style={inputStyle}
        />
        <input // ✅ Thẻ input mật khẩu
          type="password"
          placeholder=" Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
        />

        <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
          <option value="student">🎓 Student</option>
          <option value="teacher">👩‍🏫 Teacher</option>
        </select>

        <button onClick={handleLogin} style={loginBtn}>Login</button>

        <p style={{ color: '#d00', margin: '10px 0' }}>{message}</p>

        <button onClick={handleRegister} style={registerBtn}>Register</button>
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '10px 0px',
  margin: '8px 0',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '16px'
};

const loginBtn = {
  width: '100%',
  backgroundColor: '#0e276f',
  color: 'white',
  padding: '10px',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
  fontSize: '16px',
  cursor: 'pointer',
  marginTop: '10px'
};

const registerBtn = {
  ...loginBtn,
  backgroundColor: '#e03',
  marginTop: '10px'
};

export default Login;