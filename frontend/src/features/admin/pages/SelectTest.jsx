import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StudentNavbar, AdminNavbar } from "../../../shared/components";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { canManageCategory } from "../../../shared/utils/permissions";

import "./SelectTest.css";

const SelectTest = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const isTeacher = user && user.role === "teacher";

  const [tests, setTests] = useState({
    writing: [],
    reading: [],
    listening: [],
    cambridge: [],
  });
  const [activeTab, setActiveTab] = useState("writing");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(12);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllTests = async () => {
      try {
        setLoading(true);
        const [writingRes, readingRes, listeningRes, cambridgeRes] = await Promise.all([
          fetch(apiPath("writing-tests")),
          fetch(apiPath("reading-tests")),
          fetch(apiPath("listening-tests")),
          fetch(apiPath("cambridge")), // Route: /api/cambridge
        ]);

        const writingData = await writingRes.json();
        const readingData = await readingRes.json();
        const listeningData = await listeningRes.json();
        const cambridgeData = cambridgeRes.ok ? await cambridgeRes.json() : [];

        setTests({
          writing: Array.isArray(writingData) ? writingData : [],
          reading: Array.isArray(readingData) ? readingData : [],
          listening: Array.isArray(listeningData) ? listeningData : [],
          cambridge: Array.isArray(cambridgeData) ? cambridgeData : [],
        });
      } catch (err) {
        console.error("❌ Lỗi khi tải đề:", err);
        setTests({
          writing: [],
          reading: [],
          listening: [],
          cambridge: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllTests();
  }, []);

  useEffect(() => {
    setVisibleCount(12);
    setSearchQuery("");
    setSortMode("newest");
  }, [activeTab]);

  const handleSelectWriting = (testId) => {
    const numericId = parseInt(testId, 10);
    if (!numericId || isNaN(numericId)) {
      console.error("❌ Test ID không hợp lệ:", testId);
      return;
    }
    localStorage.setItem("selectedTestId", numericId);
    navigate("/writing-test");
  };

  const handleSelectReading = (testId) => {
    navigate(`/reading/${testId}`);
  };

  const handleSelectListening = (testId) => {
    navigate(`/listening/${testId}`);
  };

  const handleSelectCambridge = (test) => {
    // Navigate with testType for proper config loading
    // testType format: "ket-reading", "pet-listening", etc.
    const testType = test.testType || 'ket-reading'; // fallback
    /* eslint-disable-next-line no-unused-vars */
    const category = test.category || 'reading';
    
    // Use testType-based URL for proper config
    navigate(`/cambridge/${testType}/${test.id}`);
  };

  const handleEdit = (testId, testType, test = null) => {
    if (testType === "writing") {
      navigate(`/edit-test/${testId}`);
    } else if (testType === "reading") {
      navigate(`/reading-tests/${testId}/edit`);
    } else if (testType === "listening") {
      navigate(`/listening/${testId}/edit`);
    } else if (testType === "cambridge" && test) {
      // Navigate based on category
      if (test.category === 'listening') {
        navigate(`/cambridge/listening/${testId}/edit`);
      } else {
        navigate(`/cambridge/reading/${testId}/edit`);
      }
    }
  };

  const normalizeText = (value) => String(value ?? "").toLowerCase();
  const getTestTitle = (test, testType, fallbackIndex) => {
    if (testType === "cambridge") {
      const testTypeRaw = (test.testType || "ket").toString();
      const level = testTypeRaw.split('-')[0].toUpperCase();
      const cat = test.category === "listening" ? "Listening" : "Reading";
      return `${level} ${cat}`;
    }
    const label = testType.charAt(0).toUpperCase() + testType.slice(1);
    return `${label} ${test.index || fallbackIndex}`;
  };

  const getTestIcon = (testType) => {
    if (testType === "writing") return "📝";
    if (testType === "reading") return "📖";
    if (testType === "listening") return "🎧";
    return "🏆";
  };

  const filterAndSort = (list, testType) => {
    const q = normalizeText(searchQuery).trim();

    const filtered = (Array.isArray(list) ? list : []).filter((t) => {
      if (!q) return true;

      const haystack = [
        t.id,
        t.index,
        t.classCode,
        t.teacherName,
        t.title,
        t.testType,
        t.category,
      ]
        .map((v) => normalizeText(v))
        .join(" ");

      return haystack.includes(q);
    });

    const getCreatedOrId = (t) => {
      const created = t.createdAt ? Date.parse(t.createdAt) : NaN;
      if (!Number.isNaN(created)) return created;
      return Number(t.id || 0);
    };

    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "oldest") return getCreatedOrId(a) - getCreatedOrId(b);
      if (sortMode === "index-asc") return Number(a.index || 0) - Number(b.index || 0);
      if (sortMode === "index-desc") return Number(b.index || 0) - Number(a.index || 0);
      return getCreatedOrId(b) - getCreatedOrId(a);
    });

    return sorted;
  };

  const activeList = filterAndSort(tests[activeTab], activeTab);
  const visibleList = activeList.slice(0, visibleCount);
  const remainingCount = Math.max(0, activeList.length - visibleList.length);

  return (
    <>
      {isTeacher ? <AdminNavbar /> : <StudentNavbar />}
      <div className="select-test-page">
        <div className="select-test-shell">
          <div className="select-test-header">
            <img
              src={hostPath("uploads/staredu.jpg")}
              alt="StarEdu"
              className="select-test-logo"
            />
          </div>

          {/* Tab Navigation */}
          <div className="select-test-tabs">
            {["writing", "reading", "listening", "cambridge"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`select-test-tab ${activeTab === tab ? "active" : ""}`}
              >
                {tab === "writing"
                  ? "📝 Writing"
                  : tab === "reading"
                  ? "📖 Reading"
                  : tab === "listening"
                  ? "🎧 Listening"
                  : "🍊 Orange"}
              </button>
            ))}
          </div>

          <div className="select-test-controls">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã lớp, giáo viên, số đề..."
              className="select-test-search"
            />

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="select-test-sort"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="index-desc">Index giảm dần</option>
              <option value="index-asc">Index tăng dần</option>
            </select>
          </div>

          {/* Test List */}
          {loading ? (
            <p className="select-test-loading">⏳ Đang tải đề...</p>
          ) : activeList.length === 0 ? (
            <p className="select-test-empty">Chưa có đề thi loại này</p>
          ) : (
            <>
              <div className="select-test-meta">
                <span>
                  Tổng: <b>{activeList.length}</b>
                </span>
                {searchQuery.trim() ? (
                  <span>
                    Đang lọc: <b>“{searchQuery.trim()}”</b>
                  </span>
                ) : null}
              </div>

              <div className="select-test-grid">
                {visibleList.map((test, index) => {
                  const title = getTestTitle(test, activeTab, index + 1);
                  const icon = getTestIcon(activeTab);
                  const classCode = test.classCode || "N/A";
                  const teacherName = test.teacherName || "N/A";

                  return (
                    <div
                      key={
                        activeTab === "cambridge"
                          ? `cambridge-${test.category || "unknown"}-${test.id}`
                          : `${activeTab}-${test.id}`
                      }
                      className="select-test-card"
                    >
                      <button
                        type="button"
                        className="select-test-cardMain"
                        onClick={() => {
                          if (activeTab === "writing") handleSelectWriting(test.id);
                          else if (activeTab === "reading") handleSelectReading(test.id);
                          else if (activeTab === "listening") handleSelectListening(test.id);
                          else if (activeTab === "cambridge") handleSelectCambridge(test);
                        }}
                      >
                        <div className="select-test-cardTitle">
                          <span className="select-test-cardIcon">{icon}</span>
                          <span className="select-test-cardText">{title}</span>
                        </div>

                        <div className="select-test-cardMeta">
                          <div>
                            <span className="select-test-chip">{classCode}</span>
                          </div>
                          <div className="select-test-cardTeacher">{teacherName}</div>
                        </div>
                      </button>

                      {canManageCategory(user, activeTab) ? (
                        <button
                          type="button"
                          className="select-test-edit"
                          onClick={() => handleEdit(test.id, activeTab, test)}
                        >
                          ✏️ Sửa đề
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {remainingCount > 0 ? (
                <button
                  type="button"
                  className="select-test-loadMore"
                  onClick={() => setVisibleCount((c) => c + 12)}
                >
                  Xem thêm ({remainingCount})
                </button>
              ) : null}
            </>
          )}

          <button
            onClick={() => (window.location.href = "/my-feedback")}
            className="select-test-feedback"
          >
            📄 Xem nhận xét
          </button>
        </div>
      </div>
    </>
  );
};

export default SelectTest;
