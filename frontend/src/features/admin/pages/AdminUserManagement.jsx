import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../../../shared/components/AdminNavbar';
import { SubmissionStatCards, getSubmissionTone } from '../components/SubmissionCardList';
import {
  AdminActionGroup,
  AdminCardList,
  AdminEmptyCard,
  AdminListCard,
  AdminListSummary,
  AdminSelectionToolbar,
  FilterField,
  adminCardStyles as acs,
} from '../components/AdminCardPrimitives';
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

const TEST_BUCKETS = [
  { id: 'ixWriting', label: 'IX Writing' },
  { id: 'ixReading', label: 'IX Reading' },
  { id: 'ixListening', label: 'IX Listening' },
  { id: 'cambridge', label: 'Cambridge' },
];

const getAdminTestBucketFromScope = (scope) => {
  switch (scope) {
    case 'ix-writing':
      return 'ixWriting';
    case 'ix-reading':
      return 'ixReading';
    case 'ix-listening':
      return 'ixListening';
    default:
      return 'cambridge';
  }
};

const getCambridgeLevelKey = (test = {}) => String(test.testType || '').trim().toLowerCase().split('-')[0] || '';

const getAdminTestTypeLabel = (test = {}) => {
  if (test.typeLabel) return test.typeLabel;
  if (test.deleteScope === 'ix-writing') return 'IX Writing';
  if (test.deleteScope === 'ix-reading') return 'IX Reading';
  if (test.deleteScope === 'ix-listening') return 'IX Listening';
  if (test.deleteScope === 'cambridge-writing') return 'PET Writing';
  if (test.deleteScope === 'cambridge-reading') return 'Cambridge Reading';
  if (test.deleteScope === 'cambridge-listening') return 'Cambridge Listening';
  return 'Test';
};

const getAdminTestEditPath = (test = {}) => {
  switch (test.deleteScope) {
    case 'ix-writing':
      return `/edit-test/${test.id}`;
    case 'ix-reading':
      return `/reading-tests/${test.id}/edit`;
    case 'ix-listening':
      return `/listening/${test.id}/edit`;
    case 'cambridge-writing':
      return `/admin/edit-pet-writing/${test.id}`;
    case 'cambridge-reading':
      return `/cambridge/reading/${test.id}/edit`;
    case 'cambridge-listening':
      return `/cambridge/listening/${test.id}/edit`;
    default:
      return null;
  }
};

const testCountBadge = (count = 0) => {
  const hasSubmissions = Number(count) > 0;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 36,
      padding: '3px 10px',
      borderRadius: 999,
      background: hasSubmissions ? '#fff7ed' : '#f8fafc',
      color: hasSubmissions ? '#c2410c' : '#475569',
      border: `1px solid ${hasSubmissions ? '#fdba74' : '#e2e8f0'}`,
      fontSize: 12,
      fontWeight: 700,
    }}>
      {count}
    </span>
  );
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const uniqueSortedValues = (values = []) =>
  Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));

const getUserCardTone = (role) => {
  switch (role) {
    case 'admin':
      return { accent: '#f59e0b', border: '#fcd34d' };
    case 'teacher':
      return { accent: '#2563eb', border: '#bfdbfe' };
    default:
      return { accent: '#64748b', border: '#e2e8f0' };
  }
};

const getTestVisibilityMeta = (test = {}) => {
  const normalizedStatus = normalizeText(test.status);
  const hiddenFromStudents = typeof test.hiddenFromStudents === 'boolean'
    ? test.hiddenFromStudents
    : normalizedStatus
    ? normalizedStatus !== 'published'
    : Boolean(test.isArchived);

  if (hiddenFromStudents) {
    return {
      hiddenFromStudents: true,
      label: 'Hidden from students',
      bg: '#f1f5f9',
      color: '#475569',
      border: '#cbd5e1',
      accent: '#64748b',
    };
  }

  return {
    hiddenFromStudents: false,
    label: 'Visible to students',
    bg: '#dcfce7',
    color: '#166534',
    border: '#bbf7d0',
    accent: '#16a34a',
  };
};

const getTestCardTone = (test = {}) => {
  const visibility = getTestVisibilityMeta(test);
  if (visibility.hiddenFromStudents) {
    return { accent: '#64748b', border: '#cbd5e1' };
  }

  if (Number(test.submissionCount || 0) > 0) {
    return { accent: '#2563eb', border: '#bfdbfe' };
  }

  return { accent: '#0f766e', border: '#99f6e4' };
};

const getSubmissionDisplayName = (type, sub) => (type === 'cambridge' ? sub.studentName : sub.userName) || '—';

const getSubmissionStatusMeta = (type, sub) => {
  if (type === 'writing') {
    return sub.feedback
      ? { label: 'Feedback sent', variant: 'reviewed' }
      : { label: 'Waiting review', variant: 'pending' };
  }

  if (type === 'cambridge') {
    return { label: 'Submitted', variant: 'active' };
  }

  return { label: 'Submitted', variant: 'active' };
};

const getSubmissionScoreSummary = (type, sub) => {
  const correctVal = sub.correct ?? sub.score;
  const totalVal = sub.total ?? sub.totalQuestions;
  if (correctVal !== undefined && totalVal) {
    return `${correctVal}/${totalVal}`;
  }
  if (type === 'writing') {
    return sub.feedback ? 'Feedback ready' : 'Pending review';
  }
  if (sub.percentage != null) {
    return `${sub.percentage}%`;
  }
  return '—';
};

const getSubmissionBandSummary = (sub) => {
  if (sub.band != null && sub.band !== '') {
    return `Band ${sub.band}`;
  }
  if (sub.percentage != null) {
    return `${sub.percentage}%`;
  }
  return '—';
};

const getSubmissionTestSummary = (type, sub) => {
  if (type === 'cambridge') {
    return `Test #${sub.testId || '—'}${sub.testType ? ` · ${String(sub.testType).toUpperCase()}` : ''}`;
  }
  return `Test #${sub.testId || '—'}`;
};

const getSubmissionMetaItems = (type, sub) => {
  const items = [
    { label: 'Test', value: getSubmissionTestSummary(type, sub) },
    { label: 'Score', value: getSubmissionScoreSummary(type, sub) },
    { label: 'Band / Result', value: getSubmissionBandSummary(sub) },
    { label: 'Created', value: fmtDate(sub.createdAt) },
  ];

  if (type === 'writing') {
    items.push({ label: 'Phone', value: sub.userPhone || '—' });
  }

  return items;
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

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('');
  };

  const userStats = useMemo(() => ([
    {
      key: 'total',
      label: 'Total',
      count: users.length,
      bg: '#dbeafe',
      border: '#bfdbfe',
      color: '#1d4ed8',
    },
    {
      key: 'students',
      label: 'Students',
      count: users.filter((user) => user.role === 'student').length,
      bg: '#f8fafc',
      border: '#e2e8f0',
      color: '#475569',
    },
    {
      key: 'teachers',
      label: 'Teachers',
      count: users.filter((user) => user.role === 'teacher').length,
      bg: '#eff6ff',
      border: '#bfdbfe',
      color: '#1d4ed8',
    },
    {
      key: 'admins',
      label: 'Admins',
      count: users.filter((user) => user.role === 'admin').length,
      bg: '#fff7ed',
      border: '#fed7aa',
      color: '#c2410c',
    },
  ]), [users]);

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
      <SubmissionStatCards stats={userStats} />

      <div style={s.filterPanel}>
        <FilterField label="Search" minWidth={320}>
          <input
            style={{ ...s.input, margin: 0 }}
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </FilterField>

        <FilterField label="Role" minWidth={180}>
          <select style={{ ...s.input, margin: 0 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </FilterField>

        <div style={s.filterActions}>
          <button style={s.btnBlue} onClick={load} disabled={loading}>Reload</button>
          <button style={s.btnGray} onClick={resetFilters} disabled={loading}>Reset</button>
        </div>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#888' }}>Loading users...</p>}

      {!loading && (
        <>
          <AdminListSummary>Showing <strong>{users.length}</strong> users</AdminListSummary>
          {users.length === 0 ? (
            <AdminEmptyCard>No users found for the current filters.</AdminEmptyCard>
          ) : (
            <AdminCardList>
              {users.map((u) => {
                const tone = getUserCardTone(u.role);
                return (
                  <AdminListCard
                    key={u.id}
                    accent={tone.accent}
                    borderColor={tone.border}
                    leading={<span style={acs.idPill}>#{u.id}</span>}
                    title={u.name}
                    badges={[
                      roleBadge(u.role),
                      u.role === 'teacher' && u.canManageTests ? <span style={acs.softPill}>Can manage tests</span> : null,
                    ]}
                    subtitle={`Created ${fmtDate(u.createdAt)}`}
                    actions={(
                      <>
                        <button style={s.btnSmGray} onClick={() => setEditModal(u)} title="Edit user">Edit</button>
                        <button style={s.btnSmGray} onClick={() => setPwModal(u)} title="Reset password">Password</button>
                        <button style={s.btnSmBlue} onClick={() => onViewSubmissions(u)} title="View submissions">Submissions</button>
                        <button style={s.btnSmRed} onClick={() => setDelConfirm(u)} title="Delete user">Delete</button>
                      </>
                    )}
                    metaItems={[
                      { label: 'Phone', value: u.phone || '—' },
                      { label: 'Email', value: u.email || '—' },
                      { label: 'Role', value: roleBadge(u.role) },
                      { label: 'Created', value: fmtDate(u.createdAt) },
                    ]}
                  />
                );
              })}
            </AdminCardList>
          )}
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

  const resetSearch = () => {
    setSearch('');
    if (!selectedUser) {
      searchUsers('');
    }
  };

  const closeSelection = () => {
    setSelectedUser(null);
    setSubs(null);
    setSelectedSubs(new Set());
    searchUsers(search || '');
  };

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

  const userSearchStats = useMemo(() => ([
    {
      key: 'matches',
      label: 'Matches',
      count: users.length,
      bg: '#dbeafe',
      border: '#bfdbfe',
      color: '#1d4ed8',
    },
    {
      key: 'students',
      label: 'Students',
      count: users.filter((user) => user.role === 'student').length,
      bg: '#f8fafc',
      border: '#e2e8f0',
      color: '#475569',
    },
    {
      key: 'teachers',
      label: 'Teachers',
      count: users.filter((user) => user.role === 'teacher').length,
      bg: '#eff6ff',
      border: '#bfdbfe',
      color: '#1d4ed8',
    },
    {
      key: 'admins',
      label: 'Admins',
      count: users.filter((user) => user.role === 'admin').length,
      bg: '#fff7ed',
      border: '#fed7aa',
      color: '#c2410c',
    },
  ]), [users]);

  const submissionStats = useMemo(() => {
    if (!subs) return [];
    const total = SUB_TYPES.reduce((count, type) => count + (subs[type]?.length || 0), 0);
    return [
      {
        key: 'total',
        label: 'Total',
        count: total,
        bg: '#dbeafe',
        border: '#bfdbfe',
        color: '#1d4ed8',
      },
      {
        key: 'writing',
        label: 'Writing',
        count: subs.writing?.length || 0,
        bg: '#fff7ed',
        border: '#fed7aa',
        color: '#c2410c',
      },
      {
        key: 'reading',
        label: 'Reading',
        count: subs.reading?.length || 0,
        bg: '#eff6ff',
        border: '#bfdbfe',
        color: '#1d4ed8',
      },
      {
        key: 'listening',
        label: 'Listening',
        count: subs.listening?.length || 0,
        bg: '#ecfeff',
        border: '#a5f3fc',
        color: '#0f766e',
      },
      {
        key: 'cambridge',
        label: 'Orange',
        count: subs.cambridge?.length || 0,
        bg: '#f5f3ff',
        border: '#ddd6fe',
        color: '#6d28d9',
      },
    ];
  }, [subs]);

  const deleteListedUser = async (user) => {
    if (!window.confirm(`Delete user "${user.name}" (${user.phone})?`)) return;

    try {
      const res = await authFetch(apiPath(`admin/users/${user.id}`), { method: 'DELETE' });
      await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Could not delete user.');

      setUsers((prev) => prev.filter((candidate) => candidate.id !== user.id));
      if (selectedUser?.id === user.id) {
        setSelectedUser(null);
        setSubs(null);
        setSelectedSubs(new Set());
      }
      showToast('User deleted.');
    } catch (_err) {
      showToast('Could not delete user.');
    }
  };

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

  return (
    <div>
      {toast && <div style={s.toast}>{toast}</div>}

      <div style={s.filterPanel}>
        <FilterField label="Search user" minWidth={320}>
          <input
            style={{ ...s.input, margin: 0 }}
            placeholder="Search by user name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
          />
        </FilterField>

        <div style={s.filterActions}>
          <button style={s.btnBlue} onClick={searchUsers} disabled={loading}>Search</button>
          <button style={s.btnGray} onClick={resetSearch} disabled={loading}>Reset</button>
        </div>
      </div>

      {!selectedUser && <SubmissionStatCards stats={userSearchStats} />}

      {!selectedUser && loading && <p style={{ textAlign: 'center', color: '#888' }}>Searching users...</p>}

      {!selectedUser && !loading && (
        <>
          <AdminListSummary>Choose a user to view submissions.</AdminListSummary>
          {users.length === 0 ? (
            <AdminEmptyCard>No users found for the current search.</AdminEmptyCard>
          ) : (
            <AdminCardList>
              {users.map((u) => {
                const tone = getUserCardTone(u.role);
                return (
                  <AdminListCard
                    key={u.id}
                    accent={tone.accent}
                    borderColor={tone.border}
                    leading={<span style={acs.idPill}>#{u.id}</span>}
                    title={u.name}
                    badges={[roleBadge(u.role)]}
                    subtitle="Open this user to manage writing, reading, listening, and Orange submissions."
                    actions={(
                      <>
                        <button style={s.btnSmBlue} onClick={() => loadSubs(u)}>Open submissions</button>
                        <button style={s.btnSmRed} onClick={() => deleteListedUser(u)} title="Delete user">Delete</button>
                      </>
                    )}
                    metaItems={[
                      { label: 'Phone', value: u.phone || '—' },
                      { label: 'Email', value: u.email || '—' },
                      { label: 'Role', value: roleBadge(u.role) },
                      { label: 'Created', value: fmtDate(u.createdAt) },
                    ]}
                  />
                );
              })}
            </AdminCardList>
          )}
        </>
      )}

      {selectedUser && (
        <>
          <AdminListCard
            accent="#0e276f"
            borderColor="#bfdbfe"
            leading={<span style={acs.idPill}>#{selectedUser.id}</span>}
            title={selectedUser.name}
            badges={[roleBadge(selectedUser.role)]}
            subtitle="Manage all submissions for this user across Writing, Reading, Listening, and Orange."
            actions={(
              <>
                <button style={s.btnSmGray} onClick={closeSelection}>Back to user list</button>
                <button style={s.btnSmRed} onClick={() => deleteListedUser(selectedUser)}>Delete user</button>
              </>
            )}
            metaItems={[
              { label: 'Phone', value: selectedUser.phone || '—' },
              { label: 'Email', value: selectedUser.email || '—' },
              { label: 'Role', value: roleBadge(selectedUser.role) },
              { label: 'Created', value: fmtDate(selectedUser.createdAt) },
            ]}
            style={{ marginBottom: 16 }}
          />

          {loading && <p style={{ color: '#888', textAlign: 'center' }}>Loading submissions...</p>}

          {subs && !loading && (
            <>
              <SubmissionStatCards stats={submissionStats} />

              <div style={{ ...s.tabBar, marginBottom: 12 }}>
                {SUB_TYPES.map((t) => (
                  <button
                    key={t} onClick={() => setActiveType(t)}
                    style={{ ...s.tabBtn, ...(activeType === t ? s.tabBtnActive : {}) }}
                  >
                    {SUB_LABELS[t]} <span style={{ fontSize: 11, opacity: 0.7 }}>({subs[t]?.length || 0})</span>
                  </button>
                ))}
              </div>

              <AdminSelectionToolbar>
                <span style={acs.selectionSummary}>
                  Showing <strong>{currentList.length}</strong> {SUB_LABELS[activeType].toLowerCase()} submissions
                </span>
                <AdminActionGroup>
                  {currentList.length > 0 ? (
                    <button style={s.btnSmGray} onClick={toggleAllSubs}>
                      {allSubsSelected ? 'Unselect all' : someSubsSelected ? 'Select all visible' : 'Select all visible'}
                    </button>
                  ) : null}
                  {selectedCurrentCount > 0 ? (
                    <button style={s.btnSmGray} onClick={() => setSelectedSubs(new Set())} disabled={bulkDeleting}>Clear selection</button>
                  ) : null}
                </AdminActionGroup>
              </AdminSelectionToolbar>

              {selectedCurrentCount > 0 && (
                <div style={s.bulkBar}>
                  <span style={{ fontSize: 14 }}>Selected <strong>{selectedCurrentCount}</strong> submissions</span>
                  <button style={s.btnRed} onClick={bulkDeleteSubs} disabled={bulkDeleting}>
                    {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedCurrentCount})`}
                  </button>
                  <button style={s.btnGray} onClick={() => setSelectedSubs(new Set())} disabled={bulkDeleting}>Clear Selection</button>
                </div>
              )}

              {currentList.length === 0 ? (
                <AdminEmptyCard>No {SUB_LABELS[activeType]} submissions for this user.</AdminEmptyCard>
              ) : (
                <AdminCardList>
                  {currentList.map((sub) => {
                    const key = `${activeType}:${sub.id}`;
                    const statusMeta = getSubmissionStatusMeta(activeType, sub);
                    const tone = getSubmissionTone(statusMeta.variant);
                    const isSelected = selectedSubs.has(key);

                    return (
                      <AdminListCard
                        key={key}
                        accent={isSelected ? '#f59e0b' : tone.accent}
                        borderColor={isSelected ? '#f59e0b' : tone.border}
                        leading={(
                          <>
                            <label style={acs.selectionCheckboxLabel}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSubSelect(activeType, sub.id)}
                              />
                            </label>
                            <span style={acs.idPill}>#{sub.id}</span>
                          </>
                        )}
                        title={getSubmissionDisplayName(activeType, sub)}
                        badges={[
                          <span style={{ ...acs.statusPill, background: tone.chipBg, color: tone.chipColor, borderColor: tone.border }}>
                            {statusMeta.label}
                          </span>,
                        ]}
                        subtitle={getSubmissionTestSummary(activeType, sub)}
                        actions={<button style={s.btnSmRed} onClick={() => deleteSub(activeType, sub.id)} title="Delete submission">Delete</button>}
                        metaItems={getSubmissionMetaItems(activeType, sub)}
                        style={{
                          borderColor: isSelected ? '#f59e0b' : tone.border,
                          boxShadow: isSelected ? '0 0 0 2px rgba(245, 158, 11, 0.18)' : '0 8px 24px rgba(15, 23, 42, 0.04)',
                        }}
                      />
                    );
                  })}
                </AdminCardList>
              )}
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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
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

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('');
  };

  const filteredGroups = useMemo(() => {
    const normalizedQuery = normalizeText(search);
    return groups.filter((group) => group.some((user) => {
      if (roleFilter && user.role !== roleFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [user.id, user.name, user.phone, user.email, user.role]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');

      return haystack.includes(normalizedQuery);
    }));
  }, [groups, roleFilter, search]);

  const duplicateStats = useMemo(() => {
    const accounts = filteredGroups.flat();
    return [
      {
        key: 'groups',
        label: 'Groups',
        count: filteredGroups.length,
        bg: '#fef3c7',
        border: '#fcd34d',
        color: '#92400e',
      },
      {
        key: 'accounts',
        label: 'Accounts',
        count: accounts.length,
        bg: '#dbeafe',
        border: '#bfdbfe',
        color: '#1d4ed8',
      },
      {
        key: 'students',
        label: 'Students',
        count: accounts.filter((user) => user.role === 'student').length,
        bg: '#f8fafc',
        border: '#e2e8f0',
        color: '#475569',
      },
      {
        key: 'staff',
        label: 'Teachers/Admins',
        count: accounts.filter((user) => user.role !== 'student').length,
        bg: '#eff6ff',
        border: '#bfdbfe',
        color: '#1d4ed8',
      },
    ];
  }, [filteredGroups]);

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete user "${user.name}" (${user.phone})?`)) return;
    try {
      const res = await authFetch(apiPath(`admin/users/${user.id}`), { method: 'DELETE' });
      await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Could not delete user.');
      setGroups((prev) => {
        const updated = prev.map((group) => group.filter((candidate) => candidate.id !== user.id));
        return updated.filter((group) => group.length > 1);
      });
      showToast('User deleted.');
    } catch (e) { showToast('Could not delete user.'); }
  };

  return (
    <div>
      {toast && <div style={s.toast}>{toast}</div>}

      <SubmissionStatCards stats={duplicateStats} />

      <div style={s.filterPanel}>
        <FilterField label="Search" minWidth={320}>
          <input
            style={{ ...s.input, margin: 0 }}
            placeholder="Filter duplicate groups by name, phone, email, or id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </FilterField>

        <FilterField label="Role" minWidth={180}>
          <select style={{ ...s.input, margin: 0 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </FilterField>

        <div style={s.filterActions}>
          <button style={s.btnBlue} onClick={load} disabled={loading}>Reload</button>
          <button style={s.btnGray} onClick={resetFilters} disabled={loading}>Reset</button>
        </div>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#888' }}>Searching...</p>}

      {!loading && (
        <>
          <AdminListSummary>
            Showing <strong>{filteredGroups.length}</strong> duplicate groups.
          </AdminListSummary>

          {filteredGroups.length === 0 ? (
            <AdminEmptyCard>No duplicate names found for the current filters.</AdminEmptyCard>
          ) : (
            <AdminCardList>
              {filteredGroups.map((group, gi) => {
                const studentsCount = group.filter((user) => user.role === 'student').length;
                const latestCreatedAt = group.reduce((latest, user) => {
                  if (!user.createdAt) return latest;
                  if (!latest) return user.createdAt;
                  return new Date(user.createdAt) > new Date(latest) ? user.createdAt : latest;
                }, null);

                return (
                  <AdminListCard
                    key={`${group[0]?.name || 'duplicate'}-${gi}`}
                    accent="#d97706"
                    borderColor="#fcd34d"
                    leading={<span style={s.groupTag}>Duplicate group</span>}
                    title={group[0]?.name || 'Unnamed user'}
                    badges={[
                      <span style={{ ...acs.statusPill, background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' }}>
                        {group.length} accounts
                      </span>,
                    ]}
                    subtitle="These accounts share the same normalized name. Check phone, email, and role before deleting a record."
                    metaItems={[
                      { label: 'Accounts', value: group.length },
                      { label: 'Students', value: studentsCount },
                      { label: 'Teachers/Admins', value: group.length - studentsCount },
                      { label: 'Latest created', value: fmtDate(latestCreatedAt) },
                    ]}
                  >
                    <AdminCardList style={s.duplicateNestedList}>
                      {group.map((u) => {
                        const tone = getUserCardTone(u.role);
                        return (
                          <AdminListCard
                            key={u.id}
                            accent={tone.accent}
                            borderColor={tone.border}
                            leading={<span style={acs.idPill}>#{u.id}</span>}
                            title={u.name}
                            badges={[roleBadge(u.role)]}
                            subtitle={u.phone || 'No phone number'}
                            actions={<button style={s.btnSmRed} onClick={() => deleteUser(u)} title="Delete user">Delete</button>}
                            metaItems={[
                              { label: 'Phone', value: u.phone || '—' },
                              { label: 'Email', value: u.email || '—' },
                              { label: 'Role', value: roleBadge(u.role) },
                              { label: 'Created', value: fmtDate(u.createdAt) },
                            ]}
                            style={s.duplicateNestedCard}
                          />
                        );
                      })}
                    </AdminCardList>
                  </AdminListCard>
                );
              })}
            </AdminCardList>
          )}
        </>
      )}
    </div>
  );
};

// ─── Tab: Tests ───────────────────────────────────────────────────────────────
const TestsTab = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState({ ixWriting: [], ixReading: [], ixListening: [], cambridge: [] });
  const [activeBucket, setActiveBucket] = useState('ixWriting');
  const [search, setSearch] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [cambridgeLevel, setCambridgeLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [updatingKey, setUpdatingKey] = useState('');
  const [deletingKey, setDeletingKey] = useState('');
  const [selectedTests, setSelectedTests] = useState(new Set());
  const [bulkVisibilityAction, setBulkVisibilityAction] = useState('');
  const [bulkDeletingTests, setBulkDeletingTests] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(apiPath('admin/tests'));
      if (!res.ok) throw new Error('Could not load tests.');
      const payload = await res.json();
      setTests({
        ixWriting: Array.isArray(payload.ixWriting) ? payload.ixWriting : [],
        ixReading: Array.isArray(payload.ixReading) ? payload.ixReading : [],
        ixListening: Array.isArray(payload.ixListening) ? payload.ixListening : [],
        cambridge: Array.isArray(payload.cambridge) ? payload.cambridge : [],
      });
    } catch (_err) {
      showToast('Could not load tests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setTeacherFilter('');
    setClassFilter('');
    setVisibilityFilter('all');
    setCambridgeLevel('');
    setSelectedTests(new Set());
  }, [activeBucket]);

  const bucketTests = useMemo(() => tests[activeBucket] || [], [activeBucket, tests]);

  const teacherOptions = useMemo(() => uniqueSortedValues(bucketTests.map((test) => test.teacherName)), [bucketTests]);
  const classOptions = useMemo(() => uniqueSortedValues(bucketTests.map((test) => test.classCode)), [bucketTests]);

  const bucketStats = useMemo(() => ([
    {
      key: 'total',
      label: 'Total',
      count: bucketTests.length,
      bg: '#dbeafe',
      border: '#bfdbfe',
      color: '#1d4ed8',
    },
    {
      key: 'visible',
      label: 'Visible',
      count: bucketTests.filter((test) => !getTestVisibilityMeta(test).hiddenFromStudents).length,
      bg: '#dcfce7',
      border: '#bbf7d0',
      color: '#166534',
    },
    {
      key: 'hidden',
      label: 'Hidden',
      count: bucketTests.filter((test) => getTestVisibilityMeta(test).hiddenFromStudents).length,
      bg: '#f1f5f9',
      border: '#cbd5e1',
      color: '#475569',
    },
    {
      key: 'linked',
      label: 'With submissions',
      count: bucketTests.filter((test) => Number(test.submissionCount || 0) > 0).length,
      bg: '#fff7ed',
      border: '#fed7aa',
      color: '#c2410c',
    },
  ]), [bucketTests]);

  const currentList = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return bucketTests.filter((test) => {
      if (activeBucket === 'cambridge' && cambridgeLevel && getCambridgeLevelKey(test) !== cambridgeLevel) {
        return false;
      }

      if (teacherFilter && String(test.teacherName || '').trim() !== teacherFilter) {
        return false;
      }

      if (classFilter && String(test.classCode || '').trim() !== classFilter) {
        return false;
      }

      const visibility = getTestVisibilityMeta(test);
      if (visibilityFilter === 'visible' && visibility.hiddenFromStudents) {
        return false;
      }

      if (visibilityFilter === 'hidden' && !visibility.hiddenFromStudents) {
        return false;
      }

      if (!normalizedQuery) return true;

      const haystack = [
        test.id,
        test.title,
        test.classCode,
        test.teacherName,
        test.testType,
        test.typeLabel,
        test.status,
      ].map((value) => String(value || '').toLowerCase()).join(' ');

      return haystack.includes(normalizedQuery);
    });
  }, [activeBucket, bucketTests, cambridgeLevel, classFilter, search, teacherFilter, visibilityFilter]);

  const cambridgeLevels = useMemo(() => {
    const levels = Array.from(new Set((tests.cambridge || []).map(getCambridgeLevelKey).filter(Boolean)));
    return levels.sort();
  }, [tests.cambridge]);

  const currentKeys = useMemo(
    () => currentList.map((test) => `${test.deleteScope}:${test.id}`),
    [currentList]
  );
  const selectedCurrentCount = currentKeys.filter((key) => selectedTests.has(key)).length;
  const allVisibleSelected = currentList.length > 0 && currentKeys.every((key) => selectedTests.has(key));
  const someVisibleSelected = !allVisibleSelected && currentKeys.some((key) => selectedTests.has(key));

  const resetFilters = () => {
    setSearch('');
    setTeacherFilter('');
    setClassFilter('');
    setVisibilityFilter('all');
    setCambridgeLevel('');
  };

  const toggleTestSelect = (test) => {
    const key = `${test.deleteScope}:${test.id}`;
    setSelectedTests((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllVisibleTests = () => {
    setSelectedTests((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) currentKeys.forEach((key) => next.delete(key));
      else currentKeys.forEach((key) => next.add(key));
      return next;
    });
  };

  const setTestVisibility = async (test, hidden) => {
    const updateKey = `${test.deleteScope}:${test.id}`;
    setUpdatingKey(updateKey);
    try {
      const res = await authFetch(apiPath(`admin/tests/${test.deleteScope}/${test.id}/visibility`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Could not update test visibility.');

      const bucket = getAdminTestBucketFromScope(test.deleteScope);
      const updatedTest = payload?.test || {};
      setTests((prev) => ({
        ...prev,
        [bucket]: (prev[bucket] || []).map((item) => (
          item.id === test.id && item.deleteScope === test.deleteScope
            ? {
                ...item,
                hiddenFromStudents: typeof updatedTest.hiddenFromStudents === 'boolean'
                  ? updatedTest.hiddenFromStudents
                  : hidden,
                status: updatedTest.status || (hidden ? 'archived' : 'published'),
              }
            : item
        )),
      }));
      showToast(hidden ? 'Test hidden from student lists.' : 'Test visible to students again.');
    } catch (_err) {
      showToast('Could not update test visibility.');
    } finally {
      setUpdatingKey('');
    }
  };

  const applyBulkVisibility = async (hidden) => {
    const selectedItems = currentList.filter((test) => selectedTests.has(`${test.deleteScope}:${test.id}`));
    if (!selectedItems.length) return;

    const actionLabel = hidden ? 'hide' : 'show';
    if (!window.confirm(`${actionLabel === 'hide' ? 'Hide' : 'Show'} ${selectedItems.length} selected tests ${hidden ? 'from students' : 'to students'}?`)) {
      return;
    }

    setBulkVisibilityAction(hidden ? 'hide' : 'show');
    try {
      const results = await Promise.allSettled(
        selectedItems.map(async (test) => {
          const res = await authFetch(apiPath(`admin/tests/${test.deleteScope}/${test.id}/visibility`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hidden }),
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error('Could not update test visibility.');
          return {
            key: `${test.deleteScope}:${test.id}`,
            scope: test.deleteScope,
            id: test.id,
            test: payload?.test || {},
          };
        })
      );

      const succeeded = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);

      if (!succeeded.length) {
        throw new Error('Could not update selected tests.');
      }

      const updates = new Map(
        succeeded.map((item) => [item.key, item])
      );

      setTests((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((bucket) => {
          next[bucket] = (next[bucket] || []).map((item) => {
            const key = `${item.deleteScope}:${item.id}`;
            const match = updates.get(key);
            if (!match) return item;
            return {
              ...item,
              hiddenFromStudents: typeof match.test.hiddenFromStudents === 'boolean'
                ? match.test.hiddenFromStudents
                : hidden,
              status: match.test.status || (hidden ? 'archived' : 'published'),
            };
          });
        });
        return next;
      });

      setSelectedTests((prev) => {
        const next = new Set(prev);
        succeeded.forEach((item) => next.delete(item.key));
        return next;
      });

      if (succeeded.length === selectedItems.length) {
        showToast(hidden ? 'Selected tests hidden from student lists.' : 'Selected tests visible to students again.');
      } else {
        showToast(hidden
          ? `${succeeded.length}/${selectedItems.length} selected tests hidden.`
          : `${succeeded.length}/${selectedItems.length} selected tests shown.`);
      }
    } catch (_err) {
      showToast('Could not update selected tests.');
    } finally {
      setBulkVisibilityAction('');
    }
  };

  const bulkDeleteTests = async () => {
    const selectedItems = currentList.filter((test) => selectedTests.has(`${test.deleteScope}:${test.id}`));
    if (!selectedItems.length) return;

    if (!window.confirm(`Delete ${selectedItems.length} selected tests permanently? This cannot be undone.`)) {
      return;
    }

    setBulkDeletingTests(true);
    try {
      const results = await Promise.allSettled(
        selectedItems.map(async (test) => {
          const res = await authFetch(apiPath(`admin/tests/${test.deleteScope}/${test.id}`), { method: 'DELETE' });
          await res.json().catch(() => ({}));
          if (!res.ok) throw new Error('Could not delete test.');
          return { key: `${test.deleteScope}:${test.id}` };
        })
      );

      const succeeded = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value.key);

      if (!succeeded.length) {
        throw new Error('Could not delete selected tests.');
      }

      const succeededSet = new Set(succeeded);
      setTests((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((bucket) => {
          next[bucket] = (next[bucket] || []).filter((item) => !succeededSet.has(`${item.deleteScope}:${item.id}`));
        });
        return next;
      });

      setSelectedTests((prev) => {
        const next = new Set(prev);
        succeeded.forEach((key) => next.delete(key));
        return next;
      });

      if (succeeded.length === selectedItems.length) {
        showToast('Selected tests deleted permanently.');
      } else {
        showToast(`${succeeded.length}/${selectedItems.length} selected tests deleted.`);
      }
    } catch (_err) {
      showToast('Could not delete selected tests.');
    } finally {
      setBulkDeletingTests(false);
    }
  };

  const deleteTest = async (test) => {
    if (!window.confirm(`Delete test "${test.title}" permanently? This cannot be undone.`)) return;

    const deleteKey = `${test.deleteScope}:${test.id}`;
    setDeletingKey(deleteKey);
    try {
      const res = await authFetch(apiPath(`admin/tests/${test.deleteScope}/${test.id}`), { method: 'DELETE' });
      await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Could not delete test.');

      const bucket = getAdminTestBucketFromScope(test.deleteScope);
      setTests((prev) => ({
        ...prev,
        [bucket]: (prev[bucket] || []).filter((item) => !(item.id === test.id && item.deleteScope === test.deleteScope)),
      }));
      setSelectedTests((prev) => {
        const next = new Set(prev);
        next.delete(`${test.deleteScope}:${test.id}`);
        return next;
      });
      showToast('Test deleted permanently.');
    } catch (_err) {
      showToast('Could not delete test.');
    } finally {
      setDeletingKey('');
    }
  };

  return (
    <div>
      {toast && <div style={s.toast}>{toast}</div>}

      <div style={s.infoCard}>
        <strong style={{ display: 'block', marginBottom: 6, color: '#7c2d12' }}>Admin note</strong>
        <span style={{ fontSize: 14, color: '#9a3412', lineHeight: 1.6 }}>
          Hide keeps submissions and review context intact. Use permanent delete only when a test must be removed completely to resolve parent or class complaints.
        </span>
      </div>

      <SubmissionStatCards stats={bucketStats} />

      <div style={{ ...s.tabBar, marginBottom: 16 }}>
        {TEST_BUCKETS.map((bucket) => (
          <button
            key={bucket.id}
            type="button"
            onClick={() => setActiveBucket(bucket.id)}
            style={{ ...s.tabBtn, ...(activeBucket === bucket.id ? s.tabBtnActive : {}) }}
          >
            {bucket.label} <span style={{ fontSize: 11, opacity: 0.72 }}>({tests[bucket.id]?.length || 0})</span>
          </button>
        ))}
      </div>

      <div style={s.filterPanel}>
        <FilterField label="Search" minWidth={280}>
          <input
            style={{ ...s.input, margin: 0 }}
            placeholder="Search by title, class, teacher, level, or id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </FilterField>

        <FilterField label="Teacher" minWidth={180}>
          <select style={{ ...s.input, margin: 0 }} value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)}>
            <option value="">All teachers</option>
            {teacherOptions.map((teacher) => (
              <option key={teacher} value={teacher}>{teacher}</option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Class" minWidth={180}>
          <select style={{ ...s.input, margin: 0 }} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">All classes</option>
            {classOptions.map((classCode) => (
              <option key={classCode} value={classCode}>{classCode}</option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Visibility" minWidth={180}>
          <select style={{ ...s.input, margin: 0 }} value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)}>
            <option value="all">All visibility</option>
            <option value="visible">Visible to students</option>
            <option value="hidden">Hidden from students</option>
          </select>
        </FilterField>

        {activeBucket === 'cambridge' && (
          <FilterField label="Level" minWidth={180}>
            <select
              style={{ ...s.input, margin: 0 }}
              value={cambridgeLevel}
              onChange={(e) => setCambridgeLevel(e.target.value)}
            >
              <option value="">All levels</option>
              {cambridgeLevels.map((level) => (
                <option key={level} value={level}>{level.toUpperCase()}</option>
              ))}
            </select>
          </FilterField>
        )}

        <div style={s.filterActions}>
          <button style={s.btnBlue} onClick={load} disabled={loading}>Reload</button>
          <button style={s.btnGray} onClick={resetFilters} disabled={loading}>Reset</button>
        </div>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#888' }}>Loading tests...</p>}

      {!loading && (
        <>
          <AdminListSummary>
            Showing <strong>{currentList.length}</strong>
            {bucketTests.length !== currentList.length ? ` / ${bucketTests.length}` : ''} tests
          </AdminListSummary>

          <AdminSelectionToolbar>
            <span style={acs.selectionSummary}>
              Showing <strong>{currentList.length}</strong> {TEST_BUCKETS.find((bucket) => bucket.id === activeBucket)?.label || 'tests'} items
            </span>
            <AdminActionGroup>
              {currentList.length > 0 ? (
                <button style={s.btnSmGray} onClick={toggleAllVisibleTests}>
                  {allVisibleSelected ? 'Unselect all' : someVisibleSelected ? 'Select all visible' : 'Select all visible'}
                </button>
              ) : null}
              {selectedCurrentCount > 0 ? (
                <button style={s.btnSmGray} onClick={() => setSelectedTests(new Set())} disabled={Boolean(bulkVisibilityAction) || bulkDeletingTests}>
                  Clear selection
                </button>
              ) : null}
            </AdminActionGroup>
          </AdminSelectionToolbar>

          {selectedCurrentCount > 0 ? (
            <div style={s.bulkBar}>
              <span style={{ fontSize: 14 }}>Selected <strong>{selectedCurrentCount}</strong> tests</span>
              <button style={s.btnSmAmber} onClick={() => applyBulkVisibility(true)} disabled={Boolean(bulkVisibilityAction)}>
                {bulkVisibilityAction === 'hide' ? 'Hiding...' : `Hide Selected (${selectedCurrentCount})`}
              </button>
              <button style={s.btnSmGreen} onClick={() => applyBulkVisibility(false)} disabled={Boolean(bulkVisibilityAction)}>
                {bulkVisibilityAction === 'show' ? 'Showing...' : `Show Selected (${selectedCurrentCount})`}
              </button>
              <button style={s.btnRed} onClick={bulkDeleteTests} disabled={Boolean(bulkVisibilityAction) || bulkDeletingTests}>
                {bulkDeletingTests ? 'Deleting...' : `Delete Selected (${selectedCurrentCount})`}
              </button>
              <button style={s.btnGray} onClick={() => setSelectedTests(new Set())} disabled={Boolean(bulkVisibilityAction) || bulkDeletingTests}>
                Clear Selection
              </button>
            </div>
          ) : null}

          {currentList.length === 0 ? (
            <AdminEmptyCard>No tests found for the current filters.</AdminEmptyCard>
          ) : (
            <AdminCardList>
              {currentList.map((test) => {
                const editPath = getAdminTestEditPath(test);
                const updateKey = `${test.deleteScope}:${test.id}`;
                const visibility = getTestVisibilityMeta(test);
                const tone = getTestCardTone(test);
                const isUpdating = updatingKey === updateKey;
                const isDeleting = deletingKey === updateKey;
                const isSelected = selectedTests.has(updateKey);

                return (
                  <AdminListCard
                    key={updateKey}
                    accent={isSelected ? '#f59e0b' : tone.accent}
                    borderColor={isSelected ? '#f59e0b' : tone.border}
                    leading={(
                      <>
                        <label style={acs.selectionCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTestSelect(test)}
                            disabled={isUpdating || isDeleting || Boolean(bulkVisibilityAction) || bulkDeletingTests}
                          />
                        </label>
                        <span style={acs.idPill}>#{test.id}</span>
                      </>
                    )}
                    title={test.title}
                    badges={[
                      <span style={{ ...acs.statusPill, background: visibility.bg, color: visibility.color, borderColor: visibility.border }}>
                        {visibility.label}
                      </span>,
                      <span style={s.typePill}>{getAdminTestTypeLabel(test)}</span>,
                    ]}
                    subtitle={`${test.totalQuestions ? `${test.totalQuestions} questions` : 'Question count varies by type'}${test.status ? ` • status ${test.status}` : ''}`}
                    actions={(
                      <>
                        {editPath ? (
                          <button style={s.btnSmBlue} onClick={() => navigate(editPath)} disabled={isUpdating || isDeleting || Boolean(bulkVisibilityAction) || bulkDeletingTests}>Edit</button>
                        ) : null}
                        <button
                          style={visibility.hiddenFromStudents ? s.btnSmGreen : s.btnSmAmber}
                          onClick={() => setTestVisibility(test, !visibility.hiddenFromStudents)}
                          disabled={isUpdating || isDeleting || Boolean(bulkVisibilityAction) || bulkDeletingTests}
                        >
                          {isUpdating
                            ? 'Saving...'
                            : visibility.hiddenFromStudents
                            ? 'Show to students'
                            : 'Hide from students'}
                        </button>
                        <button style={s.btnSmRed} onClick={() => deleteTest(test)} disabled={isUpdating || isDeleting || Boolean(bulkVisibilityAction) || bulkDeletingTests}>
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </>
                    )}
                    metaItems={[
                      { label: 'Teacher', value: test.teacherName || '—' },
                      { label: 'Class', value: test.classCode || '—' },
                      { label: 'Submissions', value: testCountBadge(test.submissionCount || 0) },
                      { label: 'Created', value: fmtDate(test.createdAt) },
                      { label: 'Updated', value: fmtDate(test.updatedAt) },
                    ]}
                    style={{
                      borderColor: isSelected ? '#f59e0b' : tone.border,
                      boxShadow: isSelected ? '0 0 0 2px rgba(245, 158, 11, 0.18)' : '0 8px 24px rgba(15, 23, 42, 0.04)',
                    }}
                  />
                );
              })}
            </AdminCardList>
          )}
        </>
      )}
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'tests', label: 'Tests' },
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
          {activeTab === 'tests' && <TestsTab />}
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
  tabBtnActive: { background: '#0e276f', border: '1px solid #0e276f', color: '#ffffff', boxShadow: '0 10px 22px rgba(14, 39, 111, 0.18)' },
  tabContent: { background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e5e7eb', boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)' },
  filterPanel: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16, padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: 16, background: '#f8fafc' },
  filterField: { display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 180px' },
  filterLabel: { fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' },
  filterActions: { display: 'flex', gap: 8, alignSelf: 'flex-end', flexWrap: 'wrap' },
  cardList: { display: 'flex', flexDirection: 'column', gap: 10 },
  managementCard: { display: 'flex', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' },
  managementCardAccent: { width: 5, flexShrink: 0, background: '#2563eb' },
  managementCardBody: { flex: 1, padding: '16px 18px' },
  managementCardTop: { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' },
  managementHeadingBlock: { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, flex: '1 1 320px' },
  managementHeadingLine: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  managementTitle: { fontSize: 18, color: '#0f172a' },
  managementSubline: { fontSize: 13, color: '#64748b', lineHeight: 1.6 },
  managementMetaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid #eef2f7' },
  metaItem: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  metaLabel: { fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#94a3b8' },
  metaValue: { fontSize: 14, color: '#334155', minHeight: 20, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  idPill: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px', borderRadius: 999, background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 800, border: '1px solid #e2e8f0' },
  softPill: { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: '#eef2ff', color: '#4338ca', fontSize: 12, fontWeight: 700, border: '1px solid #c7d2fe' },
  statusPill: { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, border: '1px solid transparent', fontSize: 12, fontWeight: 800 },
  listSummary: { fontSize: 13, color: '#64748b', marginBottom: 10 },
  emptyCard: { border: '1px dashed #cbd5e1', borderRadius: 16, padding: '24px 20px', textAlign: 'center', color: '#64748b', background: '#f8fafc' },
  selectionToolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 14, background: '#f8fafc' },
  selectionSummary: { fontSize: 14, color: '#475569' },
  selectionCheckboxLabel: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' },
  tableWrap: { overflowX: 'auto' },
  table: { width: 'max-content', minWidth: 0, borderCollapse: 'collapse', background: '#fff', borderRadius: 14, overflow: 'hidden' },
  th: { background: '#f8fafc', padding: '12px 12px', textAlign: 'left', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#475569', borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '9px 12px', fontSize: 14, verticalAlign: 'middle', textAlign: 'left' },
  tdCheckbox: { padding: '9px 12px', fontSize: 14, verticalAlign: 'middle', textAlign: 'left', width: 36 },
  input: { border: '1px solid #d1d5db', borderRadius: 10, padding: '9px 12px', fontSize: 14, width: '100%', boxSizing: 'border-box', margin: '4px 0 10px' },
  label: { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginTop: 4 },
  btnBlue: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  btnRed: { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  btnGray: { background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  btnSmRed: { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  btnSmBlue: { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  btnSmGray: { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  btnSmAmber: { background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  btnSmGreen: { background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  actionGroup: { display: 'flex', gap: 6, justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal: { background: '#fff', borderRadius: 18, padding: 24, width: '90%', maxWidth: 420, boxShadow: '0 24px 60px rgba(15,23,42,0.25)', border: '1px solid #e5e7eb' },
  modalBtns: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 },
  errText: { color: '#dc2626', fontSize: 13, margin: '4px 0 0' },
  toast: { position: 'fixed', bottom: 24, right: 24, background: '#0f172a', color: '#fff', padding: '12px 18px', borderRadius: 12, fontSize: 14, zIndex: 9999, boxShadow: '0 16px 36px rgba(15,23,42,0.28)' },
  userChip: { background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', marginRight: 8, marginBottom: 8, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 },
  bulkBar: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 7, padding: '9px 14px', marginBottom: 12, flexWrap: 'wrap' },
  infoCard: { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, padding: '14px 16px', marginBottom: 16 },
  typePill: { display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 },
  inlineMeta: { fontSize: 12, color: '#64748b' },
  groupTag: { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', fontSize: 12, fontWeight: 800 },
  duplicateNestedList: { marginTop: 14 },
  duplicateNestedCard: { boxShadow: 'none', background: '#fcfdff' },
};

export default AdminUserManagement;

