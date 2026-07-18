import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import AdminNavbar from "../../../../shared/components/AdminNavbar";
import {
  QuestionTypeSelector,
  QuestionEditorFactory,
} from "../../../../shared/components/questions";
import {
  getQuestionTypesForTest,
  getDefaultQuestionData,
  getTestConfig,
  QUESTION_TYPES,
} from "../../../../shared/config/questionTypes";
import { getOrangeSelectTestPathForTestType } from "../../../cambridge/config/navigation";
import {
  apiPath,
  hostPath,
  authFetch,
  redirectToLogin,
  getStoredUser,
} from "../../../../shared/utils/api";
import useQuillImageUpload from "../../../../shared/hooks/useQuillImageUpload";
import { canManageCategory } from "../../../../shared/utils/permissions";
import AudioPreviewBlock from "../../../../shared/components/AudioPreviewBlock";
import LineIcon from "../../../../shared/components/LineIcon.jsx";
import "./FceTestBuilder.css";
import { computeQuestionStarts, getQuestionCountForSection } from "../../../cambridge/shared/utils/questionNumbering";
import { normalizeQuillPromptHtml } from "../../../cambridge/shared/utils/normalizeQuillPromptHtml";
import { normalizeAudioReference, normalizeListeningPartsAudio } from "../../../../shared/utils/audioUrls";
import resolveAuthUserDisplayName from "../../../../shared/utils/authUserDisplayName";

const InlineIcon = ({ name, size = 16, strokeWidth = 2, style }) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 0,
      ...style,
    }}
  >
    <LineIcon name={name} size={size} strokeWidth={strokeWidth} />
  </span>
);

const SECTION_BASED_TYPES = [
  "long-text-mc",
  "cloze-test",
  "short-message",
  "matching",
  "word-form",
  "preposition-gap-fill",
  "odd-one-out",
  "sentence-correction",
  "reading-open-questions",
  "story-writing",
];

/**
 * FceTestBuilder - Dedicated builder for FCE (B2 First) reading and listening tests.
 */
const FceTestBuilder = ({
  testType = "fce-reading",
  editId = null,
  initialData = null,
  resetDraftOnLoad = false,
  apiBasePath = null,
}) => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const currentTeacherName = resolveAuthUserDisplayName(user);
  const isCreateMode = !editId && !initialData;

  const testConfig = getTestConfig(testType);
  const isListeningTest = testType === "fce-listening";
  const availableTypes = useMemo(() => getQuestionTypesForTest(testType), [testType]);
  const defaultQuestionType = availableTypes[0]?.id || "fill";
  const builderDisplayName = testConfig?.name || "FCE Test";

  const { quillRef: partInstructionRef, modules: partInstructionModules } = useQuillImageUpload();

  const normalizeShortMessageParts = useCallback((partsData) => {
    if (!Array.isArray(partsData)) return partsData;

    let changed = false;
    const nextParts = partsData.map((part) => {
      const originalSections = Array.isArray(part?.sections) ? part.sections : [];
      const nextSections = originalSections.map((section) => {
        const sectionType = section?.questionType || section?.questions?.[0]?.questionType;
        if (sectionType !== "short-message") return section;

        const originalQuestions = Array.isArray(section?.questions) ? section.questions : [];
        let sectionChanged = false;
        const nextQuestions = originalQuestions.map((question) => {
          const rawSituation = typeof question?.situation === "string" ? question.situation : "";
          const normalizedSituation = normalizeQuillPromptHtml(rawSituation);

          if (rawSituation === normalizedSituation) {
            return question;
          }

          sectionChanged = true;
          changed = true;
          return {
            ...question,
            situation: normalizedSituation,
          };
        });

        if (!sectionChanged) return section;
        return {
          ...section,
          questions: nextQuestions,
        };
      });

      const partChanged = nextSections.some((section, index) => section !== originalSections[index]);
      if (!partChanged) return part;

      return {
        ...part,
        sections: nextSections,
      };
    });

    return changed ? nextParts : partsData;
  }, []);

  const category = isListeningTest ? "listening" : "reading";
  const allowedToManage = canManageCategory(user, category);

  const didResetDraftRef = useRef(false);

  useEffect(() => {
    if (!resetDraftOnLoad || didResetDraftRef.current) return;
    try {
      localStorage.removeItem(`fceTestDraft-${testType}`);
    } catch {
      // ignore
    }
    didResetDraftRef.current = true;
  }, [resetDraftOnLoad, testType]);

  const loadSavedData = () => {
    try {
      const savedData = localStorage.getItem(`fceTestDraft-${testType}`);
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
    }
    return null;
  };

  const shouldUseDraft = !resetDraftOnLoad && !editId && !initialData;
  const savedData = shouldUseDraft ? loadSavedData() : null;

  const [title, setTitle] = useState(savedData?.title || "");
  const [classCode, setClassCode] = useState(savedData?.classCode || "");
  const [teacherName, setTeacherName] = useState(
    isCreateMode ? currentTeacherName : savedData?.teacherName || ""
  );
  const [mainAudioUrl, setMainAudioUrl] = useState(normalizeAudioReference(savedData?.mainAudioUrl || ""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);

  const getInitialParts = () => {
    if (savedData?.parts && Array.isArray(savedData.parts)) {
      return normalizeListeningPartsAudio(normalizeShortMessageParts(savedData.parts));
    }
    return [
      {
        partNumber: 1,
        title: "Part 1",
        instruction: "",
        audioUrl: "",
        imageUrl: "",
        sections: [
          {
            sectionTitle: "",
            questionType: defaultQuestionType,
            questions: [getDefaultQuestionData(defaultQuestionType)],
          },
        ],
      },
    ];
  };

  useEffect(() => {
    if (isCreateMode) {
      setTeacherName(currentTeacherName);
    }
  }, [currentTeacherName, isCreateMode]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setClassCode(initialData.classCode || "");
      setTeacherName(initialData.teacherName || "");
      setMainAudioUrl(normalizeAudioReference(initialData.mainAudioUrl || ""));

      let partsData = initialData.parts;
      if (typeof partsData === "string") {
        try {
          partsData = JSON.parse(partsData);
        } catch (err) {
          console.warn("Could not parse parts JSON - falling back to default:", err);
          partsData = null;
        }
      }

      if (Array.isArray(partsData)) {
        setParts(normalizeListeningPartsAudio(normalizeShortMessageParts(partsData)));
      }
    }
  }, [defaultQuestionType, initialData, normalizeShortMessageParts]);

  const [parts, setParts] = useState(getInitialParts());
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);

  const [collapsedQuestions, setCollapsedQuestions] = useState({});
  const [copiedQuestion, setCopiedQuestion] = useState(null);

  const [uploadingAudioPartIndex, setUploadingAudioPartIndex] = useState(null);
  const [audioUploadError, setAudioUploadError] = useState("");
  const [uploadingMainAudio, setUploadingMainAudio] = useState(false);
  const [mainAudioUploadError, setMainAudioUploadError] = useState("");

  const [uploadingImagePartIndex, setUploadingImagePartIndex] = useState(null);
  const [imageUploadError, setImageUploadError] = useState("");
  const partInstructionDraftRef = useRef("");

  const currentPart = parts[selectedPartIndex];
  const currentSection = currentPart?.sections?.[selectedSectionIndex];

  const questionTypeOptions = useMemo(() => {
    const currentTypeId = currentSection?.questionType;
    if (!currentTypeId || availableTypes.some((type) => type.id === currentTypeId)) {
      return availableTypes;
    }
    const legacyType = QUESTION_TYPES[currentTypeId];
    return legacyType ? [...availableTypes, legacyType] : availableTypes;
  }, [availableTypes, currentSection?.questionType]);

  const normalizePartInstructionHtml = useCallback((value) => {
    const html = String(value || "").trim();
    if (!html) return "";
    if (/^<p><br\s*\/?><\/p>$/i.test(html)) return "";
    return html;
  }, []);

  useEffect(() => {
    partInstructionDraftRef.current = normalizePartInstructionHtml(parts[selectedPartIndex]?.instruction || "");
  }, [normalizePartInstructionHtml, parts, selectedPartIndex]);

  const getLivePartInstructionValue = useCallback(() => {
    const editor = partInstructionRef.current?.getEditor?.();
    const liveHtml = normalizePartInstructionHtml(editor?.root?.innerHTML || "");

    if (editor?.root) {
      partInstructionDraftRef.current = liveHtml;
      return liveHtml;
    }

    return partInstructionDraftRef.current || normalizePartInstructionHtml(currentPart?.instruction || "");
  }, [currentPart?.instruction, normalizePartInstructionHtml, partInstructionRef]);

  const syncCurrentPartInstructionInParts = useCallback((partsData) => {
    if (!Array.isArray(partsData) || selectedPartIndex < 0 || selectedPartIndex >= partsData.length) {
      return partsData;
    }

    const nextInstruction = getLivePartInstructionValue();
    const currentInstruction = normalizePartInstructionHtml(partsData[selectedPartIndex]?.instruction || "");

    if (currentInstruction === nextInstruction) {
      return partsData;
    }

    return partsData.map((part, idx) => {
      if (idx !== selectedPartIndex) return part;
      return { ...part, instruction: nextInstruction };
    });
  }, [getLivePartInstructionValue, normalizePartInstructionHtml, selectedPartIndex]);

  const updateParts = useCallback((updater, options = {}) => {
    const { syncCurrentPartInstruction = true } = options;

    setParts((prevParts) => {
      const baseParts = syncCurrentPartInstruction
        ? syncCurrentPartInstructionInParts(prevParts)
        : prevParts;
      return updater(baseParts);
    });
  }, [syncCurrentPartInstructionInParts]);

  const commitCurrentPartInstruction = useCallback(() => {
    setParts((prevParts) => syncCurrentPartInstructionInParts(prevParts));
  }, [syncCurrentPartInstructionInParts]);

  const getPartsSnapshotWithCurrentInstruction = useCallback(() => {
    return syncCurrentPartInstructionInParts(parts);
  }, [parts, syncCurrentPartInstructionInParts]);

  const handleSelectPart = useCallback((partIndex) => {
    commitCurrentPartInstruction();
    setSelectedPartIndex(partIndex);
    setSelectedSectionIndex(0);
  }, [commitCurrentPartInstruction]);

  const handleSelectSection = useCallback((sectionIndex) => {
    commitCurrentPartInstruction();
    setSelectedSectionIndex(sectionIndex);
  }, [commitCurrentPartInstruction]);

  const uploadAudioForPart = async (partIndex, file) => {
    if (!file) return;

    setAudioUploadError("");
    setUploadingAudioPartIndex(partIndex);

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const res = await fetch(apiPath("upload/audio"), {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errMsg = "Lỗi khi upload audio";
        try {
          const err = await res.json();
          errMsg = err?.message || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const url = data?.url;
      if (!url) throw new Error("Upload thành công nhưng không nhận được URL audio");
      const normalizedUrl = normalizeAudioReference(url);

      updateParts((prev) => {
        const next = [...prev];
        next[partIndex] = { ...next[partIndex], audioUrl: normalizedUrl };

        if (isListeningTest && partIndex === 0) {
          for (let i = 0; i < next.length; i++) {
            if (!next[i]?.audioUrl) {
              next[i] = { ...next[i], audioUrl: normalizedUrl };
            }
          }
        }
        return next;
      });
    } catch (err) {
      setAudioUploadError(err?.message || "Lỗi khi upload audio");
    } finally {
      setUploadingAudioPartIndex(null);
    }
  };

  const uploadImageForPart = async (partIndex, file) => {
    if (!file) return;

    setImageUploadError("");
    setUploadingImagePartIndex(partIndex);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(apiPath("upload/cambridge-image"), {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errMsg = "Lỗi khi upload hình ảnh";
        try {
          const err = await res.json();
          errMsg = err?.message || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const url = data?.url;
      if (!url) throw new Error("Upload thành công nhưng không nhận được URL hình ảnh");

      updateParts((prev) => {
        const next = [...prev];
        next[partIndex] = { ...next[partIndex], imageUrl: url };
        return next;
      });
    } catch (err) {
      setImageUploadError(err?.message || "Lỗi khi upload hình ảnh");
    } finally {
      setUploadingImagePartIndex(null);
    }
  };

  const uploadMainAudio = async (file) => {
    if (!file) return;

    setMainAudioUploadError("");
    setUploadingMainAudio(true);

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const res = await fetch(apiPath("upload/audio"), {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errMsg = "Lỗi khi upload audio";
        try {
          const err = await res.json();
          errMsg = err?.message || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const url = data?.url;
      if (!url) throw new Error("Upload thành công nhưng không nhận được URL audio");

      setMainAudioUrl(normalizeAudioReference(url));
    } catch (err) {
      setMainAudioUploadError(err?.message || "Lỗi khi upload audio");
    } finally {
      setUploadingMainAudio(false);
    }
  };

  const handleQuestionTypeChange = (newType) => {
    updateParts((prevParts) =>
      prevParts.map((part, pIdx) => {
        if (pIdx !== selectedPartIndex) return part;
        const nextSections = (part.sections || []).map((section, sIdx) => {
          if (sIdx !== selectedSectionIndex) return section;
          return {
            ...section,
            questionType: newType,
            questions: [getDefaultQuestionData(newType)],
          };
        });
        return { ...part, sections: nextSections };
      })
    );
  };

  const handleAddPart = () => {
    let nextPartIndex = 0;
    updateParts((prevParts) => {
      nextPartIndex = prevParts.length;
      const inheritedAudioUrl = isListeningTest
        ? (mainAudioUrl ? "" : normalizeAudioReference(prevParts?.[0]?.audioUrl || ""))
        : "";

      return [
        ...prevParts,
        {
          partNumber: prevParts.length + 1,
          title: `Part ${prevParts.length + 1}`,
          instruction: "",
          audioUrl: inheritedAudioUrl,
          imageUrl: "",
          sections: [
            {
              sectionTitle: "",
              questionType: defaultQuestionType,
              questions: [getDefaultQuestionData(defaultQuestionType)],
            },
          ],
        },
      ];
    });
    partInstructionDraftRef.current = "";
    setSelectedPartIndex(nextPartIndex);
    setSelectedSectionIndex(0);
  };

  const handleAddSection = () => {
    const nextSection = {
      sectionTitle: "",
      questionType: defaultQuestionType,
      questions: [getDefaultQuestionData(defaultQuestionType)],
    };

    updateParts((prevParts) =>
      prevParts.map((part, pIdx) => {
        if (pIdx !== selectedPartIndex) return part;
        const nextSections = [...(part.sections || []), nextSection];
        return { ...part, sections: nextSections };
      })
    );

    setSelectedSectionIndex((currentPart?.sections?.length || 0));
  };

  const handleAddQuestion = () => {
    const currentType = currentSection?.questionType;
    updateParts((prevParts) =>
      prevParts.map((part, pIdx) => {
        if (pIdx !== selectedPartIndex) return part;
        const nextSections = (part.sections || []).map((section, sIdx) => {
          if (sIdx !== selectedSectionIndex) return section;
          const prevQuestions = Array.isArray(section.questions) ? section.questions : [];
          return {
            ...section,
            questions: [...prevQuestions, getDefaultQuestionData(currentType)],
          };
        });
        return { ...part, sections: nextSections };
      })
    );
  };

  const handleDeleteQuestion = (qIndex) => {
    updateParts((prevParts) =>
      prevParts.map((part, pIdx) => {
        if (pIdx !== selectedPartIndex) return part;
        const nextSections = (part.sections || []).map((section, sIdx) => {
          if (sIdx !== selectedSectionIndex) return section;
          const prevQuestions = Array.isArray(section.questions) ? section.questions : [];
          return {
            ...section,
            questions: prevQuestions.filter((_, idx) => idx !== qIndex),
          };
        });
        return { ...part, sections: nextSections };
      })
    );
  };

  const toggleCollapseQuestion = (qIdx) => {
    const key = `${selectedPartIndex}-${selectedSectionIndex}-${qIdx}`;
    setCollapsedQuestions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCopyQuestion = (qIdx) => {
    const questionToCopy = {
      ...parts[selectedPartIndex].sections[selectedSectionIndex].questions[qIdx],
    };
    setCopiedQuestion(questionToCopy);
  };

  const handlePasteQuestion = () => {
    if (!copiedQuestion) return;
    updateParts((prevParts) =>
      prevParts.map((part, pIdx) => {
        if (pIdx !== selectedPartIndex) return part;
        const nextSections = (part.sections || []).map((section, sIdx) => {
          if (sIdx !== selectedSectionIndex) return section;
          return {
            ...section,
            questions: [
              ...(section.questions || []),
              { ...JSON.parse(JSON.stringify(copiedQuestion)) },
            ],
          };
        });
        return { ...part, sections: nextSections };
      })
    );
  };

  const questionStarts = useMemo(() => computeQuestionStarts(parts), [parts]);

  const sanitizeDraftData = useCallback((value) => {
    const dataUrlRegex = /data:image\/[a-zA-Z]+;base64,[^"'\s)]+/g;
    const walk = (input) => {
      if (typeof input === "string") {
        const withoutDataUrls = input.replace(dataUrlRegex, "[image]");
        return withoutDataUrls.length > 200000 ? withoutDataUrls.slice(0, 200000) : withoutDataUrls;
      }
      if (Array.isArray(input)) {
        return input.map(walk);
      }
      if (input && typeof input === "object") {
        return Object.entries(input).reduce((acc, [key, val]) => {
          if (typeof val === "string" && /data:image\//i.test(val)) {
            acc[key] = "[image]";
            return acc;
          }
          acc[key] = walk(val);
          return acc;
        }, {});
      }
      return input;
    };
    return walk(value);
  }, []);

  const saveToLocalStorage = useCallback(() => {
    const storageKey = `fceTestDraft-${testType}`;
    try {
      setIsSaving(true);
      const normalizedParts = normalizeListeningPartsAudio(
        normalizeShortMessageParts(getPartsSnapshotWithCurrentInstruction())
      );
      const dataToSave = {
        title,
        classCode,
        teacherName,
        mainAudioUrl: normalizeAudioReference(mainAudioUrl),
        parts: normalizedParts,
        testType,
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        setLastSaved(new Date());
      } catch (error) {
        const isQuota =
          error?.name === "QuotaExceededError" || /quota/i.test(error?.message || "");
        if (isQuota) {
          try {
            const trimmed = sanitizeDraftData(dataToSave);
            localStorage.setItem(storageKey, JSON.stringify(trimmed));
            setLastSaved(new Date());
            console.warn("Draft trimmed to fit localStorage quota.");
          } catch (secondaryError) {
            localStorage.removeItem(storageKey);
            console.warn("Draft disabled due to storage quota limits.");
          }
        } else {
          console.error("Error saving draft:", error);
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    title,
    classCode,
    teacherName,
    mainAudioUrl,
    testType,
    sanitizeDraftData,
    getPartsSnapshotWithCurrentInstruction,
    normalizeShortMessageParts,
  ]);

  const handleManualDraftSave = useCallback(() => {
    saveToLocalStorage();
    setMessage({ type: "success", text: "Đã lưu nháp trên trình duyệt." });
  }, [saveToLocalStorage]);

  useEffect(() => {
    const autosaveInterval = setInterval(saveToLocalStorage, 30000);

    const handleBeforeUnload = () => {
      saveToLocalStorage();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(autosaveInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveToLocalStorage]);

  const handleSave = async () => {
    if (!title.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập tiêu đề đề thi!" });
      return;
    }
    if (!classCode.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập mã lớp!" });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    const cleanupClozeHtml = (html) => {
      if (!html) return "";
      let cleaned = String(html);
      cleaned = cleaned.replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");
      cleaned = cleaned.replace(/<p><\/p>/gi, "");
      cleaned = cleaned.replace(/<p>\s*<\/p>/gi, "");
      cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/gi, "<br>");
      return cleaned.trim();
    };

    const partsSnapshot = getPartsSnapshotWithCurrentInstruction();

    const cleanedParts = normalizeShortMessageParts(
      partsSnapshot.map((part) => ({
        ...part,
        sections: (part.sections || []).map((section) => ({
          ...section,
          questions: (section.questions || []).map((q) => {
            if (section.questionType === "cloze-test" || q.questionType === "cloze-test") {
              return { ...q, passageText: cleanupClozeHtml(q.passageText) };
            }
            return q;
          }),
        })),
      }))
    );
    const normalizedCleanedParts = normalizeListeningPartsAudio(cleanedParts);

    try {
      const payload = {
        title,
        classCode,
        teacherName,
        testType,
        duration: testConfig.duration || 60,
        mainAudioUrl: normalizeAudioReference(mainAudioUrl),
        parts: normalizedCleanedParts,
        totalQuestions: normalizedCleanedParts.reduce(
          (sum, part) =>
            sum + part.sections.reduce((sSum, sec) => sSum + getQuestionCountForSection(sec), 0),
          0
        ),
      };

      const endpoint = apiBasePath || (isListeningTest ? "cambridge/listening-tests" : "cambridge/reading-tests");

      if (editId) {
        const res = await authFetch(apiPath(`${endpoint}/${editId}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          if (res.status === 401) {
            try {
              saveToLocalStorage();
            } catch (e) {
              // ignore
            }
            setMessage({
              type: "error",
              text: "Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục. Bản nháp đã được lưu.",
            });
            setRequiresLogin(true);
            return;
          }
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message || "Lỗi khi cập nhật đề");
        }
        setMessage({ type: "success", text: "Cập nhật đề thành công!" });
        localStorage.removeItem(`fceTestDraft-${testType}`);
      } else {
        const response = await authFetch(apiPath(endpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          if (response.status === 401) {
            try {
              saveToLocalStorage();
            } catch (e) {
              // ignore
            }
            setMessage({
              type: "error",
              text: "Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục. Bản nháp đã được lưu.",
            });
            setRequiresLogin(true);
            return;
          }
          throw new Error("Lỗi khi lưu đề thi");
        }

        await response.json();
        setMessage({ type: "success", text: "Tạo đề thành công!" });
        localStorage.removeItem(`fceTestDraft-${testType}`);
      }

      setTimeout(() => {
        navigate(getOrangeSelectTestPathForTestType(testType));
      }, 1500);
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ type: "error", text: "Lỗi: " + error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!allowedToManage) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2 style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <InlineIcon name="average" size={20} style={{ color: "#d97706" }} />
          Bạn không có quyền tạo/sửa đề {category === "listening" ? "Listening" : "Reading"}
        </h2>
        <p>Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ quản trị hệ thống.</p>
        <button onClick={() => navigate("/select-test")} style={{ marginTop: 16, padding: "8px 14px" }}>
          Quay lại
        </button>
      </div>
    );
  }

  if (!testConfig) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2 style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <InlineIcon name="error" size={20} style={{ color: "#dc2626" }} />
          Test type không hợp lệ: {testType}
        </h2>
        <p>Các FCE test types hỗ trợ:</p>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={{ padding: "4px" }}>
            <code>fce-reading</code> - FCE Reading &amp; Writing
          </li>
          <li style={{ padding: "4px" }}>
            <code>fce-listening</code> - FCE Listening
          </li>
        </ul>
      </div>
    );
  }

  const saveButtonLabel = editId ? "Cập nhật đề" : "Lưu đề";

  const renderSidebarSavePanel = () => (
    <div
      className="ctb-sidebar-footer"
      style={{
        marginTop: "auto",
        paddingTop: "16px",
        paddingBottom: "12px",
        borderTop: "1px solid rgba(148, 163, 184, 0.25)",
        position: "sticky",
        bottom: 0,
        background: "#1e293b",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: isSubmitting
            ? "#cbd5e1"
            : isSaving
            ? "#fbbf24"
            : lastSaved
            ? "#86efac"
            : "#94a3b8",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "10px",
          fontWeight: 600,
        }}
      >
        {isSubmitting ? (
          <InlineIcon name="loading" size={12} />
        ) : isSaving ? (
          <InlineIcon name="save" size={12} />
        ) : lastSaved ? (
          <InlineIcon name="correct" size={12} />
        ) : (
          <InlineIcon name="clock" size={12} />
        )}
        {isSubmitting
          ? "Đang lưu đề..."
          : isSaving
          ? "Đang lưu nháp tự động..."
          : lastSaved
          ? `Tự lưu ${lastSaved.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
          : "Chưa có bản lưu gần đây"}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSubmitting}
        style={{
          width: "100%",
          padding: "11px",
          borderRadius: "8px",
          border: "none",
          background: isSubmitting ? "#94a3b8" : "#3b82f6",
          color: "white",
          fontWeight: 700,
          fontSize: "14px",
          cursor: isSubmitting ? "not-allowed" : "pointer",
          marginBottom: "8px",
          boxShadow: "0 8px 20px rgba(59, 130, 246, 0.22)",
        }}
      >
        {isSubmitting ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <InlineIcon name="loading" size={14} style={{ color: "white" }} />
            Đang lưu...
          </span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <InlineIcon name="save" size={14} style={{ color: "white" }} />
            {saveButtonLabel}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={handleManualDraftSave}
        disabled={isSubmitting}
        className="ctb-btn-draft"
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          fontWeight: 600,
          fontSize: "13px",
          cursor: isSubmitting ? "not-allowed" : "pointer",
          background: "#334155",
          color: "white",
          border: "1px solid rgba(148, 163, 184, 0.3)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <InlineIcon name="save" size={14} />
          Lưu nháp
        </span>
      </button>

      {message.text && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 12px",
            borderRadius: "8px",
            background: message.type === "success" ? "rgba(34, 197, 94, 0.14)" : "rgba(239, 68, 68, 0.14)",
            color: message.type === "success" ? "#22c55e" : "#fca5a5",
            fontSize: "12px",
            fontWeight: 600,
            lineHeight: 1.4,
            border: `1px solid ${
              message.type === "success" ? "rgba(34, 197, 94, 0.25)" : "rgba(248, 113, 113, 0.25)"
            }`,
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );

  return (
    <div className="ctb-page" style={{ minHeight: "100vh" }}>
      {requiresLogin && (
        <div
          style={{
            padding: 12,
            background: "#fff0f0",
            border: "1px solid #ffcccc",
            borderRadius: 6,
            margin: "12px auto",
            maxWidth: 1000,
          }}
        >
          <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <InlineIcon name="average" size={16} style={{ color: "#d97706" }} />
            Bạn cần đăng nhập lại để hoàn tất thao tác.
          </strong>
          <div style={{ marginTop: 8 }}>
            Bản nháp đã được lưu.{" "}
            <button
              style={{ marginLeft: 8, padding: "6px 10px" }}
              onClick={() => {
                redirectToLogin({ rememberPath: true, replace: true });
              }}
            >
              Đăng nhập lại
            </button>
          </div>
        </div>
      )}
      <AdminNavbar />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          minHeight: "calc(100vh - 60px)",
        }}
      >
        <div
          style={{
            backgroundColor: "#1e293b",
            color: "white",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            position: "sticky",
            top: 0,
            height: "100vh",
            overflowY: "auto",
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: "16px",
              backgroundColor: "#334155",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "16px", display: "flex", alignItems: "center", gap: 8 }}>
              <InlineIcon name="graduation" size={18} style={{ color: "#fff" }} />
              {builderDisplayName}
            </h3>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              <p style={{ margin: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
                <InlineIcon name="questions" size={14} />
                {testConfig.totalQuestions} câu hỏi
              </p>
              <p style={{ margin: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
                <InlineIcon name="reading" size={14} />
                {testConfig.parts} parts
              </p>
              <p style={{ margin: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
                <InlineIcon name="clock" size={14} />
                {testConfig.duration} phút
              </p>
            </div>
          </div>

          <h4
            style={{
              margin: "0 0 12px",
              fontSize: "14px",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <InlineIcon name="document" size={14} />
            Parts
          </h4>
          {parts.map((part, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectPart(idx)}
              style={{
                padding: "12px",
                marginBottom: "8px",
                backgroundColor: selectedPartIndex === idx ? "#3b82f6" : "#475569",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <strong>{part.title}</strong>
              <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
                {part.sections.length} section(s)
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddPart}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#22c55e",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              marginTop: "12px",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <InlineIcon name="create" size={14} style={{ color: "white" }} />
              Thêm Part
            </span>
          </button>

          {currentPart && currentPart.sections.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <h4
                style={{
                  margin: "0 0 12px",
                  fontSize: "14px",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <InlineIcon name="document" size={14} />
                Sections trong Part {selectedPartIndex + 1}
              </h4>
              {currentPart.sections.map((sec, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSection(idx)}
                  style={{
                    padding: "10px",
                    marginBottom: "6px",
                    backgroundColor: selectedSectionIndex === idx ? "#6366f1" : "#475569",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Section {idx + 1}: {sec.questionType}
                  <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px" }}>
                    {sec.questions.length} câu hỏi
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddSection}
                style={{
                  width: "100%",
                  padding: "8px",
                  backgroundColor: "#8b5cf6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                  marginTop: "8px",
                  fontSize: "13px",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <InlineIcon name="create" size={14} style={{ color: "white" }} />
                  Thêm Section
                </span>
              </button>
            </div>
          )}

          {renderSidebarSavePanel()}
        </div>

        <div className="ctb-main" style={{ flex: 1, padding: "24px", overflowY: "auto", height: "100vh" }}>
          <div
            className="ctb-card"
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              padding: "12px 16px",
              borderRadius: "8px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h1 className="ctb-title" style={{ margin: 0, fontSize: "18px", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <InlineIcon name="graduation" size={18} style={{ color: "#0f172a" }} />
                {builderDisplayName}
              </h1>
              <div
                style={{
                  fontSize: "11px",
                  color: isSaving ? "#f59e0b" : lastSaved ? "#22c55e" : "#9ca3af",
                  fontStyle: "italic",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {isSaving ? <InlineIcon name="save" size={12} /> : lastSaved ? <InlineIcon name="correct" size={12} /> : null}
                {lastSaved
                  ? lastSaved.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                  : isSaving
                  ? "Đang lưu"
                  : "Chưa lưu"}
              </div>
            </div>
          </div>

          <div
            className="ctb-card"
            style={{
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "12px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontWeight: 600,
                    color: "#6b7280",
                    fontSize: "12px",
                  }}
                >
                  Tiêu đề đề thi *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: FCE Reading Test 1"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontWeight: 600,
                    color: "#6b7280",
                    fontSize: "12px",
                  }}
                >
                  Mã lớp *
                </label>
                <input
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="VD: FCE-102-A"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontWeight: 600,
                    color: "#6b7280",
                    fontSize: "12px",
                  }}
                >
                  Tên giáo viên
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  disabled
                  placeholder="VD: Cô Lan"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "13px",
                    background: "#f8fafc",
                    color: "#334155",
                    cursor: "not-allowed",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>

          {isListeningTest && (
            <div
              className="ctb-card"
              style={{
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "12px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              <label
                style={{
                  marginBottom: "8px",
                  fontWeight: 600,
                  color: "#374151",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <InlineIcon name="listening" size={14} />
                Audio chung (toàn bài)
              </label>

              <AudioPreviewBlock
                audioUrl={mainAudioUrl}
                emptyText="Chưa có audio chung cho bài listening."
                onClear={() => setMainAudioUrl("")}
                buttonStyle={{
                  border: "1px solid #ef4444",
                  background: "white",
                  color: "#ef4444",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              />

              <div style={{ marginTop: "12px" }}>
                <input
                  type="file"
                  accept="audio/*"
                  disabled={uploadingMainAudio}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    await uploadMainAudio(file);
                  }}
                />
                {uploadingMainAudio && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#0e276f" }}>
                    Đang upload audio...
                  </div>
                )}
                {mainAudioUploadError && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#ef4444" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <InlineIcon name="error" size={14} />
                      {mainAudioUploadError}
                    </span>
                  </div>
                )}
                <div style={{ marginTop: "6px", fontSize: "11px", color: "#6b7280" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <InlineIcon name="idea" size={12} />
                    Audio chung sẽ phát xuyên suốt khi học sinh chuyển part.
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedPartIndex !== -1 && currentPart && (
            <div
              className="ctb-card"
              style={{
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "20px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Tiêu đề Part:
                </label>
                <input
                  type="text"
                  value={currentPart.title || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateParts((prevParts) =>
                      prevParts.map((part, pIdx) => {
                        if (pIdx !== selectedPartIndex) return part;
                        return { ...part, title: value };
                      })
                    );
                  }}
                  placeholder={`VD: Part ${selectedPartIndex + 1}`}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Hướng dẫn cho Part:
                </label>
                <div className="part-instruction-editor">
                  <ReactQuill
                    key={`part-instruction-${selectedPartIndex}`}
                    ref={partInstructionRef}
                    theme="snow"
                    value={currentPart.instruction || ""}
                    onChange={(value) => {
                      const normalizedValue = normalizePartInstructionHtml(value);
                      partInstructionDraftRef.current = normalizedValue;
                      updateParts(
                        (prevParts) =>
                          prevParts.map((part, pIdx) => {
                            if (pIdx !== selectedPartIndex) return part;
                            return { ...part, instruction: normalizedValue };
                          }),
                        { syncCurrentPartInstruction: false }
                      );
                    }}
                    modules={partInstructionModules}
                    formats={[
                      "header",
                      "bold",
                      "italic",
                      "underline",
                      "color",
                      "background",
                      "list",
                      "bullet",
                      "align",
                      "link",
                      "image",
                    ]}
                    style={{
                      minHeight: "100px",
                      backgroundColor: "white",
                    }}
                  />
                </div>
                <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <InlineIcon name="idea" size={12} />
                    Có thể thêm hình ảnh, định dạng text, màu sắc...
                  </span>
                </p>
              </div>

              {isListeningTest ? (
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Audio (file nghe cho Part này):
                  </label>

                  <div
                    style={{
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "white",
                    }}
                  >
                    <AudioPreviewBlock
                      audioUrl={currentPart.audioUrl}
                      emptyText="Chưa có audio cho part này."
                      onClear={() => {
                        updateParts((prevParts) =>
                          prevParts.map((part, pIdx) => {
                            if (pIdx !== selectedPartIndex) return part;
                            return { ...part, audioUrl: "" };
                          })
                        );
                      }}
                      buttonStyle={{
                        border: "1px solid #ef4444",
                        background: "white",
                        color: "#ef4444",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    />

                    <div style={{ marginTop: "12px" }}>
                      <input
                        type="file"
                        accept="audio/*"
                        disabled={uploadingAudioPartIndex === selectedPartIndex}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          await uploadAudioForPart(selectedPartIndex, file);
                        }}
                      />
                      {uploadingAudioPartIndex === selectedPartIndex && (
                        <div style={{ marginTop: "8px", fontSize: "12px", color: "#0e276f" }}>
                          Đang upload audio...
                        </div>
                      )}
                      {audioUploadError && (
                        <div style={{ marginTop: "8px", fontSize: "12px", color: "#ef4444" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <InlineIcon name="error" size={14} />
                            {audioUploadError}
                          </span>
                        </div>
                      )}
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "#6b7280" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <InlineIcon name="idea" size={12} />
                          Hỗ trợ file audio (mp3/wav/m4a/ogg...). Backend giới hạn 50MB.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Hình ảnh minh hoạ cho Part này:
                  </label>

                  <div
                    style={{
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "white",
                    }}
                  >
                    {currentPart.imageUrl ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <img
                          src={
                            /^https?:\/\//i.test(currentPart.imageUrl)
                              ? currentPart.imageUrl
                              : hostPath(currentPart.imageUrl)
                          }
                          alt="Part illustration"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "300px",
                            objectFit: "contain",
                            borderRadius: "6px",
                            border: "1px solid #e5e7eb",
                          }}
                        />
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                          <a
                            href={
                              /^https?:\/\//i.test(currentPart.imageUrl)
                                ? currentPart.imageUrl
                                : hostPath(currentPart.imageUrl)
                            }
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#2563eb", textDecoration: "none", fontSize: "13px" }}
                          >
                            Mở hình ảnh
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              updateParts((prevParts) =>
                                prevParts.map((part, pIdx) => {
                                  if (pIdx !== selectedPartIndex) return part;
                                  return { ...part, imageUrl: "" };
                                })
                              );
                            }}
                            style={{
                              border: "1px solid #ef4444",
                              background: "white",
                              color: "#ef4444",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "13px",
                            }}
                          >
                            Xoá hình
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: "13px", color: "#6b7280" }}>Chưa có hình ảnh cho part này.</div>
                    )}

                    <div style={{ marginTop: "12px" }}>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#374151",
                          marginBottom: "5px",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <InlineIcon name="link" size={14} />
                        Nhập URL ảnh/GIF từ internet
                      </div>
                      <input
                        type="text"
                        value={
                          currentPart.imageUrl && /^https?:\/\//i.test(currentPart.imageUrl)
                            ? currentPart.imageUrl
                            : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value.trim();
                          updateParts((prevParts) =>
                            prevParts.map((part, pIdx) => {
                              if (pIdx !== selectedPartIndex) return part;
                              return { ...part, imageUrl: value };
                            })
                          );
                        }}
                        placeholder="https://example.com/image.gif"
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "13px",
                          boxSizing: "border-box",
                          color:
                            currentPart.imageUrl && /^https?:\/\//i.test(currentPart.imageUrl)
                              ? "#1d4ed8"
                              : "#374151",
                        }}
                      />
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#6b7280" }}>
                        Dán link GIF từ Giphy, Tenor, hoặc bất kỳ URL ảnh nào (jpg/png/gif/webp...)
                      </div>
                    </div>

                    <div style={{ marginTop: "10px" }}>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#374151",
                          marginBottom: "5px",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <InlineIcon name="upload" size={14} />
                        Hoặc upload từ máy
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImagePartIndex === selectedPartIndex}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          await uploadImageForPart(selectedPartIndex, file);
                        }}
                      />
                      {uploadingImagePartIndex === selectedPartIndex && (
                        <div style={{ marginTop: "8px", fontSize: "12px", color: "#0e276f" }}>
                          Đang upload hình ảnh...
                        </div>
                      )}
                      {imageUploadError && (
                        <div style={{ marginTop: "8px", fontSize: "12px", color: "#ef4444" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <InlineIcon name="error" size={14} />
                            {imageUploadError}
                          </span>
                        </div>
                      )}
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "#6b7280" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <InlineIcon name="idea" size={12} />
                          Hỗ trợ file ảnh (jpg/png/gif/webp...). Nên dùng ảnh rõ nét, tỉ lệ phù hợp với bài thi.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentSection && currentSection.questionType === "abc" && (
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "16px",
                    background: "#fffbeb",
                    border: "1px solid #fcd34d",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#92400e",
                      marginBottom: "12px",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <InlineIcon name="starters" size={14} />
                    Câu mẫu (Example)
                  </div>

                  <div style={{ marginBottom: "10px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "13px",
                        color: "#374151",
                        fontWeight: 500,
                      }}
                    >
                      Nội dung câu mẫu (ví dụ: đoạn hội thoại mẫu):
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ví dụ: Nick: What did you do at the weekend? / Paul: ..."
                      value={currentSection.exampleText || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateParts((prevParts) =>
                          prevParts.map((part, pIdx) => {
                            if (pIdx !== selectedPartIndex) return part;
                            return {
                              ...part,
                              sections: part.sections.map((sec, sIdx) => {
                                if (sIdx !== selectedSectionIndex) return sec;
                                return { ...sec, exampleText: val };
                              }),
                            };
                          })
                        );
                      }}
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "13px",
                        resize: "vertical",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        fontSize: "13px",
                        color: "#374151",
                        fontWeight: 500,
                      }}
                    >
                      Đáp án đúng của câu mẫu:
                    </label>
                    <div style={{ display: "flex", gap: "16px" }}>
                      {["A", "B", "C"].map((letter) => (
                        <label
                          key={letter}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: 500,
                          }}
                        >
                          <input
                            type="radio"
                            name={`example-answer-${selectedPartIndex}-${selectedSectionIndex}`}
                            value={letter}
                            checked={(currentSection.exampleAnswer || "") === letter}
                            onChange={() => {
                              updateParts((prevParts) =>
                                prevParts.map((part, pIdx) => {
                                  if (pIdx !== selectedPartIndex) return part;
                                  return {
                                    ...part,
                                    sections: part.sections.map((sec, sIdx) => {
                                      if (sIdx !== selectedSectionIndex) return sec;
                                      return { ...sec, exampleAnswer: letter };
                                    }),
                                  };
                                })
                              );
                            }}
                          />
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              background: (currentSection.exampleAnswer || "") === letter ? "#0e276f" : "#e5e7eb",
                              color: (currentSection.exampleAnswer || "") === letter ? "white" : "#374151",
                              fontWeight: 700,
                            }}
                          >
                            {letter}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentSection && (
                <div
                  style={{
                    border: "2px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "20px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <h3 style={{ margin: "0 0 16px", color: "#374151", display: "flex", alignItems: "center", gap: 8 }}>
                    <InlineIcon name="writing" size={16} />
                    Section {selectedSectionIndex + 1}
                  </h3>

                  <div style={{ marginBottom: "20px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      Loại câu hỏi:
                    </label>
                    <QuestionTypeSelector
                      testType={testType}
                      questionTypes={questionTypeOptions}
                      value={currentSection.questionType}
                      onChange={handleQuestionTypeChange}
                      style={{ maxWidth: "400px" }}
                    />
                  </div>

                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "20px",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {currentSection.questions.map((question, qIdx) => {
                      const isCollapsed = collapsedQuestions[`${selectedPartIndex}-${selectedSectionIndex}-${qIdx}`];
                      const startNum = questionStarts.questionStart[`${selectedPartIndex}-${selectedSectionIndex}-${qIdx}`] || 1;
                      const sectionStartNum = questionStarts.sectionStart[`${selectedPartIndex}-${selectedSectionIndex}`] || 1;

                      const getQuestionPreview = () => {
                        if (question.questionText) return question.questionText;
                        if (question.items?.length) return `${question.items.length} matching items`;
                        if (question.options?.length) return `${question.options.length} options`;
                        return "Empty question";
                      };

                      return (
                        <div
                          key={`${selectedPartIndex}-${selectedSectionIndex}-${qIdx}`}
                          style={{
                            marginBottom: "16px",
                            paddingBottom: "16px",
                            borderBottom:
                              qIdx < currentSection.questions.length - 1 ? "2px dashed #e5e7eb" : "none",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: isCollapsed ? "0" : "12px",
                              flexWrap: "wrap",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                flex: 1,
                              }}
                            >
                              {!SECTION_BASED_TYPES.includes(currentSection.questionType) && (
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: "#6366f1",
                                    fontSize: "14px",
                                  }}
                                >
                                  Câu hỏi #{startNum}
                                </span>
                              )}

                              {isCollapsed && (
                                <span
                                  style={{
                                    fontSize: "13px",
                                    color: "#6b7280",
                                    fontStyle: "italic",
                                  }}
                                >
                                  {getQuestionPreview().substring(0, 50)}...
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                onClick={() => toggleCollapseQuestion(qIdx)}
                                style={{
                                  padding: "6px 10px",
                                  backgroundColor: isCollapsed ? "#3b82f6" : "#e0e7ff",
                                  color: isCollapsed ? "white" : "#4f46e5",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                }}
                                title={isCollapsed ? "Mở rộng" : "Thu nhỏ"}
                              >
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  <InlineIcon
                                    name={isCollapsed ? "eye" : "chevron-up"}
                                    size={14}
                                    style={{ color: isCollapsed ? "white" : "#4f46e5" }}
                                  />
                                  {isCollapsed ? "Mở" : "Ẩn"}
                                </span>
                              </button>

                              <button
                                onClick={() => handleCopyQuestion(qIdx)}
                                style={{
                                  padding: "6px 10px",
                                  backgroundColor: "#10b981",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                }}
                                title="Sao chép câu hỏi"
                              >
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  <InlineIcon name="copy" size={14} style={{ color: "white" }} />
                                  Copy
                                </span>
                              </button>

                              {copiedQuestion && (
                                <button
                                  onClick={handlePasteQuestion}
                                  style={{
                                    padding: "6px 10px",
                                    backgroundColor: "#8b5cf6",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                  }}
                                  title="Dán câu hỏi đã copy"
                                >
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    <InlineIcon name="pin" size={14} style={{ color: "white" }} />
                                    Paste
                                  </span>
                                </button>
                              )}

                              {currentSection.questions.length > 1 && (
                                <button
                                  onClick={() => handleDeleteQuestion(qIdx)}
                                  style={{
                                    padding: "6px 10px",
                                    backgroundColor: "#ef4444",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                  }}
                                  title="Xóa câu hỏi"
                                >
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    <InlineIcon name="trash" size={14} style={{ color: "white" }} />
                                    Xóa
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>

                          {!isCollapsed && (
                            <div
                              style={{
                                backgroundColor: "#f9fafb",
                                padding: "16px",
                                borderRadius: "6px",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <QuestionEditorFactory
                                questionType={currentSection.questionType}
                                question={question}
                                testType={testType}
                                onChange={(field, value) => {
                                  updateParts((prevParts) =>
                                    prevParts.map((part, pIdx) => {
                                      if (pIdx !== selectedPartIndex) return part;
                                      const nextSections = (part.sections || []).map((section, sIdx) => {
                                        if (sIdx !== selectedSectionIndex) return section;
                                        const prevQuestions = Array.isArray(section.questions)
                                          ? section.questions
                                          : [];
                                        const prevQuestion = prevQuestions[qIdx] || {};
                                        const nextQuestions = prevQuestions.map((q, idx) => {
                                          if (idx !== qIdx) return q;
                                          return { ...prevQuestion, [field]: value };
                                        });
                                        return { ...section, questions: nextQuestions };
                                      });
                                      return { ...part, sections: nextSections };
                                    })
                                  );
                                }}
                                questionIndex={qIdx}
                                startingNumber={
                                  SECTION_BASED_TYPES.includes(currentSection.questionType)
                                    ? sectionStartNum
                                    : startNum
                                }
                                partIndex={selectedPartIndex}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button
                      onClick={handleAddQuestion}
                      style={{
                        width: "100%",
                        padding: "10px",
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: 600,
                        marginTop: "12px",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <InlineIcon name="create" size={14} style={{ color: "white" }} />
                        Thêm câu hỏi
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const quillStyles = `
  .part-instruction-editor .ql-container {
    min-height: 100px;
    font-size: 14px;
    line-height: 1.8;
    transition: all 0.2s ease;
  }
  .part-instruction-editor .ql-editor {
    min-height: 100px;
    background-color: #ffffff;
  }
  .part-instruction-editor .ql-editor.ql-blank::before {
    font-style: italic;
    color: #9ca3af;
  }

  .part-instruction-editor .ql-container.ql-snow {
    border-color: #d1d5db;
  }
  .part-instruction-editor .ql-container.ql-snow:focus-within {
    background-color: #fef3c7;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
  .part-instruction-editor .ql-editor:focus {
    background-color: #fef3c7;
    outline: none;
  }

  .part-instruction-editor .ql-toolbar.ql-snow {
    border-color: #d1d5db;
    background-color: #f9fafb;
  }
  .part-instruction-editor:focus-within .ql-toolbar.ql-snow {
    background-color: #fef9e7;
    border-color: #f59e0b;
  }
`;

if (typeof document !== "undefined") {
  const styleId = "part-instruction-quill-styles";
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = quillStyles;
    document.head.appendChild(styleEl);
  }
}

export default FceTestBuilder;
