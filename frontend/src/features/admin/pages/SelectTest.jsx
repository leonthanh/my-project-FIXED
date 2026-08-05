import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StudentNavbar from "../../../shared/components/StudentNavbar";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import LineIcon from "../../../shared/components/LineIcon.jsx";
import { apiPath, authFetch } from "../../../shared/utils/api";
import { canManageCategory, isAdmin } from "../../../shared/utils/permissions";
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
  DEFAULT_FCE_SKILL,
  DEFAULT_FCE_TYPE,
  FCE_LEVEL_META,
  FCE_SKILL_META,
  FCE_SKILLS,
} from '../../../domains/fce/config';
import {
  getFceCreatePath,
  getFceEditPath,
  getFceHubStateForTestType,
  getFceStudentPath,
  getFceTestConfig,
  matchesFceTestType,
} from '../../../domains/fce/config/navigation';
import {
  buildPlatformTabs,
  buildSelectTestPath,
  parseSelectTestSearch,
} from "../../../shared/config/examRegistry";
import { useDisplaySettings } from "../../../shared/contexts/DisplaySettingsContext";
import {
  buildPlacementSharePath,
  createPlacementSelection,
  isPlacementEligible,
  normalizePlacementSelections,
} from "../../../shared/utils/placementTests";

import "./SelectTest.css";

const FINALIZED_READING_SUBMISSION = (submission) =>
  submission?.finished === true || submission?.finished == null;

const FINALIZED_LISTENING_SUBMISSION = (submission) =>
  submission?.finished === true || submission?.finished == null;

const FINALIZED_WRITING_SUBMISSION = (submission) =>
  submission?.isDraft === false || submission?.isDraft == null;

const FINALIZED_CAMBRIDGE_SUBMISSION = (submission) =>
  submission?.finished === true || submission?.finished == null;

const normalizeAttemptValue = (value, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return Math.max(1, Number(fallback) || 1);
  }

  return parsed;
};

const normalizeTestTypeKey = (value) => String(value || "").trim().toLowerCase();

const buildAttemptScopeKey = ({ scope, testId, testType } = {}) => {
  const normalizedScope = String(scope || "").trim().toLowerCase();
  const numericTestId = Number.parseInt(String(testId ?? ""), 10);

  if (!normalizedScope || !Number.isFinite(numericTestId) || numericTestId <= 0) {
    return null;
  }

  if (normalizedScope === "cambridge") {
    const normalizedType = normalizeTestTypeKey(testType);
    if (!normalizedType) return null;
    return `${normalizedScope}:${numericTestId}:${normalizedType}`;
  }

  return `${normalizedScope}:${numericTestId}`;
};

const incrementAttemptKeyCount = (target, key) => {
  if (!key) return;
  target[key] = Number(target[key] || 0) + 1;
};

const SelectTest = () => {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch (err) {
    localStorage.removeItem("user");
    user = null;
  }
  const userRole = String(user?.role || "").toLowerCase();
  const isTeacher = userRole === "teacher" || userRole === "admin";
  const isStudent = userRole === "student";
  const isPlacementAdmin = isAdmin(user);
  const userPhone = String(user?.phone || "").trim();
  const userId = Number(user?.id || 0);

  const [tests, setTests] = useState({
    writing: [],
    reading: [],
    listening: [],
    cambridge: [],
    fce: [],
  });
  const [activePlatform, setActivePlatform] = useState("ix");
  const [activeIxTab, setActiveIxTab] = useState(DEFAULT_IX_SKILL);
  const [activeOrangeType, setActiveOrangeType] = useState(DEFAULT_ORANGE_TYPE);
  const [activeOrangeTab, setActiveOrangeTab] = useState(DEFAULT_ORANGE_SKILL);
  const [activeFceTab, setActiveFceTab] = useState(DEFAULT_FCE_SKILL);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(12);
  const [placementSelections, setPlacementSelections] = useState([]);
  const [placementShareToken, setPlacementShareToken] = useState("");
  const [placementRecentAttempts, setPlacementRecentAttempts] = useState([]);
  const [placementLoading, setPlacementLoading] = useState(Boolean(isPlacementAdmin));
  const [placementSaving, setPlacementSaving] = useState(false);
  const [placementFeedback, setPlacementFeedback] = useState("");
  const [attemptStatus, setAttemptStatus] = useState({
    maxAttempts: normalizeAttemptValue(user?.maxAttemptsPerTest, 1),
    countsByKey: {},
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { displayLabels } = useDisplaySettings();
  const fceDisplayName = String(displayLabels?.fceDisplayName || "FCE").trim() || "FCE";
  const platformTabs = useMemo(() => buildPlatformTabs(displayLabels), [displayLabels]);

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

    let nextTab;
    if (nextPlatform === "orange") {
      nextTab = next.tab || activeOrangeTab || DEFAULT_ORANGE_SKILL;
    } else if (nextPlatform === "fce") {
      nextTab = next.tab || activeFceTab || DEFAULT_FCE_SKILL;
    } else {
      nextTab = next.tab || activeIxTab || DEFAULT_IX_SKILL;
    }

    navigate(buildSelectTestPath({
      platform: nextPlatform,
      type: next.type || activeOrangeType || DEFAULT_ORANGE_TYPE,
      tab: nextTab,
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
        const orangeCambridge = cambridgeWithWriting.filter((t) => !matchesFceTestType(t?.testType));
        const fceCambridge = cambridgeWithWriting.filter((t) => matchesFceTestType(t?.testType));

        setTests({
          writing: ieltsWriting,
          reading: Array.isArray(readingData) ? readingData : [],
          listening: Array.isArray(listeningData) ? listeningData : [],
          cambridge: orangeCambridge,
          fce: fceCambridge,
        });
      } catch (err) {
        console.error("Failed to load tests:", err);
        setTests({
          writing: [],
          reading: [],
          listening: [],
          cambridge: [],
          fce: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllTests();
  }, [isTeacher]);

  useEffect(() => {
    let isMounted = true;

    const fetchArray = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json().catch(() => []);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    };

    const fetchAttemptStatus = async () => {
      if (!isStudent) {
        if (isMounted) {
          setAttemptStatus({
            maxAttempts: 1,
            countsByKey: {},
          });
        }
        return;
      }

      const fallbackMaxAttempts = normalizeAttemptValue(user?.maxAttemptsPerTest, 1);

      try {
        const statusRes = await authFetch(apiPath("auth/attempt-limit/status"));
        const statusData = await statusRes.json().catch(() => null);
        if (
          statusRes.ok &&
          statusData &&
          typeof statusData === "object" &&
          statusData.countsByKey &&
          typeof statusData.countsByKey === "object"
        ) {
          if (!isMounted) return;
          setAttemptStatus({
            maxAttempts: normalizeAttemptValue(statusData.maxAttempts, fallbackMaxAttempts),
            countsByKey: statusData.countsByKey,
          });
          return;
        }
      } catch (error) {
        // Fall through to phone-based fallback when status API is unavailable.
      }

      const numericUserId = Number.parseInt(String(userId || ""), 10);
      if (Number.isFinite(numericUserId) && numericUserId > 0) {
        try {
          const statusResByUserId = await fetch(apiPath(`auth/attempt-limit/status/${numericUserId}`));
          const statusDataByUserId = await statusResByUserId.json().catch(() => null);
          if (
            statusResByUserId.ok &&
            statusDataByUserId &&
            typeof statusDataByUserId === "object" &&
            statusDataByUserId.countsByKey &&
            typeof statusDataByUserId.countsByKey === "object"
          ) {
            if (!isMounted) return;
            setAttemptStatus({
              maxAttempts: normalizeAttemptValue(statusDataByUserId.maxAttempts, fallbackMaxAttempts),
              countsByKey: statusDataByUserId.countsByKey,
            });
            return;
          }
        } catch (error) {
          // Fall through to phone-based fallback when userId status API is unavailable.
        }
      }

      let resolvedPhone = userPhone;
      let resolvedMaxAttempts = fallbackMaxAttempts;

      try {
        const meRes = await authFetch(apiPath("auth/me"));
        const meData = await meRes.json().catch(() => null);
        if (meRes.ok && meData?.user) {
          resolvedPhone = String(meData.user.phone || resolvedPhone || "").trim();
          resolvedMaxAttempts = normalizeAttemptValue(
            meData.user.maxAttemptsPerTest,
            fallbackMaxAttempts
          );
        }
      } catch (error) {
        // Ignore profile refresh failures and keep local fallback values.
      }

      if (!resolvedPhone) {
        if (isMounted) {
          setAttemptStatus({
            maxAttempts: resolvedMaxAttempts,
            countsByKey: {},
          });
        }
        return;
      }

      const encodedPhone = encodeURIComponent(resolvedPhone);
      const [writingSubmissions, readingSubmissions, listeningSubmissions, cambridgeSubmissions] =
        await Promise.all([
          fetchArray(apiPath(`writing/user/${encodedPhone}`)),
          fetchArray(apiPath(`reading-submissions/user/${encodedPhone}`)),
          fetchArray(apiPath(`listening-submissions/user/${encodedPhone}`)),
          fetchArray(apiPath(`cambridge/submissions/user/${encodedPhone}`)),
        ]);

      const countsByKey = {};

      writingSubmissions
        .filter(FINALIZED_WRITING_SUBMISSION)
        .forEach((submission) => {
          incrementAttemptKeyCount(
            countsByKey,
            buildAttemptScopeKey({ scope: "ix-writing", testId: submission?.testId })
          );
        });

      readingSubmissions
        .filter(FINALIZED_READING_SUBMISSION)
        .forEach((submission) => {
          incrementAttemptKeyCount(
            countsByKey,
            buildAttemptScopeKey({ scope: "ix-reading", testId: submission?.testId })
          );
        });

      listeningSubmissions
        .filter(FINALIZED_LISTENING_SUBMISSION)
        .forEach((submission) => {
          incrementAttemptKeyCount(
            countsByKey,
            buildAttemptScopeKey({ scope: "ix-listening", testId: submission?.testId })
          );
        });

      cambridgeSubmissions
        .filter(FINALIZED_CAMBRIDGE_SUBMISSION)
        .forEach((submission) => {
          incrementAttemptKeyCount(
            countsByKey,
            buildAttemptScopeKey({
              scope: "cambridge",
              testId: submission?.testId,
              testType: submission?.testType,
            })
          );
        });

      if (!isMounted) return;

      setAttemptStatus({
        maxAttempts: resolvedMaxAttempts,
        countsByKey,
      });
    };

    fetchAttemptStatus().catch((error) => {
      if (!isMounted) return;
      setAttemptStatus({
        maxAttempts: normalizeAttemptValue(user?.maxAttemptsPerTest, 1),
        countsByKey: {},
      });
    });

    return () => {
      isMounted = false;
    };
  }, [isStudent, user?.maxAttemptsPerTest, userPhone, userId]);

  useEffect(() => {
    const nextState = parseSelectTestSearch(location.search);

    setActivePlatform(nextState.platform);
    setActiveIxTab(nextState.ixTab);
    setActiveOrangeType(nextState.orangeType);
    setActiveOrangeTab(nextState.orangeTab);
    setActiveFceTab(nextState.fceTab);
  }, [location.search]);

  useEffect(() => {
    setVisibleCount(12);
    setSearchQuery("");
    setSortMode("newest");
  }, [activePlatform, activeIxTab, activeOrangeType, activeOrangeTab, activeFceTab]);

  useEffect(() => {
    let isMounted = true;

    const fetchPlacementPackage = async () => {
      if (!isPlacementAdmin) {
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
  }, [applyPlacementPackage, isPlacementAdmin]);

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

  const handleSelectFce = (test) => {
    const rawTestType = String(test.testType || 'fce-reading-60').toLowerCase();
    const { tab } = getFceHubStateForTestType(rawTestType);
    navigate(getFceStudentPath(tab, test.id));
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
      if (matchesFceTestType(rawTestType)) {
        const { tab } = getFceHubStateForTestType(rawTestType);
        navigate(getFceEditPath(tab, testId));
        return;
      }
      const { type, tab } = getOrangeHubStateForTestType(rawTestType);
      navigate(getOrangeEditPath(type, tab, testId));
    } else if (testType === "fce" && test) {
      const rawTestType = String(test.testType || '').toLowerCase();
      const { tab } = getFceHubStateForTestType(rawTestType);
      navigate(getFceEditPath(tab, testId));
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
  const fceTotalCount = tests.fce?.length || 0;

  const fceSkillTabs = useMemo(
    () => FCE_SKILLS.map((skill) => ({
      key: skill.key,
      label: skill.label,
      count: (tests.fce || []).filter((test) => getCambridgeCategory(test) === skill.key).length,
      icon: skill.icon,
    })),
    [tests.fce]
  );

  const fceConfig = useMemo(() => getFceTestConfig(activeFceTab), [activeFceTab]);

  const currentContext = useMemo(() => {
    if (activePlatform === "ix") {
      return {
        list: tests[activeIxTab] || [],
        displayType: activeIxTab,
        categoryForPermission: activeIxTab,
        isOrange: false,
        isFce: false,
      };
    }

    if (activePlatform === "fce") {
      const selected = (tests.fce || []).filter((test) => getCambridgeCategory(test) === activeFceTab);

      return {
        list: selected,
        displayType: "fce",
        categoryForPermission: activeFceTab,
        isOrange: false,
        isFce: true,
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
      isFce: false,
    };
  }, [activePlatform, activeIxTab, activeOrangeTab, activeFceTab, tests, orangeFilteredByType]);

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
  const activeOrangeLevel = getOrangeLevelMeta(activeOrangeType);
  const currentSkillInfo =
    activePlatform === "fce"
      ? FCE_SKILL_META[activeFceTab] || FCE_SKILL_META.reading
      : SKILL_META[activePlatform === "ix" ? activeIxTab : activeOrangeTab] || SKILL_META.reading;
  const currentShelfTitle = (() => {
    if (activePlatform === "ix") return `IX ${currentSkillInfo.label}`;
    if (activePlatform === "fce") return `${fceDisplayName} ${currentSkillInfo.label}`;
    return `${activeOrangeLevel.name} • ${currentSkillInfo.label}`;
  })();
  const orangeCreatePath = getOrangeCreatePath(activeOrangeType, activeOrangeTab);
  const orangeCreateLabel = `Create ${activeOrangeLevel.shortLabel} ${currentSkillInfo.label} Test`;
  const fceCreatePath = getFceCreatePath(activeFceTab);
  const fceCreateLabel = `Create ${fceDisplayName} ${currentSkillInfo.label} Test`;
  const heroTags = [
    {
      icon: activePlatform === "orange"
        ? activeOrangeLevel.iconName || "orange"
        : activePlatform === "fce"
          ? FCE_LEVEL_META.iconName || "tests"
          : "tests",
      label:
        activePlatform === "orange"
          ? activeOrangeLevel.shortLabel
          : activePlatform === "fce"
            ? fceDisplayName
            : "IX",
    },
    { icon: currentSkillInfo.icon, label: currentSkillInfo.label },
    { icon: "tests", label: `${activeList.length} test${activeList.length === 1 ? "" : "s"}` },
  ];

  const buildPlacementSubtitle = (...parts) => parts.filter(Boolean).join(" • ");

  const resolveAttemptState = ({ scope, testId, testType } = {}) => {
    if (!isStudent) {
      return { isComplete: false, usedAttempts: 0 };
    }

    const key = buildAttemptScopeKey({ scope, testId, testType });
    if (!key) {
      return { isComplete: false, usedAttempts: 0 };
    }

    const usedAttempts = Number(attemptStatus.countsByKey[key] || 0);
    return {
      usedAttempts,
      isComplete: usedAttempts >= attemptStatus.maxAttempts,
    };
  };

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

  const buildFcePlacementSelection = (test, title, displayTitle) => {
    return createPlacementSelection({
      platform: "fce",
      skill: activeFceTab,
      testId: test.id,
      testType: test.testType,
      title,
      subtitle: buildPlacementSubtitle(
        fceDisplayName,
        displayTitle,
        test.classCode || ""
      ),
      badge: fceDisplayName,
      questionsLabel: `${fceConfig.totalQuestions || "?"} Q`,
      durationLabel: `${fceConfig.duration || "?"} min`,
    });
  };

  const persistPlacementSelections = async (nextSelections, successMessage, rollbackSelections) => {
    if (!isPlacementAdmin) {
      setPlacementFeedback("Only admins can manage the placement page.");
      return;
    }

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
    if (!isPlacementAdmin) {
      return;
    }

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

  const handleClearPlacement = async () => {
    if (!isPlacementAdmin) {
      return;
    }

    setPlacementSelections([]);
    await persistPlacementSelections([], "Placement list cleared.", placementSelections);
  };

  return (
    <>
      {isTeacher ? <AdminNavbar /> : <StudentNavbar />}
      <div className="select-test-page">
        <div className="select-test-shell">
          <section className="select-test-layout">
            <aside className="select-test-sidebar">
              <div className="select-test-sidebarCard">
                <div className="select-test-sidebarHeader">
                  <span className="select-test-sidebarEyebrow">Test library</span>
                  <h1 className="select-test-sidebarTitle">Select Test</h1>
                </div>

                <div className="select-test-sidebarPlatforms">
                  {platformTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() =>
                        updateSelectRoute(
                          tab.key === "orange"
                            ? { platform: "orange", type: activeOrangeType, tab: activeOrangeTab }
                            : tab.key === "fce"
                              ? { platform: "fce", type: DEFAULT_FCE_TYPE, tab: activeFceTab }
                              : { platform: "ix", tab: activeIxTab }
                        )
                      }
                      className={`select-test-sidePlatform select-test-sidePlatform--${tab.key}${activePlatform === tab.key ? " is-active" : ""}`}
                    >
                      <span className="select-test-sidePlatformIcon" aria-hidden="true">
                        <LineIcon name={tab.icon} size={18} />
                      </span>
                      <span className="select-test-sidePlatformCopy">
                        <span className="select-test-sidePlatformLabel">{tab.label}</span>
                        <span className="select-test-sidePlatformHint">
                          {tab.key === "ix"
                            ? "Writing, reading, listening"
                            : tab.key === "fce"
                              ? "Placement-style combined skills"
                              : "KET, PET, Flyers, Movers, Starters"}
                        </span>
                      </span>
                      <span className="select-test-sidePlatformCount">
                        {tab.key === "ix" ? ixTotalCount : tab.key === "fce" ? fceTotalCount : orangeTotalCount}
                      </span>
                    </button>
                  ))}
                </div>

                {activePlatform === "ix" ? (
                  <div className="select-test-sidebarPanel">
                    <div className="select-test-sidebarPanelHeader">
                      <span className="select-test-sidebarPanelTitle">IX skills</span>
                      <span className="select-test-sidebarPanelMeta">{ixTotalCount} tests</span>
                    </div>

                    <div className="select-test-pillRow select-test-pillRow--sidebar">
                      {IX_SKILLS.map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
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
                ) : activePlatform === "fce" ? (
                  <div className="select-test-sidebarPanel">
                    <div className="select-test-sidebarPanelHeader">
                      <span className="select-test-sidebarPanelTitle">{fceDisplayName} skills</span>
                      <span className="select-test-sidebarPanelMeta">{fceTotalCount} tests</span>
                    </div>

                    <div className="select-test-pillRow select-test-pillRow--sidebar">
                      {fceSkillTabs.map((skill) => (
                        <button
                          key={skill.key}
                          type="button"
                          onClick={() => updateSelectRoute({ platform: "fce", type: DEFAULT_FCE_TYPE, tab: skill.key })}
                          className={`select-test-pillButton select-test-pillButton--${skill.key} ${activeFceTab === skill.key ? "active" : ""}`}
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
                      <span className="select-test-shelfMetaItem">{fceDisplayName} placement</span>
                      <span className="select-test-shelfMetaItem">{fceConfig.totalQuestions || "?"} Q</span>
                      <span className="select-test-shelfMetaItem">{fceConfig.duration || "?"} min</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="select-test-sidebarPanel">
                      <div className="select-test-sidebarPanelHeader">
                        <span className="select-test-sidebarPanelTitle">Orange levels</span>
                        <span className="select-test-sidebarPanelMeta">{orangeTotalCount} tests</span>
                      </div>

                      <div className="select-test-pillRow select-test-pillRow--sidebar select-test-pillRow--levels">
                        {ORANGE_LEVELS.map((type) => (
                          <button
                            key={type.id}
                            type="button"
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

                    <div className="select-test-sidebarPanel">
                      <div className="select-test-sidebarPanelHeader">
                        <span className="select-test-sidebarPanelTitle">Orange skills</span>
                        <span className="select-test-sidebarPanelMeta">{activeOrangeLevel.shortLabel}</span>
                      </div>

                      <div className="select-test-pillRow select-test-pillRow--sidebar">
                        {orangeSkillTabs.map((skill) => (
                          <button
                            key={skill.key}
                            type="button"
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
            </aside>

            <div className="select-test-main">
              <section className={`select-test-toolbar select-test-toolbar--${activePlatform}`}>
                <div className="select-test-toolbarMain">
                  <div className="select-test-toolbarIdentity">
                    <span className="select-test-toolbarEyebrow">
                      {activePlatform === "orange" ? "Orange library" : activePlatform === "fce" ? `${fceDisplayName} library` : "IX library"}
                    </span>
                    <h2 className="select-test-toolbarTitle">{currentShelfTitle}</h2>
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

                  {currentContext.isFce && canManageCurrentSelection ? (
                    <button
                      type="button"
                      className="select-test-create select-test-create--toolbar"
                      onClick={() => navigate(fceCreatePath)}
                    >
                      <LineIcon name="create" size={16} />
                      <span>{fceCreateLabel}</span>
                    </button>
                  ) : null}
                </div>

                {isPlacementAdmin ? (
                  <div className="select-test-placementStrip">
                    <div className="select-test-placementStripMain">
                      <div className="select-test-placementStripRow">
                        <span className="select-test-placementBadge">Placement list</span>
                        <div className="select-test-shelfMeta">
                          <span className="select-test-shelfMetaItem">{placementSelections.length} shown</span>
                          <span className="select-test-shelfMetaItem">{placementRecentAttempts.length} tracked</span>
                          <span className="select-test-shelfMetaItem">
                            {placementLoading ? "Loading package" : placementSaving ? "Saving package" : "Synced package"}
                          </span>
                        </div>
                      </div>

                      {placementFeedback ? (
                        <p className="select-test-placementStatus">{placementFeedback}</p>
                      ) : null}
                    </div>

                    <div className="select-test-placementStripActions">
                      <button
                        type="button"
                        className="select-test-create select-test-create--toolbar"
                        onClick={() => navigate(placementSharePath)}
                        disabled={!placementSelections.length || !placementShareToken || placementLoading}
                      >
                        <LineIcon name="tests" size={16} />
                        <span>Preview Placement</span>
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

                    {currentContext.isFce && canManageCurrentSelection ? (
                      <div className="select-test-adminActions">
                        <button
                          type="button"
                          className="select-test-create"
                          onClick={() => navigate(fceCreatePath)}
                        >
                          <LineIcon name="create" size={16} />
                          <span>{fceCreateLabel}</span>
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
                          const { isComplete: isAttemptComplete } = resolveAttemptState({
                            scope: "cambridge",
                            testId: test.id,
                            testType: test.testType,
                          });
                          const placementSelection = buildOrangePlacementSelection(test, orangeCardTitle, displayTitle);
                          const placementEligible = isPlacementAdmin && isPlacementEligible({
                            platform: "orange",
                            skill: activeOrangeTab,
                            testType: test.testType,
                          });
                          const placementShown = placementEligible && placementSelectionKeys.has(placementSelection.key);

                          return (
                            <div
                              key={`cambridge-${test.category || "unknown"}-${test.id}`}
                              className={`select-test-card select-test-card--${activeOrangeTab} select-test-card--orange${isAttemptComplete ? " select-test-card--disabled" : ""}`}
                            >
                              <button
                                type="button"
                                className={`select-test-cardMain${isAttemptComplete ? " is-disabled" : ""}`}
                                disabled={isAttemptComplete}
                                onClick={() => {
                                  if (isAttemptComplete) return;
                                  handleSelectCambridge(test);
                                }}
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
                                    {isAttemptComplete ? (
                                      <span className="select-test-cardCompletionState">Complete</span>
                                    ) : null}
                                    {placementEligible ? (
                                      <span className={`select-test-cardPlacementState${placementShown ? " is-active" : ""}`}>
                                        {placementShown ? "Placement On" : "Placement Off"}
                                      </span>
                                    ) : null}
                                    <span className={`select-test-cardActionHint${isAttemptComplete ? " is-complete" : ""}`}>
                                      {isAttemptComplete ? "Locked" : "Open test"}
                                    </span>
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
                                      <span>{placementShown ? "Show Off" : "Show On"}</span>
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      ) : currentContext.isFce ? (
                        visibleList.map((test, index) => {
                          const classCode = test.classCode || "N/A";
                          const teacherName = test.teacherName || "N/A";
                          const displayTitle = FCE_SKILL_META[activeFceTab]?.label || fceDisplayName;
                          const fceCardTitle = test.title || `${fceDisplayName} ${displayTitle}`;
                          const { isComplete: isAttemptComplete } = resolveAttemptState({
                            scope: "cambridge",
                            testId: test.id,
                            testType: test.testType,
                          });
                          const placementSelection = buildFcePlacementSelection(test, fceCardTitle, displayTitle);
                          const placementEligible = isPlacementAdmin && isPlacementEligible({
                            platform: "fce",
                            skill: activeFceTab,
                            testType: test.testType,
                          });
                          const placementShown = placementEligible && placementSelectionKeys.has(placementSelection.key);

                          return (
                            <div
                              key={`fce-${test.category || "unknown"}-${test.id}`}
                              className={`select-test-card select-test-card--${activeFceTab} select-test-card--fce${isAttemptComplete ? " select-test-card--disabled" : ""}`}
                            >
                              <button
                                type="button"
                                className={`select-test-cardMain${isAttemptComplete ? " is-disabled" : ""}`}
                                disabled={isAttemptComplete}
                                onClick={() => {
                                  if (isAttemptComplete) return;
                                  handleSelectFce(test);
                                }}
                              >
                                <div className="select-test-cardHeader">
                                  <span className={`select-test-cardBadge select-test-cardBadge--${activeFceTab}`}>
                                    <LineIcon name={FCE_SKILL_META[activeFceTab]?.icon || "tests"} size={16} />
                                    <span>{displayTitle}</span>
                                  </span>
                                  <span className="select-test-cardNum">#{index + 1}</span>
                                </div>

                                <div className="select-test-cardTitle">
                                  <span className="select-test-cardText">{fceCardTitle}</span>
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
                                    {fceConfig.totalQuestions || "?"} Q • {fceConfig.duration || "?"} min
                                  </span>
                                  <div className="select-test-cardFooterMeta">
                                    {isAttemptComplete ? (
                                      <span className="select-test-cardCompletionState">Complete</span>
                                    ) : null}
                                    {placementEligible ? (
                                      <span className={`select-test-cardPlacementState${placementShown ? " is-active" : ""}`}>
                                        {placementShown ? "Placement On" : "Placement Off"}
                                      </span>
                                    ) : null}
                                    <span className={`select-test-cardActionHint${isAttemptComplete ? " is-complete" : ""}`}>
                                      {isAttemptComplete ? "Locked" : "Open test"}
                                    </span>
                                  </div>
                                </div>
                              </button>

                              {canManageCurrentSelection || placementEligible ? (
                                <div className="select-test-cardActions">
                                  {canManageCurrentSelection ? (
                                    <button
                                      type="button"
                                      className="select-test-edit select-test-edit--fce"
                                      onClick={() => handleEdit(test.id, "fce", test)}
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
                                      <span>{placementShown ? "Show Off" : "Show On"}</span>
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
                          const ixScope = activeIxTab === "writing"
                            ? "ix-writing"
                            : activeIxTab === "reading"
                              ? "ix-reading"
                              : "ix-listening";
                          const { isComplete: isAttemptComplete } = resolveAttemptState({
                            scope: ixScope,
                            testId: test.id,
                          });
                          const placementSelection = buildIxPlacementSelection(test, title);
                          const placementEligible = isPlacementAdmin && isPlacementEligible({
                            platform: "ix",
                            skill: activeIxTab,
                            testType: placementSelection.testType,
                          });
                          const placementShown = placementEligible && placementSelectionKeys.has(placementSelection.key);

                          return (
                            <div
                              key={`${activeIxTab}-${test.id}`}
                              className={`select-test-card select-test-card--${activeIxTab}${isAttemptComplete ? " select-test-card--disabled" : ""}`}
                            >
                              <button
                                type="button"
                                className={`select-test-cardMain${isAttemptComplete ? " is-disabled" : ""}`}
                                disabled={isAttemptComplete}
                                onClick={() => {
                                  if (isAttemptComplete) return;
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
                                    {isAttemptComplete ? (
                                      <span className="select-test-cardCompletionState">Complete</span>
                                    ) : null}
                                    {placementEligible ? (
                                      <span className={`select-test-cardPlacementState${placementShown ? " is-active" : ""}`}>
                                        {placementShown ? "Placement On" : "Placement Off"}
                                      </span>
                                    ) : null}
                                    <span className={`select-test-cardActionHint${isAttemptComplete ? " is-complete" : ""}`}>
                                      {isAttemptComplete ? "Locked" : "Open test"}
                                    </span>
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
                                      <span>{placementShown ? "Show Off" : "Show On"}</span>
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
          </section>
        </div>
      </div>
    </>
  );
};

export default SelectTest;

