import React, { useEffect, useState } from 'react';
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
        if (!res.ok) throw new Error('Không thể tải danh sách giáo viên.');
        setTeachers(await res.json());
      } catch (err) {
        setError(err.message);
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
      if (!res.ok) throw new Error('Cập nhật thất bại.');
      const updated = await res.json();
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacher.id ? { ...t, canManageTests: updated.canManageTests } : t))
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div style={s.center}>Đang tải...</div>;
  if (error) return <div style={{ ...s.center, color: 'red' }}>{error}</div>;

  return (
    <div style={s.page}>
      <h2 style={s.title}>👩‍🏫 Quyền Giáo Viên</h2>
      <p style={s.subtitle}>
        Bật <strong>Quản lý đề</strong> để giáo viên có thể thêm / sửa đề Reading, Listening, Cambridge.
      </p>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Tên</th>
            <th style={s.th}>Số điện thoại</th>
            <th style={s.th}>Email</th>
            <th style={{ ...s.th, textAlign: 'center' }}>Quản lý đề</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((t) => (
            <tr key={t.id} style={s.tr}>
              <td style={s.td}>{t.name}</td>
              <td style={s.td}>{t.phone}</td>
              <td style={s.td}>{t.email || '—'}</td>
              <td style={{ ...s.td, textAlign: 'center' }}>
                <button
                  onClick={() => toggle(t)}
                  disabled={saving === t.id}
                  style={{
                    ...s.toggle,
                    background: t.canManageTests ? '#22c55e' : '#d1d5db',
                    cursor: saving === t.id ? 'not-allowed' : 'pointer',
                  }}
                  title={t.canManageTests ? 'Nhấn để tắt quyền' : 'Nhấn để bật quyền'}
                >
                  {saving === t.id ? '...' : t.canManageTests ? 'Bật ✓' : 'Tắt'}
                </button>
              </td>
            </tr>
          ))}
          {teachers.length === 0 && (
            <tr><td colSpan={4} style={{ ...s.td, textAlign: 'center', color: '#888' }}>Chưa có giáo viên nào.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const s = {
  page: { maxWidth: 760, margin: '40px auto', padding: '0 16px' },
  center: { textAlign: 'center', marginTop: 60, fontSize: 16 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  subtitle: { color: '#555', marginBottom: 24, fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  th: { background: '#f3f4f6', padding: '10px 14px', textAlign: 'left', fontSize: 13, fontWeight: 600, borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '10px 14px', fontSize: 14 },
  toggle: { border: 'none', borderRadius: 6, color: '#fff', fontWeight: 600, padding: '5px 16px', fontSize: 13, transition: 'background 0.2s' },
};

export default TeacherPermissionsPage;
