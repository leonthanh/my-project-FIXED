import React, { useEffect, useState, useCallback } from 'react';
import AdminNavbar from '../../../shared/components/AdminNavbar';
import { apiPath, authFetch } from '../../../shared/utils/api';

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const roleBadge = (role) => {
  const map = {
    admin: { bg: '#fef3c7', color: '#92400e', label: 'Admin' },
    teacher: { bg: '#dbeafe', color: '#1e40af', label: 'Teacher' },
    student: { bg: '#f3f4f6', color: '#374151', label: 'Student' },
  };
  const m = map[role] || map.student;
  return <span style={{ background: m.bg, color: m.color, borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{m.label}</span>;
};

// ─── Modals ───────────────────────────────────────────────────────────────────
const PasswordModal = ({ user, onClose, onSaved }) => {
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (pw.length < 6) { setErr('Minimum 6 characters.'); return; }
    setSaving(true); setErr('');
    try {
      const res = await authFetch(apiPath(`admin/users/${user.id}/password`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pw }),
      });
      await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Could not update password.');
      onSaved('Password updated.');
    } catch (e) { setErr('Could not update password.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <h3 style={{ marginTop: 0 }}>Reset Password</h3>
        <p style={{ color: '#555', fontSize: 14 }}>User: <strong>{user.name}</strong> ({user.phone})</p>
        <input
          type="password" placeholder="New password (min. 6 characters)"
          value={pw} onChange={(e) => setPw(e.target.value)}
          style={s.input} autoFocus
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        {err && <p style={s.errText}>{err}</p>}
        <div style={s.modalBtns}>
          <button style={s.btnGray} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={s.btnRed} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Could not save user changes.');
      onSaved(data.user || { ...user, ...form });
    } catch (e) { setErr('Could not save user changes.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: 400 }}>
        <h3 style={{ marginTop: 0 }}>Edit User</h3>
        <label style={s.label}>Name</label>
        <input style={s.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label style={s.label}>Phone</label>
        <input style={s.input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <label style={s.label}>Email</label>
        <input style={s.input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <label style={s.label}>Role</label>
        <select style={s.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        {form.role === 'teacher' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, margin: '8px 0' }}>
            <input type="checkbox" checked={!!form.canManageTests} onChange={(e) => setForm({ ...form, canManageTests: e.target.checked })} />
            Can manage tests (Reading/Listening/Orange)
          </label>
        )}
        {err && <p style={s.errText}>{err}</p>}
        <div style={s.modalBtns}>
          <button style={s.btnGray} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={{ ...s.btnRed, background: '#2563eb' }} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

// ─── Tab: Users ───────────────────────────────────────────────────────────────
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
      if (!res.ok) throw new Error('Could not load users.');
      setUsers(await res.json());
    } catch (e) { showToast('Could not load users.'); }
    finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const deleteUser = async (user) => {
    try {
      const res = await authFetch(apiPath(`admin/users/${user.id}`), { method: 'DELETE' });
      await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Could not delete user.');
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showToast('User deleted.');
    } catch (e) { showToast('Could not delete user.'); }
    finally { setDelConfirm(null); }
  };

  return (
    <div>
      {toast && <div style={s.toast}>{toast}</div>}
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ ...s.input, flex: 1, minWidth: 200, margin: 0 }}
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={{ ...s.input, margin: 0, width: 160 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        <button style={s.btnBlue} onClick={load} disabled={loading}>Reload</button>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#888' }}>Loading users...</p>}

      {!loading && (
        <>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Total: {users.length} users</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>ID</th>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Phone</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Role</th>
                  <th style={s.th}>Created</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Actions</th>
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
                        <button style={s.btnSmGray} onClick={() => setEditModal(u)} title="Edit user">Edit</button>
                        <button style={s.btnSmGray} onClick={() => setPwModal(u)} title="Reset password">Password</button>
                        <button style={s.btnSmBlue} onClick={() => onViewSubmissions(u)} title="View submissions">Submissions</button>
                        <button style={s.btnSmRed} onClick={() => setDelConfirm(u)} title="Delete user">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', color: '#9ca3af' }}>No users found.</td></tr>
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
          onSaved={(msg) => { setPwModal(null); showToast(msg); }}
        />
      )}
      {editModal && (
        <EditUserModal
          user={editModal}
          onClose={() => setEditModal(null)}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
            setEditModal(null);
            showToast('User details updated.');
          }}
        />
      )}
      {delConfirm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ marginTop: 0, color: '#dc2626' }}>Confirm Deletion</h3>
            <p>You are about to delete <strong>"{delConfirm.name}"</strong> ({delConfirm.phone}).</p>
            <p style={{ fontSize: 13, color: '#6b7280' }}>This permanently deletes the user and all Reading, Listening, and Orange submissions. Writing submissions are preserved anonymously.</p>
            <div style={s.modalBtns}>
              <button style={s.btnGray} onClick={() => setDelConfirm(null)}>Cancel</button>
              <button style={s.btnRed} onClick={() => deleteUser(delConfirm)}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Submissions ─────────────────────────────────────────────────────────
const SUB_TYPES = ['writing', 'reading', 'listening', 'cambridge'];
const SUB_LABELS = { writing: 'Writing', reading: 'Reading', listening: 'Listening', cambridge: 'Orange' };

const SubmissionsTab = ({ initialUser }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(initialUser || null);
  const [subs, setSubs] = useState(null);
  const [activeType, setActiveType] = useState('writing');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedSubs, setSelectedSubs] = useState(new Set()); // Set of "type:id"
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // Reset selection when switching type tab
  useEffect(() => { setSelectedSubs(new Set()); }, [activeType]);

  const searchUsers = async (q) => {
    const query = q !== undefined ? q : search;
    setLoading(true);
    try {
      const res = await authFetch(apiPath(`admin/users?search=${encodeURIComponent(query.trim())}`));
      setUsers(await res.json());
    } catch { showToast('Search failed.'); }
    finally { setLoading(false); }
  };

  const loadSubs = useCallback(async (user) => {
    setSelectedUser(user);
    setSelectedSubs(new Set());
    setLoading(true);
    try {
      const res = await authFetch(apiPath(`admin/submissions?userId=${user.id}`));
      if (!res.ok) throw new Error('Could not load submissions.');
      setSubs(await res.json());
    } catch (e) { showToast('Could not load submissions.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (initialUser) loadSubs(initialUser);
    else searchUsers('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUser, loadSubs]);

  const toggleSubSelect = (type, id) => {
    const key = `${type}:${id}`;
    setSelectedSubs((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };

  const currentList = subs?.[activeType] || [];
  const currentKeys = currentList.map((s) => `${activeType}:${s.id}`);
  const allSubsSelected = currentList.length > 0 && currentKeys.every((k) => selectedSubs.has(k));
  const someSubsSelected = !allSubsSelected && currentKeys.some((k) => selectedSubs.has(k));
  const toggleAllSubs = () => {
    setSelectedSubs((prev) => {
      const next = new Set(prev);
      if (allSubsSelected) currentKeys.forEach((k) => next.delete(k));
      else currentKeys.forEach((k) => next.add(k));
      return next;
    });
  };

  const selectedCurrentCount = currentKeys.filter((k) => selectedSubs.has(k)).length;

  const deleteSub = async (type, id) => {
    if (!window.confirm('Delete this submission?')) return;
    try {
      const res = await authFetch(apiPath(`admin/submissions/${type}/${id}`), { method: 'DELETE' });
      await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Could not delete submission.');
      setSubs((prev) => ({ ...prev, [type]: prev[type].filter((s) => s.id !== id) }));
      setSelectedSubs((prev) => { const next = new Set(prev); next.delete(`${type}:${id}`); return next; });
      showToast('Submission deleted.');
    } catch (e) { showToast('Could not delete submission.'); }
  };

  const bulkDeleteSubs = async () => {
    if (!window.confirm(`Delete ${selectedCurrentCount} selected submissions?`)) return;
    setBulkDeleting(true);
    try {
      const items = currentKeys
        .filter((k) => selectedSubs.has(k))
        .map((k) => { const [type, id] = k.split(':'); return { type, id: parseInt(id) }; });
      const res = await authFetch(apiPath('admin/submissions/bulk'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Could not delete selected submissions.');
      const deletedIds = new Set(items.map((i) => i.id));
      setSubs((prev) => ({ ...prev, [activeType]: prev[activeType].filter((s) => !deletedIds.has(s.id)) }));
      setSelectedSubs((prev) => { const next = new Set(prev); currentKeys.filter((k) => selectedSubs.has(k)).forEach((k) => next.delete(k)); return next; });
      showToast('Selected submissions deleted.');
    } catch (e) { showToast('Could not delete selected submissions.'); }
    finally { setBulkDeleting(false); }
  };

  const renderSubRow = (type, sub) => {
    const name = type === 'cambridge' ? sub.studentName : sub.userName;
    const correctVal = sub.correct ?? sub.score;
    const totalVal = sub.total ?? sub.totalQuestions;
    const score = (correctVal !== undefined && totalVal) ? `${correctVal}/${totalVal}` : '—';
    const band = sub.band ? `Band ${sub.band}` : (sub.percentage != null ? `${sub.percentage}%` : '');
    const key = `${type}:${sub.id}`;
    return (
      <tr key={sub.id} style={{ ...s.tr, background: selectedSubs.has(key) ? '#fef2f2' : undefined }}>
        <td style={{ ...s.td, textAlign: 'center' }}>
          <input type="checkbox" checked={selectedSubs.has(key)} onChange={() => toggleSubSelect(type, sub.id)} />
        </td>
        <td style={{ ...s.td, fontSize: 12, color: '#9ca3af' }}>{sub.id}</td>
        <td style={s.td}>{name || '—'}</td>
        <td style={{ ...s.td, fontSize: 12 }}>Test #{sub.testId || '—'}{sub.testType ? ` (${sub.testType})` : ''}</td>
        <td style={s.td}>{score} {band && <span style={{ color: '#2563eb', fontSize: 12 }}>{band}</span>}</td>
        <td style={{ ...s.td, fontSize: 12, color: '#9ca3af' }}>{fmtDate(sub.createdAt)}</td>
        <td style={{ ...s.td, textAlign: 'center' }}>
          <button style={s.btnSmRed} onClick={() => deleteSub(type, sub.id)} title="Delete submission">Delete</button>
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
          placeholder="Search by user name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
        />
        <button style={s.btnBlue} onClick={searchUsers} disabled={loading}>Search</button>
      </div>

      {users.length > 0 && !selectedUser && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Choose a user to view submissions:</p>
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
            <span style={{ fontSize: 14 }}>Submissions for: <strong>{selectedUser.name}</strong> ({selectedUser.phone})</span>
            <button style={s.btnSmGray} onClick={() => { setSelectedUser(null); setSubs(null); setUsers([]); setSearch(''); setSelectedSubs(new Set()); }}>Close</button>
          </div>

          {loading && <p style={{ color: '#888', textAlign: 'center' }}>Loading submissions...</p>}

          {subs && !loading && (
            <>
              {/* Type tabs */}
              <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb' }}>
                {SUB_TYPES.map((t) => (
                  <button
                    key={t} onClick={() => setActiveType(t)}
                    style={{ ...s.tabBtn, ...(activeType === t ? s.tabBtnActive : {}) }}
                  >
                    {SUB_LABELS[t]} <span style={{ fontSize: 11, opacity: 0.7 }}>({subs[t]?.length || 0})</span>
                  </button>
                ))}
              </div>

              {/* Bulk bar for submissions */}
              {selectedCurrentCount > 0 && (
                <div style={s.bulkBar}>
                  <span style={{ fontSize: 14 }}>Selected <strong>{selectedCurrentCount}</strong> submissions</span>
                  <button style={s.btnRed} onClick={bulkDeleteSubs} disabled={bulkDeleting}>
                    {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedCurrentCount})`}
                  </button>
                  <button style={s.btnGray} onClick={() => setSelectedSubs(new Set())} disabled={bulkDeleting}>Clear Selection</button>
                </div>
              )}

              <div style={{ overflowX: 'auto', marginTop: 0 }}>
                <table style={{ ...s.table, borderRadius: '0 0 8px 8px' }}>
                  <thead>
                    <tr>
                      <th style={{ ...s.th, width: 36, textAlign: 'center' }}>
                        <input
                          type="checkbox" checked={allSubsSelected}
                          ref={(el) => { if (el) el.indeterminate = someSubsSelected; }}
                          onChange={toggleAllSubs}
                        />
                      </th>
                      <th style={s.th}>ID</th>
                      <th style={s.th}>Name</th>
                      <th style={s.th}>Test</th>
                      <th style={s.th}>Score</th>
                      <th style={s.th}>Date</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentList.map((sub) => renderSubRow(activeType, sub))}
                    {currentList.length === 0 && (
                      <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', color: '#9ca3af' }}>No {SUB_LABELS[activeType]} submissions.</td></tr>
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

// ─── Tab: Duplicates ──────────────────────────────────────────────────────────
const DuplicatesTab = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch(apiPath('admin/users/duplicates'));
      if (!res.ok) throw new Error('Could not load duplicate users.');
      setGroups(await res.json());
    } catch (e) { showToast('Could not load duplicate users.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const deleteUser = async (user, groupIdx) => {
    if (!window.confirm(`Delete user "${user.name}" (${user.phone})?`)) return;
    try {
      const res = await authFetch(apiPath(`admin/users/${user.id}`), { method: 'DELETE' });
      await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Could not delete user.');
      setGroups((prev) => {
        const updated = prev.map((g, i) => i === groupIdx ? g.filter((u) => u.id !== user.id) : g);
        return updated.filter((g) => g.length > 1);
      });
      showToast('User deleted.');
    } catch (e) { showToast('Could not delete user.'); }
  };

  return (
    <div>
      {toast && <div style={s.toast}>{toast}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
          Find users registered with <strong>duplicate names</strong> using case-insensitive matching.
        </p>
        <button style={s.btnBlue} onClick={load} disabled={loading}>Reload</button>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#888' }}>Searching...</p>}

      {!loading && groups.length === 0 && (
        <p style={{ textAlign: 'center', color: '#22c55e', fontWeight: 600, marginTop: 40 }}>No duplicate names found.</p>
      )}

      {groups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 20, border: '1px solid #fcd34d', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#fef9c3', padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#92400e' }}>
            Duplicate name: "{group[0].name}" — {group.length} accounts
          </div>
          <table style={{ ...s.table, borderRadius: 0, boxShadow: 'none' }}>
            <thead>
              <tr>
                <th style={s.th}>ID</th>
                <th style={s.th}>Name</th>
                <th style={s.th}>Phone</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Role</th>
                <th style={s.th}>Created</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Delete</th>
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
                    <button style={s.btnSmRed} onClick={() => deleteUser(u, gi)} title="Delete user">Delete</button>
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
  { id: 'users', label: 'Users' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'duplicates', label: 'Duplicates' },
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
      <div className="admin-page admin-submission-page" style={s.page}>
        <div style={s.headerCard}>
          <div style={s.kicker}>Admin</div>
          <h2 style={s.title}>User and Submission Management</h2>
          <p style={s.subtitle}>Manage user accounts, stored submissions, and duplicate registrations from one place.</p>
        </div>

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
  page: { maxWidth: '100%', width: '100%', margin: '0 auto', padding: '30px 16px', boxSizing: 'border-box' },
  headerCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #edf4ff 100%)',
    border: '1px solid #dbe7ff',
    borderRadius: 20,
    padding: '22px 24px',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
    marginBottom: 18,
  },
  kicker: { fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0e276f', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 800, margin: '0 0 8px', color: '#0f172a' },
  subtitle: { margin: 0, fontSize: 15, lineHeight: 1.6, color: '#475569' },
  tabBar: { display: 'flex', gap: 8, flexWrap: 'wrap', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 8, marginBottom: 18, boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)' },
  tabBtn: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#475569', transition: 'all 0.2s ease' },
  tabBtnActive: { background: '#0e276f', borderColor: '#0e276f', color: '#ffffff', boxShadow: '0 10px 22px rgba(14, 39, 111, 0.18)' },
  tabContent: { background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e5e7eb', boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 14, overflow: 'hidden' },
  th: { background: '#f8fafc', padding: '12px 12px', textAlign: 'left', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#475569', borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '9px 12px', fontSize: 14, verticalAlign: 'middle' },
  input: { border: '1px solid #d1d5db', borderRadius: 10, padding: '9px 12px', fontSize: 14, width: '100%', boxSizing: 'border-box', margin: '4px 0 10px' },
  label: { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginTop: 4 },
  btnBlue: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  btnRed: { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  btnGray: { background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  btnSmRed: { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  btnSmBlue: { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  btnSmGray: { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal: { background: '#fff', borderRadius: 18, padding: 24, width: '90%', maxWidth: 420, boxShadow: '0 24px 60px rgba(15,23,42,0.25)', border: '1px solid #e5e7eb' },
  modalBtns: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 },
  errText: { color: '#dc2626', fontSize: 13, margin: '4px 0 0' },
  toast: { position: 'fixed', bottom: 24, right: 24, background: '#0f172a', color: '#fff', padding: '12px 18px', borderRadius: 12, fontSize: 14, zIndex: 9999, boxShadow: '0 16px 36px rgba(15,23,42,0.28)' },
  userChip: { background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', marginRight: 8, marginBottom: 8, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 },
  bulkBar: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 7, padding: '9px 14px', marginBottom: 12, flexWrap: 'wrap' },
};

export default AdminUserManagement;

