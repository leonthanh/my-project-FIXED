import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StudentNavbar from "../../../shared/components/StudentNavbar";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import LineIcon from "../../../shared/components/LineIcon.jsx";
import { apiPath, authFetch } from "../../../shared/utils/api";
import { canManageCategory } from "../../../shared/utils/permissions";
import {
  DEFAULT_IX_SKILL,
  IX_SKILLS,
  SKILL_META,
} from '../../../domains/ix/config/skills';
import {
  DEFAULT_ORANGE_SKILL,
  DEFAULT_ORANGE_TYPE,
  getOrangeAllowedSkills,
  getOrangeLevelMeta,
  ORANGE_LEVELS,
} from '../../../domains/cambridge/config/levels';
import {
  getOrangeCreatePath,
  getOrangeEditPath,
  getOrangeHubStateForTestType,
  getOrangeStudentPath,
  getOrangeTestConfig,
  matchesOrangeTestType,
} from '../../../domains/cambridge/config/navigation';
import {
  PLATFORM_TABS,
  buildSelectTestPath,
  parseSelectTestSearch,
} from "../../../shared/config/examRegistry";
import {
  buildPlacementSharePath,
  buildPlacementShareUrl,
  createPlacementSelection,
  isPlacementEligible,
  normalizePlacementSelections,
} from "../../../shared/utils/placementTests";

import "./SelectTest.css";

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
  const [activeIxTab, setActiveIxTab] = useState(DEFAULT_IX_SKILL);
  const [activeOrangeType, setActiveOrangeType] = useState(DEFAULT_ORANGE_TYPE);
  const [activeOrangeTab, setActiveOrangeTab] = useState(DEFAULT_ORANGE_SKILL);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(12);
  const [placementSelections, setPlacementSelections] = useState([]);
  const [placementShareToken, setPlacementShareToken] = useState("");
  const [placementRecentAttempts, setPlacementRecentAttempts] = useState([]);
  const [placementLoading, setPlacementLoading] = useState(Boolean(isTeacher));
  const [placementSaving, setPlacementSaving] = useState(false);
  const [placementFeedback, setPlacementFeedback] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const applyPlacementPackage = useMemo(
    () => (placementPackage) => {
      setPlacementSelections(normalizePlacementSelections(placementPackage?.items));
      setPlacementShareToken(String(placementPackage?.shareToken || ""));
      setPlacementRecentAttempts(
        Array.isArray(placementPackage?.recentAttempts)
          ? placementPackage.recentAttempts.slice(0, 6)
          : []
      );
    },
    []
  );

  const updateSelectRoute = (next = {}) => {
    const nextPlatform = next.platform || activePlatform || "ix";

    navigate(buildSelectTestPath({
      platform: nextPlatform,
      type: next.type || activeOrangeType || DEFAULT_ORANGE_TYPE,
      tab: nextPlatform === "orange"
        ? next.tab || activeOrangeTab || DEFAULT_ORANGE_SKILL
        : next.tab || activeIxTab || DEFAULT_IX_SKILL,
    }));
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
    const nextState = parseSelectTestSearch(location.search);

    setActivePlatform(nextState.platform);
    setActiveIxTab(nextState.ixTab);
    setActiveOrangeType(nextState.orangeType);
    setActiveOrangeTab(nextState.orangeTab);
  }, [location.search]);

  useEffect(() => {
    setVisibleCount(12);
    setSearchQuery("");
    setSortMode("newest");
  }, [activePlatform, activeIxTab, activeOrangeType, activeOrangeTab]);

  useEffect(() => {
    let isMounted = true;

    const fetchPlacementPackage = async () => {
      if (!isTeacher) {
        setPlacementSelections([]);
        setPlacementShareToken("");
        setPlacementRecentAttempts([]);
        setPlacementLoading(false);
        return;
      }

      try {
        setPlacementLoading(true);
        const res = await authFetch(apiPath("placement/packages/current"));
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.message || "Could not load the placement package.");
        }

        if (!isMounted) return;
        applyPlacementPackage(data || null);
      } catch (error) {
        if (!isMounted) return;
        setPlacementFeedback(error?.message || "Could not load the placement package.");
      } finally {
        if (isMounted) {
          setPlacementLoading(false);
        }
      }
    };

    fetchPlacementPackage();

    return () => {
      isMounted = false;
    };
  }, [applyPlacementPackage, isTeacher]);

  useEffect(() => {
    if (!placementFeedback || typeof window === "undefined") return undefined;

    const timerId = window.setTimeout(() => {
      setPlacementFeedback("");
    }, 2600);

    return () => window.clearTimeout(timerId);
  }, [placementFeedback]);

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
    const rawTestType = String(test.testType || 'ket-reading').toLowerCase();
    const { type, tab } = getOrangeHubStateForTestType(rawTestType);
    navigate(getOrangeStudentPath(type, tab, test.id));
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
      const rawTestType = String(test.testType || '').toLowerCase();
      const { type, tab } = getOrangeHubStateForTestType(rawTestType);
      navigate(getOrangeEditPath(type, tab, testId));
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
    return (tests.cambridge || []).filter((test) => matchesOrangeTestType(activeOrangeType, test?.testType));
  }, [tests.cambridge, activeOrangeType]);

  const orangeCounts = useMemo(() => {
    const listening = orangeFilteredByType.filter((t) => getCambridgeCategory(t) === "listening").length;
    const reading = orangeFilteredByType.filter((t) => getCambridgeCategory(t) === "reading").length;
    const writing = orangeFilteredByType.filter((t) => String(t?.testType || "").toLowerCase() === "pet-writing").length;
    return { listening, reading, writing };
  }, [orangeFilteredByType]);

  const orangeTypeCounts = useMemo(() => {
    return ORANGE_LEVELS.reduce((acc, type) => {
      acc[type.id] = (tests.cambridge || []).filter((test) => matchesOrangeTestType(type.id, test?.testType)).length;
      return acc;
    }, {});
  }, [tests.cambridge]);

  const orangeSkillTabs = useMemo(
    () => getOrangeAllowedSkills(activeOrangeType).map((skill) => ({
      key: skill,
      label: SKILL_META[skill]?.label || skill,
      count: orangeCounts[skill] || 0,
      icon: SKILL_META[skill]?.icon || skill,
    })),
    [activeOrangeType, orangeCounts]
  );
  const orangeConfig = useMemo(() => getOrangeTestConfig(activeOrangeType, activeOrangeTab), [activeOrangeTab, activeOrangeType]);

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
  const placementSelectionKeys = useMemo(
    () => new Set((placementSelections || []).map((item) => item.key)),
    [placementSelections]
  );
  const placementSharePath = useMemo(
    () => buildPlacementSharePath(placementShareToken),
    [placementShareToken]
  );
  const placementShareUrl = useMemo(
    () => buildPlacementShareUrl(placementShareToken),
    [placementShareToken]
  );
  const activeOrangeLevel = getOrangeLevelMeta(activeOrangeType);
  const currentSkillInfo = SKILL_META[activePlatform === "ix" ? activeIxTab : activeOrangeTab] || SKILL_META.reading;
  const currentShelfTitle = activePlatform === "ix"
    ? `IX ${currentSkillInfo.label}`
    : `${activeOrangeLevel.name} • ${currentSkillInfo.label}`;
  const orangeCreatePath = getOrangeCreatePath(activeOrangeType, activeOrangeTab);
  const orangeCreateLabel = `Create ${activeOrangeLevel.shortLabel} ${currentSkillInfo.label} Test`;
  const heroTags = [
    {
      icon: activePlatform === "orange" ? activeOrangeLevel.iconName || "orange" : "tests",
      label: activePlatform === "orange" ? activeOrangeLevel.shortLabel : "IX",
    },
    { icon: currentSkillInfo.icon, label: currentSkillInfo.label },
    { icon: "tests", label: `${activeList.length} test${activeList.length === 1 ? "" : "s"}` },
  ];

  const buildPlacementSubtitle = (...parts) => parts.filter(Boolean).join(" • ");

  const buildIxPlacementSelection = (test, title) => {
    return createPlacementSelection({
      platform: "ix",
      skill: activeIxTab,
      testId: test.id,
      testType: `ix-${activeIxTab}`,
      title,
      subtitle: buildPlacementSubtitle(
        test.classCode || "",
        test.teacherName ? `Teacher ${test.teacherName}` : ""
      ),
      badge: "IX",
    });
  };

  const buildOrangePlacementSelection = (test, title, displayTitle) => {
    return createPlacementSelection({
      platform: "orange",
      skill: activeOrangeTab,
      testId: test.id,
      testType: test.testType,
      title,
      subtitle: buildPlacementSubtitle(
        activeOrangeLevel.shortLabel,
        displayTitle,
        test.classCode || ""
      ),
      badge: activeOrangeLevel.shortLabel,
      questionsLabel: `${orangeConfig.totalQuestions || "?"} Q`,
      durationLabel: `${orangeConfig.duration || "?"} min`,
    });
  };

  const persistPlacementSelections = async (nextSelections, successMessage, rollbackSelections) => {
    try {
      setPlacementSaving(true);
      const res = await authFetch(apiPath("placement/packages/current"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: normalizePlacementSelections(nextSelections) }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Could not save the placement package.");
      }

      applyPlacementPackage(data || null);
      setPlacementFeedback(successMessage);
    } catch (error) {
      setPlacementSelections(rollbackSelections);
      setPlacementFeedback(error?.message || "Could not save the placement package.");
    } finally {
      setPlacementSaving(false);
    }
  };

  const handleTogglePlacement = async (selection) => {
    const isShown = placementSelectionKeys.has(selection.key);
    const nextSelections = isShown
      ? placementSelections.filter((entry) => entry?.key !== selection.key)
      : normalizePlacementSelections(placementSelections.concat(selection));

    setPlacementSelections(nextSelections);
    await persistPlacementSelections(
      nextSelections,
      isShown
        ? `${selection.title} is now hidden from the placement page.`
        : `${selection.title} is now shown on the placement page.`,
      placementSelections
    );
  };

  const handleCopyPlacementLink = async () => {
    if (!placementSelections.length || !placementShareToken) return;

    try {
      await navigator.clipboard.writeText(placementShareUrl);
      setPlacementFeedback("Placement link copied. Share it with the student device.");
    } catch (error) {
      setPlacementFeedback("Could not copy the link. Open the placement preview instead.");
    }
  };

  const handleClearPlacement = async () => {
    setPlacementSelections([]);
    await persistPlacementSelections([], "Placement list cleared.", placementSelections);
  };

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
                    {IX_SKILLS.map((tab) => (
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
                      {ORANGE_LEVELS.map((type) => (
                        <button
                          key={type.id}
                          onClick={() =>
                            updateSelectRoute({
                              platform: "orange",
                              type: type.id,
                              tab: activeOrangeTab,
                            })
                          }
                          className={`select-test-pillButton select-test-pillButton--${type.id}${activeOrangeType === type.id ? " active" : ""}`}
                        >
                          <span className="select-test-skillIcon" aria-hidden="true">
                            <LineIcon name={type.iconName || "orange"} size={16} />
                          </span>
                          <span className="select-test-pillLabel">{type.shortLabel || type.name}</span>
                          <span className="select-test-pillCount">{orangeTypeCounts[type.id] ?? 0}</span>
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
                      <span className="select-test-shelfMetaItem">{activeOrangeLevel.shortLabel}</span>
                      <span className="select-test-shelfMetaItem">{orangeConfig.totalQuestions || "?"} Q</span>
                      <span className="select-test-shelfMetaItem">{orangeConfig.duration || "?"} min</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="select-test-resultsSection">
            {isTeacher ? (
              <div className="select-test-placementPanel">
                <div className="select-test-placementCopy">
                  <span className="select-test-placementEyebrow">Placement Test</span>
                  <h3 className="select-test-placementTitle">Show on or show off the public placement list</h3>
                  <p className="select-test-placementText">
                    Toggle reading and listening tests below, then preview or copy the shared placement link that stays synced across devices.
                  </p>

                  <div className="select-test-shelfMeta">
                    <span className="select-test-shelfMetaItem">{placementSelections.length} shown</span>
                    <span className="select-test-shelfMetaItem">{placementRecentAttempts.length} tracked</span>
                    <span className="select-test-shelfMetaItem">
                      {placementLoading ? "Loading package" : placementSaving ? "Saving package" : "Synced package"}
                    </span>
                  </div>

                  {placementRecentAttempts.length ? (
                    <div className="select-test-shelfMeta">
                      {placementRecentAttempts.map((attempt) => {
                        const total = Number(attempt?.summary?.total) || 0;
                        const submitted = Number(attempt?.summary?.submitted) || 0;
                        return (
                          <span key={attempt.attemptToken} className="select-test-shelfMetaItem">
                            {attempt.studentName || "Student"} • {submitted}/{total}
                          </span>
                        );
                      })}
                    </div>
                  ) : null}

                  {placementFeedback ? (
                    <p className="select-test-placementStatus">{placementFeedback}</p>
                  ) : null}
                </div>

                <div className="select-test-placementActions">
                  <button
                    type="button"
                    className="select-test-create select-test-create--toolbar"
                    onClick={() => navigate(placementSharePath)}
                    disabled={!placementSelections.length || !placementShareToken || placementLoading}
                  >
                    <LineIcon name="tests" size={16} />
                    <span>Preview Placement Page</span>
                  </button>

                  <button
                    type="button"
                    className="select-test-placementAction"
                    onClick={handleCopyPlacementLink}
                    disabled={!placementSelections.length || !placementShareToken || placementLoading}
                  >
                    <LineIcon name="link" size={16} />
                    <span>Copy Placement Link</span>
                  </button>

                  <button
                    type="button"
                    className="select-test-placementAction select-test-placementAction--ghost"
                    onClick={handleClearPlacement}
                    disabled={!placementSelections.length || placementSaving}
                  >
                    <LineIcon name="trash" size={16} />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>
            ) : null}

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
                    const orangeCardTitle = test.title || `${activeOrangeLevel.shortLabel} ${displayTitle}`;
                    const placementSelection = buildOrangePlacementSelection(test, orangeCardTitle, displayTitle);
                    const placementEligible = canManageCurrentSelection && isPlacementEligible({
                      platform: "orange",
                      skill: activeOrangeTab,
                      testType: test.testType,
                    });
                    const placementShown = placementEligible && placementSelectionKeys.has(placementSelection.key);

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
                            <div className="select-test-cardFooterMeta">
                              {placementEligible ? (
                                <span className={`select-test-cardPlacementState${placementShown ? " is-active" : ""}`}>
                                  {placementShown ? "Placement On" : "Placement Off"}
                                </span>
                              ) : null}
                              <span className="select-test-cardActionHint">Open test</span>
                            </div>
                          </div>
                        </button>

                        {canManageCurrentSelection || placementEligible ? (
                          <div className="select-test-cardActions">
                            {canManageCurrentSelection ? (
                              <button
                                type="button"
                                className="select-test-edit select-test-edit--orange"
                                onClick={() => handleEdit(test.id, "cambridge", test)}
                              >
                                <span>Edit Test</span>
                              </button>
                            ) : null}

                            {placementEligible ? (
                              <button
                                type="button"
                                className={`select-test-placementToggle${placementShown ? " is-active" : ""}`}
                                disabled={placementSaving}
                                onClick={() => handleTogglePlacement(placementSelection)}
                              >
                                <LineIcon name={placementShown ? "publish" : "target"} size={16} />
                                <span>{placementShown ? "Show Off Placement" : "Show On Placement"}</span>
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  visibleList.map((test, index) => {
                    const title = getTestTitle(test, currentContext.displayType, index + 1);
                    const classCode = test.classCode || "N/A";
                    const teacherName = test.teacherName || "N/A";
                    const placementSelection = buildIxPlacementSelection(test, title);
                    const placementEligible = canManageCurrentSelection && isPlacementEligible({
                      platform: "ix",
                      skill: activeIxTab,
                      testType: placementSelection.testType,
                    });
                    const placementShown = placementEligible && placementSelectionKeys.has(placementSelection.key);

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
                            <div className="select-test-cardFooterMeta">
                              {placementEligible ? (
                                <span className={`select-test-cardPlacementState${placementShown ? " is-active" : ""}`}>
                                  {placementShown ? "Placement On" : "Placement Off"}
                                </span>
                              ) : null}
                              <span className="select-test-cardActionHint">Open test</span>
                            </div>
                          </div>
                        </button>

                        {canManageCurrentSelection || placementEligible ? (
                          <div className="select-test-cardActions">
                            {canManageCurrentSelection ? (
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

                            {placementEligible ? (
                              <button
                                type="button"
                                className={`select-test-placementToggle${placementShown ? " is-active" : ""}`}
                                disabled={placementSaving}
                                onClick={() => handleTogglePlacement(placementSelection)}
                              >
                                <LineIcon name={placementShown ? "publish" : "target"} size={16} />
                                <span>{placementShown ? "Show Off Placement" : "Show On Placement"}</span>
                              </button>
                            ) : null}
                          </div>
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

