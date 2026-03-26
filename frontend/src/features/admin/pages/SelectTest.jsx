import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StudentNavbar, AdminNavbar } from "../../../shared/components";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { canManageCategory } from "../../../shared/utils/permissions";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";

import "./SelectTest.css";
// import Cambridge styles so we can reuse them for Orange platform
import "../../cambridge/pages/SelectCambridgeTest.css";

const SelectTest = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const isTeacher = user && (user.role === "teacher" || user.role === "admin");

  const [tests, setTests] = useState({
    writing: [],
    reading: [],
    listening: [],
    cambridge: [],
  });
  const [activePlatform, setActivePlatform] = useState("ix");
  const [activeIxTab, setActiveIxTab] = useState("writing");
  const [activeOrangeType, setActiveOrangeType] = useState("ket");
  const [activeOrangeTab, setActiveOrangeTab] = useState("listening");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(12);
  const navigate = useNavigate();
  const location = useLocation();

  const orangeTypes = ["ket", "pet", "flyers", "movers", "starters"];
  // map each orange type to the emoji used in student Cambridge page
  const orangeTypeIcons = {
    ket: "🔑",
    pet: "📘",
    flyers: "✈️",
    movers: "🚗",
    starters: "⭐",
  };
  const orangeTypeNames = {
    ket: "KET (A2 Key)",
    pet: "PET (B1 Preliminary)",
    flyers: "Flyers (A2)",
    movers: "Movers (A1)",
    starters: "Starters (Pre-A1)",
  };

  // for info box we need to look up TEST_CONFIGS just like Cambridge page does
  const getOrangeConfig = () => {
    // writing is always pet-writing in orange
    const key = activeOrangeTab === "writing" ? "pet-writing" : `${activeOrangeType}-${activeOrangeTab}`;
    // Young Learners (movers, starters, flyers) have a single combined test key, not split by skill
    return TEST_CONFIGS[key] || TEST_CONFIGS[activeOrangeType] || {};
  };

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

        const writingList = Array.isArray(writingData) ? writingData : [];
        const petWriting = writingList.filter((t) => t?.testType === "pet-writing");
        const ieltsWriting = writingList.filter((t) => t?.testType !== "pet-writing");
        const cambridgeList = Array.isArray(cambridgeData) ? cambridgeData : [];
        const cambridgeWithWriting = cambridgeList.concat(
          petWriting.map((t) => ({ ...t, category: "writing", testType: "pet-writing" }))
        );

        setTests({
          writing: ieltsWriting,
          reading: Array.isArray(readingData) ? readingData : [],
          listening: Array.isArray(listeningData) ? listeningData : [],
          cambridge: cambridgeWithWriting,
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
    const params = new URLSearchParams(location.search);
    const platform = params.get('platform');
    const type = params.get('type');
    const tab = params.get('tab');

    if (platform === 'orange') {
      setActivePlatform('orange');
    }
    if (type && orangeTypes.includes(type)) {
      setActiveOrangeType(type);
    }
    if (tab && ['listening', 'reading', 'writing'].includes(tab)) {
      setActiveOrangeTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    setVisibleCount(12);
    setSearchQuery("");
    setSortMode("newest");
  }, [activePlatform, activeIxTab, activeOrangeType, activeOrangeTab]);

  useEffect(() => {
    if (activeOrangeType !== "pet" && activeOrangeTab === "writing") {
      setActiveOrangeTab("listening");
    }
  }, [activeOrangeType, activeOrangeTab]);

  const handleSelectWriting = (test) => {
    const numericId = parseInt(test.id, 10);
    if (!numericId || isNaN(numericId)) {
      console.error("❌ Test ID không hợp lệ:", test?.id);
      return;
    }
    if (test?.testType === "pet-writing") {
      localStorage.setItem("selectedPetWritingTestId", numericId);
      localStorage.removeItem("selectedTestId");
      navigate("/pet-writing");
      return;
    }
    localStorage.setItem("selectedTestId", numericId);
    localStorage.removeItem("selectedPetWritingTestId");
    navigate("/writing-test");
  };

  const handleSelectReading = (testId) => {
    navigate(`/reading/${testId}`);
  };

  const handleSelectListening = (testId) => {
    navigate(`/listening/${testId}`);
  };

  const handleSelectCambridge = (test) => {
    if (test?.testType === "pet-writing") {
      const numericId = parseInt(test.id, 10);
      if (!numericId || isNaN(numericId)) return;
      localStorage.setItem("selectedPetWritingTestId", numericId);
      localStorage.removeItem("selectedTestId");
      navigate("/pet-writing");
      return;
    }
    // Navigate with testType for proper config loading
    // testType format: "ket-reading", "pet-listening", etc.
    const rawTestType = String(test.testType || 'ket-reading').toLowerCase();
    const category = String(test.category || 'reading').toLowerCase();
    const hasSkillSuffix = rawTestType.includes('-reading') || rawTestType.includes('-listening');
    const resolvedTestType = hasSkillSuffix ? rawTestType : `${rawTestType}-${category}`;
    
    // Use testType-based URL for proper config
    navigate(`/cambridge/${resolvedTestType}/${test.id}`);
  };

  const handleEdit = (testId, testType, test = null) => {
    if (testType === "writing") {
      if (test?.testType === "pet-writing") {
        navigate(`/admin/edit-pet-writing/${testId}`);
        return;
      }
      navigate(`/edit-test/${testId}`);
    } else if (testType === "reading") {
      navigate(`/reading-tests/${testId}/edit`);
    } else if (testType === "listening") {
      navigate(`/listening/${testId}/edit`);
    } else if (testType === "cambridge" && test) {
      if (test.testType === "pet-writing") {
        navigate(`/admin/edit-pet-writing/${testId}`);
        return;
      }
      // Navigate based on category
      if (test.category === 'listening') {
        navigate(`/cambridge/listening/${testId}/edit`);
      } else {
        navigate(`/cambridge/reading/${testId}/edit`);
      }
    }
  };

  const normalizeText = (value) => String(value ?? "").toLowerCase();
  const getCambridgeCategory = (test) => {
    const rawType = String(test?.testType || "").toLowerCase();
    const rawCategory = String(test?.category || "").toLowerCase();
    if (rawCategory === "reading" || rawCategory === "listening" || rawCategory === "writing") {
      return rawCategory;
    }
    if (rawType.includes("listening")) return "listening";
    if (rawType === "pet-writing") return "writing";
    // Movers/Flyers/Starters and generic reading tests default to reading.
    return "reading";
  };
  const getTestTitle = (test, testType, fallbackIndex) => {
    if (testType === "cambridge") {
      if (test.testType === "pet-writing" || test.category === "writing") {
        return `PET Writing ${test.index || fallbackIndex}`;
      }
      const testTypeRaw = (test.testType || "ket").toString();
      const level = testTypeRaw.split('-')[0].toUpperCase();
      const cat = test.category === "listening" ? "Listening" : "Reading";
      return `${level} ${cat}`;
    }
    if (testType === "writing" && test.testType === "pet-writing") {
      return `PET Writing ${test.index || fallbackIndex}`;
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

  const orangeFilteredByType = useMemo(() => {
    return (tests.cambridge || []).filter((test) => {
      const testTypeRaw = String(test?.testType || "").toLowerCase();
      if (testTypeRaw === "pet-writing") return activeOrangeType === "pet";
      return testTypeRaw === activeOrangeType || testTypeRaw.startsWith(`${activeOrangeType}-`);
    });
  }, [tests.cambridge, activeOrangeType]);

  const orangeCounts = useMemo(() => {
    const listening = orangeFilteredByType.filter((t) => getCambridgeCategory(t) === "listening").length;
    const reading = orangeFilteredByType.filter((t) => getCambridgeCategory(t) === "reading").length;
    const writing = orangeFilteredByType.filter((t) => String(t?.testType || "").toLowerCase() === "pet-writing").length;
    return { listening, reading, writing };
  }, [orangeFilteredByType]);

  const currentContext = useMemo(() => {
    if (activePlatform === "ix") {
      return {
        list: tests[activeIxTab] || [],
        displayType: activeIxTab,
        categoryForPermission: activeIxTab,
        isOrange: false,
      };
    }

    const selected = orangeFilteredByType.filter((test) => {
      if (activeOrangeTab === "writing") {
        return String(test?.testType || "").toLowerCase() === "pet-writing";
      }
      return getCambridgeCategory(test) === activeOrangeTab;
    });

    return {
      list: selected,
      displayType: "cambridge",
      categoryForPermission: activeOrangeTab,
      isOrange: true,
    };
  }, [activePlatform, activeIxTab, activeOrangeTab, tests, orangeFilteredByType]);

  const activeList = filterAndSort(currentContext.list, currentContext.displayType);
  const visibleList = activeList.slice(0, visibleCount);
  const remainingCount = Math.max(0, activeList.length - visibleList.length);

  return (
    <>
      {isTeacher ? <AdminNavbar /> : <StudentNavbar />}
      <div className="select-test-page">
        <div className="select-test-shell">
          {/* Tab Navigation */}
          <div className="select-test-tabs">
            {[
              { key: "ix", label: "📚 IX" },
              { key: "orange", label: "🍊 Orange" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActivePlatform(tab.key)}
                className={`select-test-tab ${activePlatform === tab.key ? "active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activePlatform === "ix" ? (
            <div className="select-test-subtabs">
              {["writing", "reading", "listening"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveIxTab(tab)}
                  className={`select-test-tab select-test-subtab select-test-subtab--${tab} ${activeIxTab === tab ? "active" : ""}`}
                >
                  {tab === "writing" ? "📝 Writing" : tab === "reading" ? "📖 Reading" : "🎧 Listening"}
                  <span className="select-test-subtab-count">{tests[tab]?.length ?? 0}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* orange platform uses Cambridge-style tabs */}
              <div className="cambridge-type-list">
                {orangeTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveOrangeType(type)}
                    className={`cambridge-type-btn cambridge-type-btn--${type}${activeOrangeType === type ? " cambridge-type-btn--active" : ""}`}
                  >
                    {orangeTypeIcons[type] || ""} {orangeTypeNames[type] || type.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className={`cambridge-tabs${activeOrangeType === "pet" ? " cambridge-tabs--three" : ""}`}>
                {[
                  { key: "listening", label: "🎧 Listening", count: orangeCounts.listening },
                  { key: "reading", label: "📖 Reading", count: orangeCounts.reading },
                  ...(activeOrangeType === "pet"
                    ? [{ key: "writing", label: "📝 Writing", count: orangeCounts.writing }]
                    : []),
                ].map((skill) => (
                  <button
                    key={skill.key}
                    onClick={() => setActiveOrangeTab(skill.key)}
                    className={`cambridge-tab${activeOrangeTab === skill.key ? " cambridge-tab--active" : ""}`}
                  >
                    {skill.label} <span className="cambridge-tab__badge">{skill.count}</span>
                  </button>
                ))}
              </div>

              {/* info box like student page */}
              <div className="cambridge-info">
                <div className="cambridge-info__icon">
                  {orangeTypeIcons[activeOrangeType] || ""}
                </div>
                <div>
                  <h3 className="cambridge-info__title">
                    {`${activeOrangeType.toUpperCase()} - ${
                      activeOrangeTab.charAt(0).toUpperCase() + activeOrangeTab.slice(1)
                    }`}
                  </h3>
                  <p className="cambridge-info__meta">
                    {getOrangeConfig().totalQuestions || "?"} câu hỏi • {getOrangeConfig().parts || "?"} parts • {getOrangeConfig().duration || "?"} phút
                  </p>
                </div>
              </div>
            </>
          )}

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

              <div className={`select-test-grid${currentContext.isOrange ? ' select-test-grid--full' : ''}`}>
                {currentContext.isOrange ? (
                  <div className="cambridge-test-list">
                    {visibleList.map((test, index) => {
                      const classCode = test.classCode || "N/A";
                      const teacherName = test.teacherName || "N/A";

                      // decide icon and title depending on orange skill
                      let iconForSkill = "🏆";
                      let displayTitle = "";
                      if (activeOrangeTab === "writing") {
                        iconForSkill = "✍️";
                        displayTitle = "Writing";
                      } else if (activeOrangeTab === "reading") {
                        iconForSkill = "📖";
                        displayTitle = "Reading";
                      } else if (activeOrangeTab === "listening") {
                        iconForSkill = "🎧";
                        displayTitle = "Listening";
                      }

                      return (
                        <div
                          key={`cambridge-${test.category || "unknown"}-${test.id}`}
                          className="cambridge-test-item"
                        >
                          <div className="cambridge-test-row">
                            <button
                              type="button"
                              className="cambridge-test-main"
                              onClick={() => handleSelectCambridge(test)}
                            >
                              <div className="cambridge-test-main__content">
                                <span className="cambridge-test-main__icon">
                                  {iconForSkill}
                                </span>
                                <div>
                                  <h3 className="cambridge-test-main__title">
                                    {displayTitle}
                                  </h3>
                                  <div className="cambridge-test-main__meta">
                                    📚 {classCode} • 👨‍🏫 {teacherName} • 📊 {getOrangeConfig().totalQuestions || "?"} câu • ⏱️ {getOrangeConfig().duration || "?"} phút
                                  </div>
                                </div>
                              </div>
                            </button>
                            {canManageCategory(user, currentContext.categoryForPermission) && (
                              <button
                                type="button"
                                className="cambridge-btn cambridge-btn--warning"
                                onClick={() => handleEdit(test.id, "cambridge", test)}
                              >
                                ✏️ Sửa đề
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  visibleList.map((test, index) => {
                    const title = getTestTitle(test, currentContext.displayType, index + 1);
                    const icon = getTestIcon(currentContext.displayType);
                    const classCode = test.classCode || "N/A";
                    const teacherName = test.teacherName || "N/A";

                    return (
                      <div
                        key={`${activeIxTab}-${test.id}`}
                        className={`select-test-card select-test-card--${activeIxTab}`}
                      >
                        <button
                          type="button"
                          className="select-test-cardMain"
                          onClick={() => {
                            if (activeIxTab === "writing") handleSelectWriting(test);
                            else if (activeIxTab === "reading") handleSelectReading(test.id);
                            else if (activeIxTab === "listening") handleSelectListening(test.id);
                          }}
                        >
                          <div className="select-test-cardTitle">
                            <span className="select-test-cardIcon">{icon}</span>
                            <span className="select-test-cardText">{title}</span>
                            <span className="select-test-cardNum">#{index + 1}</span>
                          </div>

                          <div className="select-test-cardMeta">
                            <div>
                              <span className="select-test-chip">{classCode}</span>
                            </div>
                            <div className="select-test-cardTeacher">👨‍🏫 {teacherName}</div>
                          </div>
                        </button>

                        {canManageCategory(user, currentContext.categoryForPermission) ? (
                          <button
                            type="button"
                            className="select-test-edit"
                            onClick={() => {
                              handleEdit(test.id, activeIxTab, test);
                            }}
                          >
                            ✏️ Sửa đề
                          </button>
                        ) : null}
                      </div>
                    );
                  })
                )}
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
