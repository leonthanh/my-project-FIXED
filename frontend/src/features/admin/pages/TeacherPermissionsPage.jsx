import React, { useEffect, useState } from 'react';
import AdminNavbar from '../../../shared/components/AdminNavbar';
import { apiPath, authFetch } from '../../../shared/utils/api';

const TeacherPermissionsPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(null); // id of teacher being saved

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(apiPath('auth/teachers'));
        if (!res.ok) throw new Error('Could not load teachers.');
        setTeachers(await res.json());
      } catch (err) {
        setError('Could not load teachers.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = async (teacher) => {
    setSaving(teacher.id);
    try {
      const res = await authFetch(apiPath(`auth/teachers/${teacher.id}/permissions`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canManageTests: !teacher.canManageTests }),
      });
      if (!res.ok) throw new Error('Could not update teacher permissions.');
      const updated = await res.json();
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacher.id ? { ...t, canManageTests: updated.canManageTests } : t))
      );
    } catch (err) {
      alert('Could not update teacher permissions.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <AdminNavbar />
      <div className="admin-page admin-submission-page" style={s.page}>
        <div style={s.headerCard}>
          <div style={s.kicker}>Admin</div>
          <h2 style={s.title}>Teacher Permissions</h2>
          <p style={s.subtitle}>
            Enable <strong>Test Management</strong> to allow teachers to create and edit Reading,
            Listening, and Orange tests.
          </p>
        </div>

        <div style={s.panel}>
          {loading ? (
            <div style={s.center}>Loading teachers...</div>
          ) : error ? (
            <div style={{ ...s.center, color: '#b91c1c' }}>{error}</div>
          ) : (
            <>
              <div style={s.summaryRow}>
                <span>
                  Total teachers: <strong>{teachers.length}</strong>
                </span>
                <span style={s.summaryHint}>Test access controls</span>
              </div>

              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Name</th>
                      <th style={s.th}>Phone</th>
                      <th style={s.th}>Email</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>Test Management</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((t) => (
                      <tr key={t.id} style={s.tr}>
                        <td style={s.td}>
                          <div style={s.nameCell}>{t.name}</div>
                        </td>
                        <td style={s.td}>{t.phone || '—'}</td>
                        <td style={s.td}>{t.email || '—'}</td>
                        <td style={{ ...s.td, textAlign: 'center' }}>
                          <button
                            onClick={() => toggle(t)}
                            disabled={saving === t.id}
                            style={{
                              ...s.toggle,
                              background: saving === t.id
                                ? '#94a3b8'
                                : t.canManageTests
                                ? '#16a34a'
                                : '#64748b',
                              cursor: saving === t.id ? 'not-allowed' : 'pointer',
                            }}
                            title={t.canManageTests ? 'Click to disable access' : 'Click to enable access'}
                          >
                            {saving === t.id ? 'Saving...' : t.canManageTests ? 'Enabled' : 'Disabled'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {teachers.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ ...s.td, textAlign: 'center', color: '#64748b' }}>
                          No teachers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

const s = {
  page: {
    maxWidth: '100%',
    width: '100%',
    margin: '0 auto',
    padding: '30px 16px',
    boxSizing: 'border-box',
  },
  headerCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #edf4ff 100%)',
    border: '1px solid #dbe7ff',
    borderRadius: 20,
    padding: '22px 24px',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
    marginBottom: 18,
  },
  kicker: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#0e276f',
    marginBottom: 8,
  },
  center: { textAlign: 'center', padding: '36px 16px', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 800, margin: '0 0 8px', color: '#0f172a' },
  subtitle: { color: '#475569', margin: 0, fontSize: 15, lineHeight: 1.6 },
  panel: {
    background: '#ffffff',
    borderRadius: 20,
    border: '1px solid #e5e7eb',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
    padding: '20px 22px',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 16,
    fontSize: 14,
    color: '#475569',
  },
  summaryHint: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 30,
    padding: '0 12px',
    borderRadius: 999,
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: 700,
  },
  tableWrap: { overflowX: 'auto' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  th: {
    background: '#f8fafc',
    padding: '12px 14px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#475569',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px', fontSize: 14, color: '#0f172a', verticalAlign: 'middle' },
  nameCell: { fontWeight: 700, color: '#0f172a' },
  toggle: {
    border: 'none',
    borderRadius: 999,
    color: '#fff',
    fontWeight: 700,
    padding: '8px 16px',
    minWidth: 108,
    fontSize: 13,
    transition: 'background 0.2s ease',
  },
};

export default TeacherPermissionsPage;

