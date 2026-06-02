import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import LineIcon from "./LineIcon.jsx";
import "./StudentAnnotations.css";

const STORAGE_VERSION = 1;

const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const buildAnnotationId = () =>
  `annotation_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const isEditableSelectionTarget = (node) => {
  if (!node) return false;

  const element =
    node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

  return Boolean(
    element?.closest?.(
      "input, textarea, select, [contenteditable=''], [contenteditable='true']"
    )
  );
};

const normalizeAnnotation = (annotation) => {
  const start = Number(annotation?.start);
  const end = Number(annotation?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  return {
    id: String(annotation?.id || buildAnnotationId()),
    scopeKey: String(annotation?.scopeKey || "default"),
    selectedText: normalizeText(annotation?.selectedText),
    noteText: String(annotation?.noteText || ""),
    start,
    end,
    createdAt: Number(annotation?.createdAt) || Date.now(),
    updatedAt: Number(annotation?.updatedAt) || Date.now(),
  };
};

const readStoredAnnotations = (storageKey) => {
  if (typeof window === "undefined" || !storageKey) return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.annotations)
      ? parsed.annotations
      : [];

    return items.map(normalizeAnnotation).filter(Boolean);
  } catch (_error) {
    window.localStorage.removeItem(storageKey);
    return [];
  }
};

const writeStoredAnnotations = (storageKey, annotations) => {
  if (typeof window === "undefined" || !storageKey) return;

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ version: STORAGE_VERSION, annotations })
    );
  } catch (_error) {
    // Ignore storage quota errors so the runtime remains usable.
  }
};

const clearBrowserSelection = () => {
  if (typeof window === "undefined") return;

  const selection = window.getSelection?.();
  if (selection && typeof selection.removeAllRanges === "function") {
    selection.removeAllRanges();
  }
};

const getSelectionWithinContainer = (container) => {
  if (!container || typeof window === "undefined") return null;

  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;

  if (
    !container.contains(startContainer) ||
    !container.contains(endContainer) ||
    isEditableSelectionTarget(startContainer) ||
    isEditableSelectionTarget(endContainer)
  ) {
    return null;
  }

  const selectedText = normalizeText(range.toString());
  if (!selectedText) return null;

  const startRange = document.createRange();
  startRange.selectNodeContents(container);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = document.createRange();
  endRange.selectNodeContents(container);
  endRange.setEnd(range.endContainer, range.endOffset);

  const start = startRange.toString().length;
  const end = endRange.toString().length;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  const rect = range.getBoundingClientRect();
  const fallbackRect = range.getClientRects?.()[0];
  const effectiveRect =
    rect && (rect.width > 0 || rect.height > 0) ? rect : fallbackRect;

  if (!effectiveRect) return null;

  return {
    start,
    end,
    selectedText,
    rect: {
      top: effectiveRect.top,
      left: effectiveRect.left,
      right: effectiveRect.right,
      bottom: effectiveRect.bottom,
      width: effectiveRect.width,
      height: effectiveRect.height,
    },
  };
};

const collectTextNodes = (container) => {
  if (!container) return [];

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent) return NodeFilter.FILTER_REJECT;
      if (!node.parentElement) return NodeFilter.FILTER_REJECT;
      if (node.parentElement.closest("mark[data-student-annotation-id]")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    nodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  return nodes;
};

const unwrapAppliedHighlights = (container) => {
  if (!container) return;

  const marks = container.querySelectorAll("mark[data-student-annotation-id]");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;

    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }

    parent.removeChild(mark);
    parent.normalize?.();
  });
};

const applyAnnotationHighlight = (container, annotation) => {
  if (!container || !annotation) return;

  const textNodes = collectTextNodes(container);
  let offset = 0;

  textNodes.forEach((textNode) => {
    const originalLength = textNode.textContent?.length || 0;
    const nodeStart = offset;
    const nodeEnd = offset + originalLength;
    offset = nodeEnd;

    if (annotation.end <= nodeStart || annotation.start >= nodeEnd || !originalLength) {
      return;
    }

    const startInNode = Math.max(0, annotation.start - nodeStart);
    const endInNode = Math.min(originalLength, annotation.end - nodeStart);
    if (endInNode <= startInNode) return;

    let highlightedNode = textNode;
    if (startInNode > 0) {
      highlightedNode = highlightedNode.splitText(startInNode);
    }
    if (endInNode - startInNode < highlightedNode.textContent.length) {
      highlightedNode.splitText(endInNode - startInNode);
    }

    const mark = document.createElement("mark");
    mark.setAttribute("data-student-annotation-id", annotation.id);
    mark.className = `student-annotation-highlight${annotation.noteText.trim() ? " student-annotation-highlight--noted" : ""}`;
    mark.title = annotation.noteText.trim() || annotation.selectedText;

    highlightedNode.parentNode?.insertBefore(mark, highlightedNode);
    mark.appendChild(highlightedNode);
  });
};

const StudentAnnotations = ({
  containerRef,
  storageKey,
  scopeKey,
  scopeLabel,
  buttonLabel = "Notes",
  disabled = false,
}) => {
  const [annotations, setAnnotations] = useState(() => readStoredAnnotations(storageKey));
  const [panelOpen, setPanelOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState(null);
  const textareaRefs = useRef({});

  useEffect(() => {
    setAnnotations(readStoredAnnotations(storageKey));
    setPendingSelection(null);
    setActiveAnnotationId(null);
    setPanelOpen(false);
  }, [storageKey]);

  useEffect(() => {
    writeStoredAnnotations(storageKey, annotations);
  }, [annotations, storageKey]);

  const currentAnnotations = useMemo(
    () =>
      annotations
        .filter((annotation) => annotation.scopeKey === String(scopeKey))
        .sort((left, right) => left.start - right.start),
    [annotations, scopeKey]
  );

  const currentAnnotationCount = currentAnnotations.length;

  const dismissPendingSelection = useCallback(() => {
    setPendingSelection(null);
    clearBrowserSelection();
  }, []);

  useEffect(() => {
    dismissPendingSelection();
  }, [dismissPendingSelection, scopeKey]);

  const focusAnnotationEditor = useCallback((annotationId) => {
    const textarea = textareaRefs.current[annotationId];
    if (!textarea) return;

    textarea.focus();
    const nextLength = textarea.value.length;
    if (typeof textarea.setSelectionRange === "function") {
      textarea.setSelectionRange(nextLength, nextLength);
    }
  }, []);

  useEffect(() => {
    if (!panelOpen || !activeAnnotationId) return;

    const timer = window.setTimeout(() => {
      focusAnnotationEditor(activeAnnotationId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeAnnotationId, focusAnnotationEditor, panelOpen]);

  const createAnnotation = useCallback(
    (openEditor = false) => {
      if (!pendingSelection) return;

      const normalizedScopeKey = String(scopeKey);
      const overlap = annotations.find(
        (annotation) =>
          annotation.scopeKey === normalizedScopeKey &&
          Math.max(annotation.start, pendingSelection.start) <
            Math.min(annotation.end, pendingSelection.end)
      );

      if (overlap) {
        if (openEditor) {
          setActiveAnnotationId(overlap.id);
          setPanelOpen(true);
        }
        dismissPendingSelection();
        return;
      }

      const nextAnnotation = normalizeAnnotation({
        id: buildAnnotationId(),
        scopeKey: normalizedScopeKey,
        selectedText: pendingSelection.selectedText,
        noteText: "",
        start: pendingSelection.start,
        end: pendingSelection.end,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (!nextAnnotation) {
        dismissPendingSelection();
        return;
      }

      setAnnotations((previousAnnotations) => [...previousAnnotations, nextAnnotation]);

      if (openEditor) {
        setActiveAnnotationId(nextAnnotation.id);
        setPanelOpen(true);
      }

      dismissPendingSelection();
    },
    [annotations, dismissPendingSelection, pendingSelection, scopeKey]
  );

  const updateAnnotationNote = useCallback((annotationId, noteText) => {
    setAnnotations((previousAnnotations) =>
      previousAnnotations.map((annotation) =>
        annotation.id === annotationId
          ? {
              ...annotation,
              noteText,
              updatedAt: Date.now(),
            }
          : annotation
      )
    );
  }, []);

  const removeAnnotation = useCallback(
    (annotationId) => {
      setAnnotations((previousAnnotations) =>
        previousAnnotations.filter((annotation) => annotation.id !== annotationId)
      );

      if (activeAnnotationId === annotationId) {
        setActiveAnnotationId(null);
      }
    },
    [activeAnnotationId]
  );

  const refreshPendingSelection = useCallback(() => {
    if (disabled) return;

    const container = containerRef?.current;
    if (!container) return;

    const nextSelection = getSelectionWithinContainer(container);
    if (!nextSelection) {
      setPendingSelection(null);
      return;
    }

    const top = clamp(nextSelection.rect.top - 52, 12, window.innerHeight - 80);
    const left = clamp(
      nextSelection.rect.left + nextSelection.rect.width / 2,
      120,
      window.innerWidth - 120
    );

    setPendingSelection({
      ...nextSelection,
      toolbarTop: top,
      toolbarLeft: left,
    });
  }, [containerRef, disabled]);

  useEffect(() => {
    if (disabled) return undefined;

    const handlePointerUp = () => {
      window.setTimeout(refreshPendingSelection, 0);
    };

    const handleKeyUp = (event) => {
      if (!event.shiftKey && !event.key.startsWith("Arrow")) return;
      window.setTimeout(refreshPendingSelection, 0);
    };

    const handleViewportChange = () => {
      setPendingSelection(null);
    };

    document.addEventListener("mouseup", handlePointerUp);
    document.addEventListener("touchend", handlePointerUp);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      document.removeEventListener("mouseup", handlePointerUp);
      document.removeEventListener("touchend", handlePointerUp);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [disabled, refreshPendingSelection]);

  useLayoutEffect(() => {
    const container = containerRef?.current;
    if (!container) return undefined;

    unwrapAppliedHighlights(container);
    currentAnnotations.forEach((annotation) => {
      applyAnnotationHighlight(container, annotation);
    });

    return () => {
      unwrapAppliedHighlights(container);
    };
  });

  const noteButton = (
    <button
      type="button"
      className={`student-annotation-trigger${panelOpen ? " is-open" : ""}`}
      onClick={() => setPanelOpen((previousValue) => !previousValue)}
      aria-label="Open notes"
      disabled={disabled}
    >
      <span className="student-annotation-trigger-icon">
        <LineIcon name="document" size={15} strokeWidth={2.1} />
      </span>
      <span className="student-annotation-trigger-label">{buttonLabel}</span>
      {currentAnnotationCount > 0 && (
        <span className="student-annotation-trigger-count" aria-hidden="true">
          {currentAnnotationCount}
        </span>
      )}
    </button>
  );

  if (typeof document === "undefined") {
    return noteButton;
  }

  return (
    <>
      {noteButton}
      {createPortal(
        <>
          {pendingSelection && !disabled && (
            <div
              className="student-annotation-toolbar"
              style={{
                top: `${pendingSelection.toolbarTop}px`,
                left: `${pendingSelection.toolbarLeft}px`,
              }}
              role="dialog"
              aria-label="Text selection actions"
            >
              <button
                type="button"
                className="student-annotation-toolbar-button"
                onClick={() => createAnnotation(true)}
                aria-label="Note"
              >
                <LineIcon name="document" size={14} strokeWidth={2.1} />
                <span>Note</span>
              </button>
              <button
                type="button"
                className="student-annotation-toolbar-button"
                onClick={() => createAnnotation(false)}
                aria-label="Highlight"
              >
                <LineIcon name="edit" size={14} strokeWidth={2.1} />
                <span>Highlight</span>
              </button>
            </div>
          )}

          {panelOpen && (
            <aside className="student-annotation-panel" aria-label="Notes panel">
              <div className="student-annotation-panel-header">
                <div>
                  <div className="student-annotation-panel-title">Notes</div>
                  <div className="student-annotation-panel-subtitle">{scopeLabel}</div>
                </div>
                <button
                  type="button"
                  className="student-annotation-close"
                  onClick={() => setPanelOpen(false)}
                  aria-label="Close notes"
                >
                  <LineIcon name="close" size={16} strokeWidth={2.2} />
                </button>
              </div>

              <div className="student-annotation-panel-body">
                {currentAnnotations.length === 0 ? (
                  <div className="student-annotation-empty">
                    Select any text in this part, then choose <strong>Note</strong> or <strong>Highlight</strong>.
                  </div>
                ) : (
                  currentAnnotations.map((annotation, index) => (
                    <section
                      key={annotation.id}
                      className={`student-annotation-card${activeAnnotationId === annotation.id ? " is-active" : ""}`}
                    >
                      <div className="student-annotation-card-header">
                        <div>
                          <div className="student-annotation-card-label">Highlight {index + 1}</div>
                          <div className="student-annotation-card-quote">{annotation.selectedText}</div>
                        </div>
                        <button
                          type="button"
                          className="student-annotation-delete"
                          onClick={() => removeAnnotation(annotation.id)}
                          aria-label={`Delete note ${index + 1}`}
                        >
                          <LineIcon name="trash" size={14} strokeWidth={2.1} />
                        </button>
                      </div>

                      <textarea
                        ref={(element) => {
                          if (element) textareaRefs.current[annotation.id] = element;
                          else delete textareaRefs.current[annotation.id];
                        }}
                        className="student-annotation-textarea"
                        placeholder="Start typing your note"
                        value={annotation.noteText}
                        onFocus={() => setActiveAnnotationId(annotation.id)}
                        onChange={(event) =>
                          updateAnnotationNote(annotation.id, event.target.value)
                        }
                      />
                    </section>
                  ))
                )}
              </div>
            </aside>
          )}
        </>,
        document.body
      )}
    </>
  );
};

export default StudentAnnotations;