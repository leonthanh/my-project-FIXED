import React, { useEffect, useState, useCallback } from 'react';
import { AdminNavbar } from '../../../shared/components';
import { apiPath, authFetch } from '../../../shared/utils/api';

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const roleBadge = (role) => {
  const map = { admin: { bg: '#fef3c7', color: '#92400e', label: 'Admin' }, teacher: { bg: '#dbeafe', color: '#1e40af', label: 'GV' }, student: { bg: '#f3f4f6', color: '#374151', label: 'HS' } };
  const m = map[role] || map.student;
  return <span style={{ background: m.bg, color: m.color, borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{m.label}</span>;
};

// ─── Modals ───────────────────────────────────────────────────────────────────
const PasswordModal = ({ user, onClose, onSaved }) => {
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (pw.length < 6) { setErr('Tối thiểu 6 ký tự'); return; }
    setSaving(true); setErr('');
    try {
      const res = await authFetch(apiPath(`admin/users/${user.id}/password`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onSaved(data.message);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <h3 style={{ marginTop: 0 }}>🔒 Đặt lại mật khẩu</h3>
        <p style={{ color: '#555', fontSize: 14 }}>Người dùng: <strong>{user.name}</strong> ({user.phone})</p>
        <input
          type="password" placeholder="Mật khẩu mới (≥6 ký tự)"
          value={pw} onChange={(e) => setPw(e.target.value)}
          style={s.input} autoFocus
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        {err && <p style={s.errText}>{err}</p>}
        <div style={s.modalBtns}>
          <button style={s.btnGray} onClick={onClose} disabled={saving}>Huỷ</button>
          <button style={s.btnRed} onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </div>
    </div>
  );
};

const EditUserModal = ({ user, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: user.name, phone: user.phone, email: user.email || '', role: user.role, canManageTests: user.canManageTests });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const res = await authFetch(apiPath(`admin/users/${user.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onSaved(data.user);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: 400 }}>
        <h3 style={{ marginTop: 0 }}>✏️ Chỉnh sửa người dùng</h3>
        <label style={s.label}>Tên</label>
        <input style={s.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label style={s.label}>Số điện thoại</label>
        <input style={s.input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <label style={s.label}>Email</label>
        <input style={s.input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <label style={s.label}>Role</label>
        <select style={s.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="student">Học sinh (student)</option>
          <option value="teacher">Giáo viên (teacher)</option>
          <option value="admin">Admin</option>
        </select>
        {form.role === 'teacher' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, margin: '8px 0' }}>
            <input type="checkbox" checked={!!form.canManageTests} onChange={(e) => setForm({ ...form, canManageTests: e.target.checked })} />
            Quản lý đề (Reading/Listening/Cambridge)
          </label>
        )}
        {err && <p style={s.errText}>{err}</p>}
        <div style={s.modalBtns}>
          <button style={s.btnGray} onClick={onClose} disabled={saving}>Huỷ</button>
          <button style={{ ...s.btnRed, background: '#2563eb' }} onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </div>
    </div>
  );
};

// ─── Tab: Người dùng ──────────────────────────────────────────────────────────
const UsersTab = ({ onViewSubmissions }) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [pwModal, setPwModal] = useState(null);   // user object
  const [editModal, setEditModal] = useState(null); // user object
  const [delConfirm, setDelConfirm] = useState(null); // user object

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter) params.set('role', roleFilter);
      const res = await authFetch(apiPath(`admin/users?${params}`));
      if (!res.ok) throw new Error('Lỗi tải dữ liệu');
      setUsers(await res.json());
    } catch (e) { showToast('❌ ' + e.message); }
    finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const deleteUser = async (user) => {
    try {
      const res = await authFetch(apiPath(`admin/users/${user.id}`), { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showToast('✅ ' + data.message);
    } catch (e) { showToast('❌ ' + e.message); }
    finally { setDelConfirm(null); }
  };

  return (
    <div>
      {toast && <div style={s.toast}>{toast}</div>}
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ ...s.input, flex: 1, minWidth: 200, margin: 0 }}
          placeholder="🔍 Tìm theo tên / SĐT / email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={{ ...s.input, margin: 0, width: 160 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Tất cả role</option>
          <option value="student">Học sinh</option>
          <option value="teacher">Giáo viên</option>
          <option value="admin">Admin</option>
        </select>
        <button style={s.btnBlue} onClick={load} disabled={loading}>🔄 Tải lại</button>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#888' }}>Đang tải...</p>}

      {!loading && (
        <>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Tổng: {users.length} người dùng</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>ID</th>
                  <th style={s.th}>Tên</th>
                  <th style={s.th}>SĐT</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Role</th>
                  <th style={s.th}>Ngày tạo</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={s.tr}>
                    <td style={{ ...s.td, color: '#9ca3af', fontSize: 12 }}>{u.id}</td>
                    <td style={s.td}><strong>{u.name}</strong></td>
                    <td style={s.td}>{u.phone}</td>
                    <td style={{ ...s.td, color: '#6b7280' }}>{u.email || '—'}</td>
                    <td style={s.td}>{roleBadge(u.role)}</td>
                    <td style={{ ...s.td, fontSize: 12, color: '#9ca3af' }}>{fmtDate(u.createdAt)}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button style={s.btnSmGray} onClick={() => setEditModal(u)} title="Sửa thông tin">✏️</button>
                        <button style={s.btnSmGray} onClick={() => setPwModal(u)} title="Đổi mật khẩu">🔒</button>
                        <button style={s.btnSmBlue} onClick={() => onViewSubmissions(u)} title="Xem bài làm">📋</button>
                        <button style={s.btnSmRed} onClick={() => setDelConfirm(u)} title="Xóa user">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', color: '#9ca3af' }}>Không tìm thấy người dùng nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modals */}
      {pwModal && (
        <PasswordModal
          user={pwModal}
          onClose={() => setPwModal(null)}
          onSaved={(msg) => { setPwModal(null); showToast('✅ ' + msg); }}
        />
      )}
      {editModal && (
        <EditUserModal
          user={editModal}
          onClose={() => setEditModal(null)}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
            setEditModal(null);
            showToast('✅ Đã cập nhật thông tin.');
          }}
        />
      )}
      {delConfirm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ marginTop: 0, color: '#dc2626' }}>⚠️ Xác nhận xóa</h3>
            <p>Bạn sắp xóa người dùng <strong>"{delConfirm.name}"</strong> ({delConfirm.phone}).</p>
            <p style={{ fontSize: 13, color: '#6b7280' }}>Hành động này sẽ xóa vĩnh viễn user và toàn bộ bài làm Reading / Listening / Cambridge của họ. Bài Writing sẽ được giữ lại (ẩn danh).</p>
            <div style={s.modalBtns}>
              <button style={s.btnGray} onClick={() => setDelConfirm(null)}>Huỷ</button>
              <button style={s.btnRed} onClick={() => deleteUser(delConfirm)}>Xóa vĩnh viễn</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Bài làm ─────────────────────────────────────────────────────────────
const SUB_TYPES = ['writing', 'reading', 'listening', 'cambridge'];
const SUB_LABELS = { writing: '✍️ Writing', reading: '📖 Reading', listening: '🎧 Listening', cambridge: '🎓 Cambridge' };

const SubmissionsTab = ({ initialUser }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(initialUser || null);
  const [subs, setSubs] = useState(null);
  const [activeType, setActiveType] = useState('writing');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // Search users
  const searchUsers = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await authFetch(apiPath(`admin/users?search=${encodeURIComponent(search.trim())}`));
      setUsers(await res.json());
    } catch { showToast('❌ Lỗi tìm kiếm'); }
    finally { setLoading(false); }
  };

  const loadSubs = useCallback(async (user) => {
    setSelectedUser(user);
    setLoading(true);
    try {
      const res = await authFetch(apiPath(`admin/submissions?userId=${user.id}`));
      if (!res.ok) throw new Error('Lỗi tải bài làm');
      setSubs(await res.json());
    } catch (e) { showToast('❌ ' + e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (initialUser) loadSubs(initialUser);
  }, [initialUser, loadSubs]);

  const deleteSub = async (type, id) => {
    if (!window.confirm('Xóa bài làm này?')) return;
    try {
      const res = await authFetch(apiPath(`admin/submissions/${type}/${id}`), { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSubs((prev) => ({ ...prev, [type]: prev[type].filter((s) => s.id !== id) }));
      showToast('✅ ' + data.message);
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const renderSubRow = (type, sub) => {
    const name = type === 'cambridge' ? sub.studentName : sub.userName;
    // CambridgeSubmission dùng score/totalQuestions, còn lại dùng correct/total
    const correctVal = sub.correct ?? sub.score;
    const totalVal = sub.total ?? sub.totalQuestions;
    const score = (correctVal !== undefined && totalVal) ? `${correctVal}/${totalVal}` : '—';
    const band = sub.band ? `Band ${sub.band}` : (sub.percentage != null ? `${sub.percentage}%` : '');
    return (
      <tr key={sub.id} style={s.tr}>
        <td style={{ ...s.td, fontSize: 12, color: '#9ca3af' }}>{sub.id}</td>
        <td style={s.td}>{name || '—'}</td>
        <td style={{ ...s.td, fontSize: 12 }}>Test #{sub.testId || '—'}{sub.testType ? ` (${sub.testType})` : ''}</td>
        <td style={s.td}>{score} {band && <span style={{ color: '#2563eb', fontSize: 12 }}>{band}</span>}</td>
        <td style={{ ...s.td, fontSize: 12, color: '#9ca3af' }}>{fmtDate(sub.createdAt)}</td>
        <td style={{ ...s.td, textAlign: 'center' }}>
          <button style={s.btnSmRed} onClick={() => deleteSub(type, sub.id)} title="Xóa bài làm">🗑️</button>
        </td>
      </tr>
    );
  };

  return (
    <div>
      {toast && <div style={s.toast}>{toast}</div>}
      {/* Search user */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ ...s.input, flex: 1, minWidth: 200, margin: 0 }}
          placeholder="🔍 Tìm tên / SĐT người dùng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
        />
        <button style={s.btnBlue} onClick={searchUsers} disabled={loading}>Tìm</button>
      </div>

      {users.length > 0 && !selectedUser && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Chọn người dùng để xem bài làm:</p>
          {users.map((u) => (
            <button key={u.id} style={s.userChip} onClick={() => loadSubs(u)}>
              {u.name} · {u.phone} · {roleBadge(u.role)}
            </button>
          ))}
        </div>
      )}

      {selectedUser && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14 }}>📋 Bài làm của: <strong>{selectedUser.name}</strong> ({selectedUser.phone})</span>
            <button style={s.btnSmGray} onClick={() => { setSelectedUser(null); setSubs(null); setUsers([]); setSearch(''); }}>✕ Đóng</button>
          </div>

          {loading && <p style={{ color: '#888', textAlign: 'center' }}>Đang tải bài làm...</p>}

          {subs && !loading && (
            <>
              {/* Type tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 0, borderBottom: '2px solid #e5e7eb' }}>
                {SUB_TYPES.map((t) => (
                  <button
                    key={t} onClick={() => setActiveType(t)}
                    style={{ ...s.tabBtn, ...(activeType === t ? s.tabBtnActive : {}) }}
                  >
                    {SUB_LABELS[t]} <span style={{ fontSize: 11, opacity: 0.7 }}>({subs[t]?.length || 0})</span>
                  </button>
                ))}
              </div>
              <div style={{ overflowX: 'auto', marginTop: 0 }}>
                <table style={{ ...s.table, borderRadius: '0 0 8px 8px' }}>
                  <thead>
                    <tr>
                      <th style={s.th}>ID</th>
                      <th style={s.th}>Tên</th>
                      <th style={s.th}>Đề</th>
                      <th style={s.th}>Điểm</th>
                      <th style={s.th}>Ngày</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(subs[activeType] || []).map((sub) => renderSubRow(activeType, sub))}
                    {(subs[activeType] || []).length === 0 && (
                      <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: '#9ca3af' }}>Không có bài làm {SUB_LABELS[activeType]}.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

// ─── Tab: Tìm trùng ───────────────────────────────────────────────────────────
const DuplicatesTab = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch(apiPath('admin/users/duplicates'));
      if (!res.ok) throw new Error('Lỗi tải dữ liệu');
      setGroups(await res.json());
    } catch (e) { showToast('❌ ' + e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const deleteUser = async (user, groupIdx) => {
    if (!window.confirm(`Xóa người dùng "${user.name}" (${user.phone})?`)) return;
    try {
      const res = await authFetch(apiPath(`admin/users/${user.id}`), { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setGroups((prev) => {
        const updated = prev.map((g, i) => i === groupIdx ? g.filter((u) => u.id !== user.id) : g);
        return updated.filter((g) => g.length > 1);
      });
      showToast('✅ ' + data.message);
    } catch (e) { showToast('❌ ' + e.message); }
  };

  return (
    <div>
      {toast && <div style={s.toast}>{toast}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
          Phát hiện người dùng đăng ký <strong>trùng tên</strong> (so sánh không phân biệt chữ hoa/thường).
        </p>
        <button style={s.btnBlue} onClick={load} disabled={loading}>🔄 Tải lại</button>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#888' }}>Đang tìm...</p>}

      {!loading && groups.length === 0 && (
        <p style={{ textAlign: 'center', color: '#22c55e', fontWeight: 600, marginTop: 40 }}>🎉 Không có tên trùng nhau!</p>
      )}

      {groups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 20, border: '1px solid #fcd34d', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#fef9c3', padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#92400e' }}>
            ⚠️ Trùng tên: "{group[0].name}" — {group.length} tài khoản
          </div>
          <table style={{ ...s.table, borderRadius: 0, boxShadow: 'none' }}>
            <thead>
              <tr>
                <th style={s.th}>ID</th>
                <th style={s.th}>Tên</th>
                <th style={s.th}>SĐT</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Role</th>
                <th style={s.th}>Ngày tạo</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Xóa</th>
              </tr>
            </thead>
            <tbody>
              {group.map((u) => (
                <tr key={u.id} style={s.tr}>
                  <td style={{ ...s.td, fontSize: 12, color: '#9ca3af' }}>{u.id}</td>
                  <td style={s.td}><strong>{u.name}</strong></td>
                  <td style={s.td}>{u.phone}</td>
                  <td style={{ ...s.td, color: '#6b7280' }}>{u.email || '—'}</td>
                  <td style={s.td}>{roleBadge(u.role)}</td>
                  <td style={{ ...s.td, fontSize: 12, color: '#9ca3af' }}>{fmtDate(u.createdAt)}</td>
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    <button style={s.btnSmRed} onClick={() => deleteUser(u, gi)} title="Xóa user này">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'users', label: '👥 Người dùng' },
  { id: 'submissions', label: '📋 Bài làm' },
  { id: 'duplicates', label: '🔍 Tìm trùng' },
];

const AdminUserManagement = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [jumpToUser, setJumpToUser] = useState(null); // passed from users tab → submissions tab

  const handleViewSubmissions = (user) => {
    setJumpToUser(user);
    setActiveTab('submissions');
  };

  // Reset jumpToUser once consumed
  const submissionsKey = jumpToUser ? jumpToUser.id : 'none';

  return (
    <>
      <AdminNavbar />
      <div style={s.page}>
        <h2 style={s.title}>⚙️ Quản lý người dùng & Bài làm</h2>

        {/* Tab bar */}
        <div style={s.tabBar}>
          {TABS.map((t) => (
            <button
              key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ ...s.tabBtn, ...(activeTab === t.id ? s.tabBtnActive : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={s.tabContent}>
          {activeTab === 'users' && <UsersTab onViewSubmissions={handleViewSubmissions} />}
          {activeTab === 'submissions' && <SubmissionsTab key={submissionsKey} initialUser={jumpToUser} />}
          {activeTab === 'duplicates' && <DuplicatesTab />}
        </div>
      </div>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: { maxWidth: 960, margin: '40px auto', padding: '0 16px' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 18 },
  tabBar: { display: 'flex', gap: 2, borderBottom: '2px solid #e5e7eb', marginBottom: 20 },
  tabBtn: { background: 'none', border: 'none', borderBottom: '2px solid transparent', marginBottom: -2, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#6b7280' },
  tabBtnActive: { borderBottom: '2px solid #2563eb', color: '#2563eb', fontWeight: 700 },
  tabContent: { background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  th: { background: '#f3f4f6', padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600, borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '9px 12px', fontSize: 14, verticalAlign: 'middle' },
  input: { border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 12px', fontSize: 14, width: '100%', boxSizing: 'border-box', margin: '4px 0 10px' },
  label: { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginTop: 4 },
  btnBlue: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  btnRed: { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  btnGray: { background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  btnSmRed: { background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 14 },
  btnSmBlue: { background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 14 },
  btnSmGray: { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 14 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal: { background: '#fff', borderRadius: 10, padding: 24, width: '90%', maxWidth: 360, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  modalBtns: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 },
  errText: { color: '#dc2626', fontSize: 13, margin: '4px 0 0' },
  toast: { position: 'fixed', bottom: 24, right: 24, background: '#1f2937', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  userChip: { background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', marginRight: 8, marginBottom: 8, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 },
};

export default AdminUserManagement;
