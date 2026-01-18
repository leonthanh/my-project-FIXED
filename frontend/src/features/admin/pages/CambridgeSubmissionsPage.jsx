import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNavbar } from "../../../shared/components";
import { apiPath } from "../../../shared/utils/api";

/**
 * CambridgeSubmissionsPage - Trang giáo viên xem danh sách bài làm Cambridge
 * Hiển thị submissions từ tất cả Cambridge tests (Listening + Reading)
 */
const CambridgeSubmissionsPage = () => {
  const navigate = useNavigate();
  const teacher = JSON.parse(localStorage.getItem("user"));

  // States
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    testType: '',
    classCode: '',
    studentName: '',
  });
  const [activeTab, setActiveTab] = useState('all'); // all, listening, reading

  // Fetch submissions
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = `cambridge/submissions?page=${pagination.page}&limit=${pagination.limit}`;
        
        // Apply test type filter based on tab
        if (activeTab === 'listening') {
          url += '&testType=listening';
        } else if (activeTab === 'reading') {
          url += '&testType=reading';
        }
        
        if (filters.classCode) {
          url += `&classCode=${encodeURIComponent(filters.classCode)}`;
        }

        const res = await fetch(apiPath(url));
        if (!res.ok) throw new Error("Không thể tải danh sách bài nộp");

        const data = await res.json();
        setSubmissions(data.submissions || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }));
      } catch (err) {
        console.error("Error fetching submissions:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [pagination.page, pagination.limit, activeTab, filters.classCode]);

  // Filter submissions locally by student name
  const filteredSubmissions = submissions.filter(sub => {
    if (filters.studentName) {
      return sub.studentName?.toLowerCase().includes(filters.studentName.toLowerCase());
    }
    return true;
  });

  // Format time
  const formatTime = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get score color
  const getScoreColor = (percentage) => {
    if (percentage >= 80) return '#22c55e';
    if (percentage >= 60) return '#f59e0b';
    if (percentage >= 40) return '#f97316';
    return '#ef4444';
  };

  // Get test type badge
  const getTestTypeBadge = (testType) => {
    const isListening = testType?.includes('listening');
    const level = testType?.split('-')[0]?.toUpperCase() || 'KET';
    
    return {
      label: `${level} ${isListening ? '🎧' : '📖'}`,
      color: isListening ? '#3b82f6' : '#8b5cf6',
      bgColor: isListening ? '#dbeafe' : '#ede9fe'
    };
  };

  // View submission detail
  const handleViewDetail = (submissionId) => {
    navigate(`/cambridge/result/${submissionId}`);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div style={styles.container}>
      <AdminNavbar />

      <div style={styles.content} className="admin-page">
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>📊 Quản lý bài làm Cambridge</h1>
          <p style={styles.subtitle}>
            Xem và đánh giá bài làm của học sinh
          </p>
        </div>

        {/* Tabs */}
        <div style={styles.tabsContainer} className="admin-tabs">
          <button
            onClick={() => setActiveTab('all')}
            style={{
              ...styles.tab,
              ...(activeTab === 'all' && styles.tabActive)
            }}
          >
            📋 Tất cả
          </button>
          <button
            onClick={() => setActiveTab('listening')}
            style={{
              ...styles.tab,
              ...(activeTab === 'listening' && styles.tabActive)
            }}
          >
            🎧 Listening
          </button>
          <button
            onClick={() => setActiveTab('reading')}
            style={{
              ...styles.tab,
              ...(activeTab === 'reading' && styles.tabActive)
            }}
          >
            📖 Reading
          </button>
        </div>

        {/* Filters */}
        <div style={styles.filtersContainer} className="admin-filters-row">
          <div style={styles.filterGroup} className="admin-filter-group">
            <label style={styles.filterLabel}>Mã lớp:</label>
            <input
              type="text"
              value={filters.classCode}
              onChange={(e) => setFilters(prev => ({ ...prev, classCode: e.target.value }))}
              placeholder="Tìm theo mã lớp..."
              style={styles.filterInput}
            />
          </div>
          <div style={styles.filterGroup} className="admin-filter-group">
            <label style={styles.filterLabel}>Tên học sinh:</label>
            <input
              type="text"
              value={filters.studentName}
              onChange={(e) => setFilters(prev => ({ ...prev, studentName: e.target.value }))}
              placeholder="Tìm theo tên..."
              style={styles.filterInput}
            />
          </div>
          <div style={styles.filterStats} className="admin-filter-stats">
            <span>Tổng: <strong>{pagination.total}</strong> bài</span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorContainer}>
            <p>❌ {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              style={styles.retryButton}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Submissions Table */}
        {!loading && !error && (
          <>
            <div style={styles.tableContainer} className="admin-table-wrap">
              <table style={styles.table} className="admin-table">
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Loại bài</th>
                    <th style={styles.th}>Tên đề</th>
                    <th style={styles.th}>Học sinh</th>
                    <th style={styles.th}>Lớp</th>
                    <th style={styles.th}>Điểm</th>
                    <th style={styles.th}>Thời gian</th>
                    <th style={styles.th}>Ngày nộp</th>
                    <th style={styles.th}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={styles.emptyCell}>
                        Không có bài nộp nào
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub, index) => {
                      const typeBadge = getTestTypeBadge(sub.testType);
                      return (
                        <tr key={sub.id} style={styles.tr}>
                          <td style={styles.td}>
                            {(pagination.page - 1) * pagination.limit + index + 1}
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.badge,
                              backgroundColor: typeBadge.bgColor,
                              color: typeBadge.color
                            }}>
                              {typeBadge.label}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.testTitle}>{sub.testTitle || '--'}</span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.studentInfo}>
                              <span style={styles.studentName}>{sub.studentName}</span>
                              {sub.studentPhone && (
                                <span style={styles.studentPhone}>{sub.studentPhone}</span>
                              )}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.classCode}>{sub.classCode || '--'}</span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.scoreContainer}>
                              <span style={{
                                ...styles.score,
                                color: getScoreColor(sub.percentage)
                              }}>
                                {sub.score}/{sub.totalQuestions}
                              </span>
                              <span style={{
                                ...styles.percentage,
                                backgroundColor: getScoreColor(sub.percentage) + '20',
                                color: getScoreColor(sub.percentage)
                              }}>
                                {sub.percentage}%
                              </span>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.timeSpent}>
                              {formatTime(sub.timeSpent)}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.date}>
                              {formatDate(sub.submittedAt)}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => handleViewDetail(sub.id)}
                              style={styles.viewButton}
                            >
                              👁️ Xem
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  style={{
                    ...styles.pageButton,
                    ...(pagination.page === 1 && styles.pageButtonDisabled)
                  }}
                >
                  ← Trước
                </button>
                <span style={styles.pageInfo}>
                  Trang {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  style={{
                    ...styles.pageButton,
                    ...(pagination.page === pagination.totalPages && styles.pageButtonDisabled)
                  }}
                >
                  Sau →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e293b',
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#64748b',
    fontSize: '15px',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '12px',
  },
  tab: {
    padding: '10px 20px',
    border: 'none',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#64748b',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: '#0e276f',
    color: 'white',
  },
  filtersContainer: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-end',
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#64748b',
  },
  filterInput: {
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '180px',
  },
  filterStats: {
    marginLeft: 'auto',
    color: '#64748b',
    fontSize: '14px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    color: '#64748b',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '40px',
    color: '#ef4444',
  },
  retryButton: {
    marginTop: '12px',
    padding: '10px 20px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#1e293b',
    verticalAlign: 'middle',
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: '#94a3b8',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
  },
  testTitle: {
    fontWeight: 500,
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
  },
  studentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  studentName: {
    fontWeight: 500,
  },
  studentPhone: {
    fontSize: '12px',
    color: '#64748b',
  },
  classCode: {
    padding: '4px 8px',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
  },
  scoreContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
  },
  score: {
    fontWeight: 700,
    fontSize: '15px',
  },
  percentage: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  },
  timeSpent: {
    color: '#64748b',
    fontSize: '13px',
  },
  date: {
    fontSize: '13px',
    color: '#64748b',
  },
  viewButton: {
    padding: '8px 14px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '20px',
    padding: '16px',
  },
  pageButton: {
    padding: '10px 20px',
    backgroundColor: '#0e276f',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  pageButtonDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#64748b',
  },
};

export default CambridgeSubmissionsPage;
