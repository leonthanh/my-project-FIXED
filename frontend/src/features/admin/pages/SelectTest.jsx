import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StudentNavbar from "../../../shared/components/StudentNavbar";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import LineIcon from "../../../shared/components/LineIcon.jsx";
import { apiPath } from "../../../shared/utils/api";
import { canManageCategory } from "../../../shared/utils/permissions";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";

import "./SelectTest.css";

const ORANGE_TYPES = ["ket", "pet", "flyers", "movers", "starters"];
const ORANGE_TYPE_NAMES = {
  ket: "KET (A2 Key)",
  pet: "PET (B1 Preliminary)",
  flyers: "Flyers (A2)",
  movers: "Movers (A1)",
  starters: "Starters (Pre-A1)",
};
const ORANGE_TYPE_CARD_LABELS = {
  ket: "KET",
  pet: "PET",
  flyers: "Flyers",
  movers: "Movers",
  starters: "Starters",
};
const ORANGE_TYPE_ICONS = {
  ket: "orange",
  pet: "pet",
  flyers: "flyers",
  movers: "movers",
  starters: "starters",
};
const PLATFORM_TABS = [
  { key: "ix", label: "IX", icon: "tests", hint: "Focused IELTS-style skills." },
  { key: "orange", label: "Orange", icon: "orange", hint: "Cambridge levels grouped cleanly." },
];
const IX_TABS = [
  { key: "writing", label: "Writing", icon: "writing", hint: "Essays and teacher review." },
  { key: "reading", label: "Reading", icon: "reading", hint: "Timed passages and matching." },
  { key: "listening", label: "Listening", icon: "listening", hint: "Audio-first practice." },
];
const SKILL_META = {
  writing: { label: "Writing", icon: "writing", hint: "Draft and submit." },
  reading: { label: "Reading", icon: "reading", hint: "Passages and timed practice." },
  listening: { label: "Listening", icon: "listening", hint: "Audio drills." },
};

const SelectTest = () => {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch (err) {
    localStorage.removeItem("user");
    user = null;
  }
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

  const updateSelectRoute = (next = {}) => {
    const nextPlatform = next.platform || activePlatform || "ix";
    const params = new URLSearchParams();

    if (nextPlatform === "orange") {
      const nextType = ORANGE_TYPES.includes(next.type) ? next.type : activeOrangeType || "ket";
      const allowedOrangeTabs = nextType === "pet"
        ? ["listening", "reading", "writing"]
        : ["listening", "reading"];
      const requestedOrangeTab = next.tab || activeOrangeTab || "listening";
      const nextTab = allowedOrangeTabs.includes(requestedOrangeTab) ? requestedOrangeTab : "listening";

      params.set("platform", "orange");
      params.set("type", nextType);
      params.set("tab", nextTab);
    } else {
      const nextTab = ["writing", "reading", "listening"].includes(next.tab)
        ? next.tab
        : activeIxTab || "writing";

      params.set("platform", "ix");
      params.set("tab", nextTab);
    }

    navigate(`/select-test?${params.toString()}`);
  };

  useEffect(() => {
    const fetchAllTests = async () => {
      try {
        setLoading(true);
        const writingPath = isTeacher ? 'writing-tests?includeArchived=1' : 'writing-tests';
        const readingPath = isTeacher ? 'reading-tests?includeArchived=1' : 'reading-tests';
        const listeningPath = isTeacher ? 'listening-tests?includeArchived=1' : 'listening-tests';
        const cambridgePath = isTeacher ? 'cambridge?visibility=all' : 'cambridge';
        const [writingRes, readingRes, listeningRes, cambridgeRes] = await Promise.all([
          fetch(apiPath(writingPath)),
          fetch(apiPath(readingPath)),
          fetch(apiPath(listeningPath)),
          fetch(apiPath(cambridgePath)),
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
        console.error("Failed to load tests:", err);
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
  }, [isTeacher]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rawPlatform = params.get("platform");
    const rawType = params.get("type");
    const rawTab = params.get("tab");
    const nextPlatform = rawPlatform === "orange" ? "orange" : "ix";
    const nextIxTab = ["writing", "reading", "listening"].includes(rawTab) ? rawTab : "writing";
    const nextOrangeType = ORANGE_TYPES.includes(rawType) ? rawType : "ket";
    const allowedOrangeTabs = nextOrangeType === "pet"
      ? ["listening", "reading", "writing"]
      : ["listening", "reading"];
    const nextOrangeTab = allowedOrangeTabs.includes(rawTab) ? rawTab : "listening";

    setActivePlatform(nextPlatform);
    setActiveIxTab(nextIxTab);
    setActiveOrangeType(nextOrangeType);
    setActiveOrangeTab(nextOrangeTab);
  }, [location.search]);

  useEffect(() => {
    setVisibleCount(12);
    setSearchQuery("");
    setSortMode("newest");
  }, [activePlatform, activeIxTab, activeOrangeType, activeOrangeTab]);

  const handleSelectWriting = (test) => {
    const numericId = parseInt(test.id, 10);
    if (!numericId || isNaN(numericId)) {
      console.error("Invalid test ID:", test?.id);
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

  const orangeTypeCounts = useMemo(() => {
    return ORANGE_TYPES.reduce((acc, type) => {
      acc[type] = (tests.cambridge || []).filter((test) => {
        const testTypeRaw = String(test?.testType || "").toLowerCase();
        if (testTypeRaw === "pet-writing") return type === "pet";
        return testTypeRaw === type || testTypeRaw.startsWith(`${type}-`);
      }).length;
      return acc;
    }, {});
  }, [tests.cambridge]);

  const orangeSkillTabs = useMemo(
    () => [
      { key: "listening", label: "Listening", count: orangeCounts.listening, icon: "listening" },
      { key: "reading", label: "Reading", count: orangeCounts.reading, icon: "reading" },
      ...(activeOrangeType === "pet"
        ? [{ key: "writing", label: "Writing", count: orangeCounts.writing, icon: "writing" }]
        : []),
    ],
    [activeOrangeType, orangeCounts]
  );
  const orangeConfig = useMemo(() => {
    const key = activeOrangeTab === "writing" ? "pet-writing" : `${activeOrangeType}-${activeOrangeTab}`;
    return TEST_CONFIGS[key] || TEST_CONFIGS[activeOrangeType] || {};
  }, [activeOrangeTab, activeOrangeType]);

  const ixTotalCount = (tests.writing?.length || 0) + (tests.reading?.length || 0) + (tests.listening?.length || 0);
  const orangeTotalCount = tests.cambridge?.length || 0;

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
  const canManageCurrentSelection = canManageCategory(user, currentContext.categoryForPermission);
  const currentSkillInfo = SKILL_META[activePlatform === "ix" ? activeIxTab : activeOrangeTab] || SKILL_META.reading;
  const currentShelfTitle = activePlatform === "ix"
    ? `IX ${currentSkillInfo.label}`
    : `${ORANGE_TYPE_NAMES[activeOrangeType]} • ${currentSkillInfo.label}`;
  const orangeCreatePath =
    activeOrangeTab === "writing"
      ? "/admin/create-pet-writing"
      : `/admin/create-${activeOrangeType}-${activeOrangeTab}`;
  const orangeCreateLabel = `Create ${activeOrangeType.toUpperCase()} ${
    SKILL_META[activeOrangeTab]?.label || activeOrangeTab
  } Test`;
  const heroTags = [
    {
      icon: activePlatform === "orange" ? ORANGE_TYPE_ICONS[activeOrangeType] || "orange" : "tests",
      label: activePlatform === "orange" ? ORANGE_TYPE_CARD_LABELS[activeOrangeType] : "IX",
    },
    { icon: currentSkillInfo.icon, label: currentSkillInfo.label },
    { icon: "tests", label: `${activeList.length} test${activeList.length === 1 ? "" : "s"}` },
  ];

  return (
    <>
      {isTeacher ? <AdminNavbar /> : <StudentNavbar />}
      <div className="select-test-page">
        <div className="select-test-shell">
          <section className={`select-test-toolbar select-test-toolbar--${activePlatform}`}>
            <div className="select-test-tabs">
              {PLATFORM_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() =>
                    updateSelectRoute(
                      tab.key === "orange"
                        ? { platform: "orange", type: activeOrangeType, tab: activeOrangeTab }
                        : { platform: "ix", tab: activeIxTab }
                    )
                  }
                  className={`select-test-tab ${activePlatform === tab.key ? "active" : ""}`}
                >
                  <span className="select-test-platformIcon" aria-hidden="true">
                    <LineIcon name={tab.icon} size={20} />
                  </span>
                  <span className="select-test-platformCopy">
                    <span className="select-test-tabLabel">{tab.label}</span>
                    <span className="select-test-tabMeta">{tab.hint}</span>
                  </span>
                  <span className="select-test-platformCount">
                    {tab.key === "ix" ? ixTotalCount : orangeTotalCount}
                  </span>
                </button>
              ))}
            </div>

            <div className="select-test-toolbarMain">
              <div className="select-test-toolbarIdentity">
                <h1 className="select-test-toolbarTitle">{currentShelfTitle}</h1>
                <div className="select-test-toolbarPills">
                  {heroTags.map((tag) => (
                    <span key={`${tag.icon}-${tag.label}`} className="select-test-heroTag select-test-toolbarPill">
                      <LineIcon name={tag.icon} size={14} />
                      <span>{tag.label}</span>
                    </span>
                  ))}
                </div>
              </div>

              {currentContext.isOrange && canManageCurrentSelection ? (
                <button
                  type="button"
                  className="select-test-create select-test-create--toolbar"
                  onClick={() => navigate(orangeCreatePath)}
                >
                  <LineIcon name="create" size={16} />
                  <span>{orangeCreateLabel}</span>
                </button>
              ) : null}
            </div>
          </section>

          <section className="select-test-orbit select-test-orbit--compact">
            <div className="select-test-orbitMain">
              {activePlatform === "ix" ? (
                <div className="select-test-selectorBlock select-test-selectorBlock--inline">
                  <div className="select-test-selectorHeader select-test-selectorHeader--compact">
                    <span className="select-test-selectorStep">IX</span>
                    <h2 className="select-test-selectorTitle">Skill</h2>
                  </div>

                  <div className="select-test-pillRow">
                    {IX_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => updateSelectRoute({ platform: "ix", tab: tab.key })}
                        className={`select-test-pillButton select-test-pillButton--${tab.key} ${activeIxTab === tab.key ? "active" : ""}`}
                      >
                        <span className="select-test-skillIcon" aria-hidden="true">
                          <LineIcon name={tab.icon} size={16} />
                        </span>
                        <span className="select-test-pillLabel">{tab.label}</span>
                        <span className="select-test-pillCount">{tests[tab.key]?.length ?? 0}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="select-test-selectorBlock select-test-selectorBlock--inline">
                    <div className="select-test-selectorHeader select-test-selectorHeader--compact">
                      <span className="select-test-selectorStep">Level</span>
                      <h2 className="select-test-selectorTitle">Exam</h2>
                    </div>

                    <div className="select-test-pillRow select-test-pillRow--levels">
                      {ORANGE_TYPES.map((type) => (
                        <button
                          key={type}
                          onClick={() =>
                            updateSelectRoute({
                              platform: "orange",
                              type,
                              tab: type !== "pet" && activeOrangeTab === "writing" ? "listening" : activeOrangeTab,
                            })
                          }
                          className={`select-test-pillButton select-test-pillButton--${type}${activeOrangeType === type ? " active" : ""}`}
                        >
                          <span className="select-test-skillIcon" aria-hidden="true">
                            <LineIcon name={ORANGE_TYPE_ICONS[type] || "orange"} size={16} />
                          </span>
                          <span className="select-test-pillLabel">{ORANGE_TYPE_CARD_LABELS[type] || ORANGE_TYPE_NAMES[type] || type.toUpperCase()}</span>
                          <span className="select-test-pillCount">{orangeTypeCounts[type] ?? 0}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="select-test-selectorBlock select-test-selectorBlock--inline">
                    <div className="select-test-selectorHeader select-test-selectorHeader--compact">
                      <span className="select-test-selectorStep">Skill</span>
                      <h2 className="select-test-selectorTitle">Skill</h2>
                    </div>

                    <div className="select-test-pillRow">
                      {orangeSkillTabs.map((skill) => (
                        <button
                          key={skill.key}
                          onClick={() => updateSelectRoute({ platform: "orange", type: activeOrangeType, tab: skill.key })}
                          className={`select-test-pillButton select-test-pillButton--${skill.key} ${activeOrangeTab === skill.key ? "active" : ""}`}
                        >
                          <span className="select-test-skillIcon" aria-hidden="true">
                            <LineIcon name={skill.icon} size={16} />
                          </span>
                          <span className="select-test-pillLabel">{skill.label}</span>
                          <span className="select-test-pillCount">{skill.count}</span>
                        </button>
                      ))}
                    </div>

                    <div className="select-test-shelfMeta">
                      <span className="select-test-shelfMetaItem">{activeOrangeType.toUpperCase()}</span>
                      <span className="select-test-shelfMetaItem">{orangeConfig.totalQuestions || "?"} Q</span>
                      <span className="select-test-shelfMetaItem">{orangeConfig.duration || "?"} min</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="select-test-resultsSection">
            <div className="select-test-controls select-test-controls--minimal">
            <label className="select-test-control select-test-control--search">
              <span className="select-test-controlIcon" aria-hidden="true">
                <LineIcon name="search" size={18} />
              </span>
              <span className="select-test-controlContent">
                <span className="select-test-controlLabel">Search</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Class, teacher, title"
                  className="select-test-search"
                />
              </span>
            </label>

            <label className="select-test-control select-test-control--sort">
              <span className="select-test-controlIcon" aria-hidden="true">
                <LineIcon name="selector" size={18} />
              </span>
              <span className="select-test-controlContent">
                <span className="select-test-controlLabel">Sort</span>
                <span className="select-test-selectWrap">
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value)}
                    className="select-test-sort"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="index-desc">Highest index</option>
                    <option value="index-asc">Lowest index</option>
                  </select>
                  <span className="select-test-controlChevron" aria-hidden="true">
                    <LineIcon name="chevron-down" size={16} />
                  </span>
                </span>
              </span>
            </label>
            </div>

          {/* Test List */}
          {loading ? (
            <div className="select-test-stateCard">
              <span className="select-test-stateIcon" aria-hidden="true">
                <LineIcon name="tests" size={22} />
              </span>
              <h3 className="select-test-stateTitle">Loading the library</h3>
              <p className="select-test-loading">Fetching tests.</p>
            </div>
          ) : activeList.length === 0 ? (
            <div className="select-test-emptyState">
              <span className="select-test-stateIcon" aria-hidden="true">
                <LineIcon name={currentSkillInfo.icon} size={22} />
              </span>
              <h3 className="select-test-stateTitle">No tests ready for this shelf yet</h3>
              <p className="select-test-empty">Switch shelf or add the first test.</p>
              {currentContext.isOrange && canManageCurrentSelection ? (
                <div className="select-test-adminActions">
                  <button
                    type="button"
                    className="select-test-create"
                    onClick={() => navigate(orangeCreatePath)}
                  >
                    <LineIcon name="create" size={16} />
                    <span>{orangeCreateLabel}</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="select-test-grid">
                {currentContext.isOrange ? (
                  visibleList.map((test, index) => {
                    const classCode = test.classCode || "N/A";
                    const teacherName = test.teacherName || "N/A";
                    const displayTitle = SKILL_META[activeOrangeTab]?.label || "Orange";
                    const orangeCardTitle = test.title || `${activeOrangeType.toUpperCase()} ${displayTitle}`;

                    return (
                      <div
                        key={`cambridge-${test.category || "unknown"}-${test.id}`}
                        className={`select-test-card select-test-card--${activeOrangeTab} select-test-card--orange`}
                      >
                        <button
                          type="button"
                          className="select-test-cardMain"
                          onClick={() => handleSelectCambridge(test)}
                        >
                          <div className="select-test-cardHeader">
                            <span className={`select-test-cardBadge select-test-cardBadge--${activeOrangeTab}`}>
                              <LineIcon name={SKILL_META[activeOrangeTab]?.icon || "orange"} size={16} />
                              <span>{displayTitle}</span>
                            </span>
                            <span className="select-test-cardNum">#{index + 1}</span>
                          </div>

                          <div className="select-test-cardTitle">
                            <span className="select-test-cardText">{orangeCardTitle}</span>
                          </div>

                          <div className="select-test-cardMeta select-test-cardMeta--grid">
                            <span className="select-test-chip">{classCode}</span>
                            <span className="select-test-cardPill">
                              <LineIcon name="teacher" size={14} />
                              <span>Teacher: {teacherName}</span>
                            </span>
                          </div>

                          <div className="select-test-cardFooter">
                            <span className="select-test-cardFootnote">
                              {orangeConfig.totalQuestions || "?"} Q • {orangeConfig.duration || "?"} min
                            </span>
                            <span className="select-test-cardActionHint">Open test</span>
                          </div>
                        </button>

                        {canManageCategory(user, currentContext.categoryForPermission) && (
                          <button
                            type="button"
                            className="select-test-edit select-test-edit--orange"
                            onClick={() => handleEdit(test.id, "cambridge", test)}
                          >
                            <span>Edit Test</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  visibleList.map((test, index) => {
                    const title = getTestTitle(test, currentContext.displayType, index + 1);
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
                          <div className="select-test-cardHeader">
                            <span className={`select-test-cardBadge select-test-cardBadge--${activeIxTab}`}>
                              <LineIcon name={SKILL_META[activeIxTab]?.icon || "tests"} size={16} />
                              <span>{SKILL_META[activeIxTab]?.label || activeIxTab}</span>
                            </span>
                            <span className="select-test-cardNum">#{index + 1}</span>
                          </div>

                          <div className="select-test-cardTitle">
                            <span className="select-test-cardText">{title}</span>
                          </div>

                          <div className="select-test-cardMeta select-test-cardMeta--grid">
                            <span className="select-test-chip">{classCode}</span>
                            <span className="select-test-cardPill">
                              <LineIcon name="teacher" size={14} />
                              <span>Teacher: {teacherName}</span>
                            </span>
                          </div>

                          <div className="select-test-cardFooter">
                            <span className="select-test-cardFootnote">{SKILL_META[activeIxTab]?.label || activeIxTab}</span>
                            <span className="select-test-cardActionHint">Open test</span>
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
                            <span>Edit Test</span>
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
                    Load More ({remainingCount})
                </button>
              ) : null}
            </>
          )}
          </section>
        </div>
      </div>
    </>
  );
};

export default SelectTest;

