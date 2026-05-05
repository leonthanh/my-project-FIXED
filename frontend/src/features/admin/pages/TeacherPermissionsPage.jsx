import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../../../shared/components/AdminNavbar';
import AdminStickySidebarLayout, {
  AdminSidebarMetricList,
  AdminSidebarNavList,
  AdminSidebarPanel,
  buildAdminWorkspaceLinks,
} from '../components/AdminStickySidebarLayout';
import {
  AdminActionGroup,
  AdminCardList,
  AdminEmptyCard,
  AdminListSummary,
  AdminManagementCard,
  AdminMetaGrid,
  MetaItem,
  adminCardStyles as acs,
} from '../components/AdminCardPrimitives';
import { apiPath, authFetch } from '../../../shared/utils/api';

const fmtDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const teacherBadge = () => (
  <span style={s.teacherBadge}>Teacher</span>
);

const statusBadge = (enabled) => (
  <span style={enabled ? s.statusBadgeEnabled : s.statusBadgeDisabled}>
    {enabled ? 'Test management on' : 'Test management off'}
  </span>
);

const accessScopePills = (enabled) => {
  if (!enabled) {
    return <span style={s.scopePillPaused}>No active tools</span>;
  }

  return (
    <span style={s.scopeGroup}>
      <span style={s.scopePillReading}>Reading</span>
      <span style={s.scopePillListening}>Listening</span>
      <span style={s.scopePillOrange}>Orange</span>
    </span>
  );
};

const getTeacherTone = (teacher, savingId) => {
  if (savingId === teacher.id) {
    return {
      accent: '#ec4899',
      border: '#fbcfe8',
      surface: 'linear-gradient(180deg, #fff7fb 0%, #fff1f8 100%)',
      idBackground: '#fce7f3',
      idColor: '#be185d',
      idBorder: '#f9a8d4',
      titleColor: '#9d174d',
      subtitleColor: '#be185d',
    };
  }

  if (teacher.canManageTests) {
    return {
      accent: '#06b6d4',
      border: '#a5f3fc',
      surface: 'linear-gradient(180deg, #f0fdfa 0%, #ecfeff 100%)',
      idBackground: '#cffafe',
      idColor: '#0f766e',
      idBorder: '#67e8f9',
      titleColor: '#0f766e',
      subtitleColor: '#0f766e',
    };
  }

  return {
    accent: '#8b5cf6',
    border: '#ddd6fe',
    surface: 'linear-gradient(180deg, #faf5ff 0%, #fdf4ff 100%)',
    idBackground: '#ede9fe',
    idColor: '#6d28d9',
    idBorder: '#c4b5fd',
    titleColor: '#6d28d9',
    subtitleColor: '#7c3aed',
  };
};

const TeacherPermissionsPage = () => {
  const navigate = useNavigate();
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

  const enabledCount = teachers.filter((teacher) => teacher.canManageTests).length;
  const disabledCount = Math.max(teachers.length - enabledCount, 0);
  const workspaceLinks = buildAdminWorkspaceLinks(navigate, 'permissions', undefined, 'admin');
  const sidebarStats = [
    {
      key: 'teachers',
      label: 'Teachers',
      value: teachers.length,
      bg: '#eff6ff',
      border: '#bfdbfe',
      color: '#1d4ed8',
    },
    {
      key: 'enabled',
      label: 'Enabled',
      value: enabledCount,
      bg: '#f0fdf4',
      border: '#bbf7d0',
      color: '#166534',
    },
    {
      key: 'disabled',
      label: 'Disabled',
      value: disabledCount,
      bg: '#fff7ed',
      border: '#fed7aa',
      color: '#c2410c',
    },
    {
      key: 'saving',
      label: 'Saving',
      value: saving ? 1 : 0,
      bg: '#f8fafc',
      border: '#e2e8f0',
      color: '#475569',
    },
  ];

  return (
    <>
      <AdminNavbar />
      <div className="admin-page admin-submission-page" style={s.page}>
        <AdminStickySidebarLayout
          eyebrow="Admin"
          title="Teacher permissions"
          description="Control which teachers can manage Reading, Listening, and Orange tests from one sticky sidebar."
          sidebarContent={(
            <>
              <AdminSidebarPanel eyebrow="Admin settings" title="Access pages" meta="Quick switch">
                <AdminSidebarNavList items={workspaceLinks} ariaLabel="Admin workspace pages" />
              </AdminSidebarPanel>

              <AdminSidebarPanel eyebrow="Summary" title="Access status" meta={saving ? 'Saving' : 'Ready'}>
                <AdminSidebarMetricList items={sidebarStats} />
                <p className="admin-side-layout__panelText">
                  Enable Test Management to let a teacher create, edit, and maintain tests across the exam library.
                </p>
              </AdminSidebarPanel>
            </>
          )}
        >
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

              <AdminListSummary style={s.listSummary}>
                Showing <strong>{teachers.length}</strong> teacher access card{teachers.length === 1 ? '' : 's'}
              </AdminListSummary>

              {teachers.length === 0 ? (
                <AdminEmptyCard style={s.emptyCard}>No teachers found.</AdminEmptyCard>
              ) : (
                <AdminCardList style={s.cardList}>
                  {teachers.map((teacher) => {
                    const tone = getTeacherTone(teacher, saving);
                    const isSaving = saving === teacher.id;

                    return (
                      <AdminManagementCard
                        key={teacher.id}
                        accent={tone.accent}
                        borderColor={tone.border}
                        style={{ ...s.permissionCard, background: tone.surface }}
                      >
                        <div style={acs.managementCardTop}>
                          <div style={acs.managementHeadingBlock}>
                            <div style={acs.managementHeadingLine}>
                              <span
                                style={{
                                  ...acs.idPill,
                                  background: tone.idBackground,
                                  color: tone.idColor,
                                  borderColor: tone.idBorder,
                                }}
                              >
                                #{teacher.id}
                              </span>
                              <strong style={{ ...acs.managementTitle, color: tone.titleColor }}>
                                {teacher.name || 'Unnamed teacher'}
                              </strong>
                              {teacherBadge()}
                              {statusBadge(teacher.canManageTests)}
                              {isSaving ? <span style={s.savingBadge}>Saving...</span> : null}
                            </div>

                            <div style={{ ...acs.managementSubline, color: tone.subtitleColor }}>
                              Teacher access profile · Joined {fmtDate(teacher.createdAt)}
                            </div>
                          </div>

                          <AdminActionGroup>
                            <button
                              type="button"
                              style={s.btnSmIndigo}
                              onClick={() => navigate('/admin/users')}
                              title="Open user management"
                            >
                              Open Users
                            </button>
                            <button
                              type="button"
                              onClick={() => toggle(teacher)}
                              disabled={isSaving}
                              style={teacher.canManageTests ? s.btnSmSunset : s.btnSmMint}
                              title={teacher.canManageTests ? 'Click to disable access' : 'Click to enable access'}
                            >
                              {isSaving
                                ? 'Saving...'
                                : teacher.canManageTests
                                ? 'Disable access'
                                : 'Enable access'}
                            </button>
                          </AdminActionGroup>
                        </div>

                        <AdminMetaGrid style={s.permissionMetaGrid}>
                          <MetaItem label="Phone" value={<span style={s.phoneValue}>{teacher.phone || '—'}</span>} />
                          <MetaItem label="Email" value={<span style={s.emailValue}>{teacher.email || '—'}</span>} />
                          <MetaItem label="Status" value={statusBadge(teacher.canManageTests)} />
                          <MetaItem label="Access tools" value={accessScopePills(teacher.canManageTests)} />
                        </AdminMetaGrid>
                      </AdminManagementCard>
                    );
                  })}
                </AdminCardList>
              )}
            </>
          )}
        </div>
        </AdminStickySidebarLayout>
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
    background: 'linear-gradient(135deg, #ffffff 0%, #eef2ff 45%, #fff7ed 100%)',
    border: '1px solid #ddd6fe',
    borderRadius: 20,
    padding: '22px 24px',
    boxShadow: '0 16px 40px rgba(99, 102, 241, 0.1)',
    marginBottom: 18,
  },
  kicker: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#6d28d9',
    marginBottom: 8,
  },
  center: { textAlign: 'center', padding: '36px 16px', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 800, margin: '0 0 8px', color: '#312e81' },
  subtitle: { color: '#5b21b6', margin: 0, fontSize: 15, lineHeight: 1.6 },
  panel: {
    background: 'linear-gradient(180deg, #ffffff 0%, #fffaf5 100%)',
    borderRadius: 20,
    border: '1px solid #fed7aa',
    boxShadow: '0 16px 40px rgba(249, 115, 22, 0.08)',
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
    color: '#7c2d12',
  },
  summaryHint: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 30,
    padding: '0 12px',
    borderRadius: 999,
    background: '#f3e8ff',
    color: '#7c3aed',
    fontSize: 12,
    fontWeight: 700,
  },
  listSummary: {
    marginBottom: 10,
    color: '#7c3aed',
    fontSize: 12,
  },
  emptyCard: {
    borderColor: '#fdba74',
    background: '#fff7ed',
    color: '#c2410c',
  },
  cardList: { gap: 12 },
  permissionCard: {
    boxShadow: '0 12px 28px rgba(99, 102, 241, 0.08)',
  },
  permissionMetaGrid: {
    marginTop: 12,
    paddingTop: 12,
  },
  teacherBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    background: '#ede9fe',
    color: '#6d28d9',
    fontSize: 10,
    fontWeight: 700,
    border: '1px solid #ddd6fe',
  },
  statusBadgeEnabled: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    background: '#dcfce7',
    color: '#15803d',
    fontSize: 10,
    fontWeight: 800,
    border: '1px solid #86efac',
  },
  statusBadgeDisabled: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    background: '#ffedd5',
    color: '#c2410c',
    fontSize: 10,
    fontWeight: 800,
    border: '1px solid #fdba74',
  },
  savingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    background: '#fce7f3',
    color: '#be185d',
    fontSize: 10,
    fontWeight: 800,
    border: '1px solid #f9a8d4',
  },
  scopeGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  scopePillReading: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    background: '#dbeafe',
    color: '#1d4ed8',
    fontSize: 10,
    fontWeight: 700,
    border: '1px solid #bfdbfe',
  },
  scopePillListening: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    background: '#dcfce7',
    color: '#15803d',
    fontSize: 10,
    fontWeight: 700,
    border: '1px solid #86efac',
  },
  scopePillOrange: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    background: '#ffedd5',
    color: '#c2410c',
    fontSize: 10,
    fontWeight: 700,
    border: '1px solid #fdba74',
  },
  scopePillPaused: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    background: '#fdf2f8',
    color: '#be185d',
    fontSize: 10,
    fontWeight: 700,
    border: '1px solid #f9a8d4',
  },
  phoneValue: { color: '#1d4ed8', fontWeight: 700 },
  emailValue: { color: '#7c3aed', fontWeight: 700 },
  btnSmIndigo: {
    background: '#eef2ff',
    color: '#4338ca',
    border: '1px solid #c7d2fe',
    borderRadius: 7,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 10.5,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    lineHeight: 1.05,
  },
  btnSmMint: {
    background: '#ccfbf1',
    color: '#0f766e',
    border: '1px solid #99f6e4',
    borderRadius: 7,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 10.5,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    lineHeight: 1.05,
  },
  btnSmSunset: {
    background: '#ffedd5',
    color: '#c2410c',
    border: '1px solid #fdba74',
    borderRadius: 7,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 10.5,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    lineHeight: 1.05,
  },
};

export default TeacherPermissionsPage;

