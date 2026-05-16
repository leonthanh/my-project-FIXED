import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { hostPath } from '../utils/api';
import { uploadCambridgeImageFile } from '../utils/cambridgeImageUpload';

const clampPercent = (value, fallback = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
};

const clampWidth = (value, fallback = 240) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(140, Math.min(420, parsed));
};

const getStartNumber = (questionNumber, fallback = 1) => {
  const match = String(questionNumber || '').match(/\d+/);
  if (!match) return fallback;
  const parsed = parseInt(match[0], 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const buildDefaultAnchor = (index = 0, fallbackX = 50, fallbackY = 50) => ({
  id: `anchor_${Date.now()}_${index}`,
  x: clampPercent(fallbackX, 50),
  y: clampPercent(fallbackY, 50),
});

const normalizeAnchors = (anchors, fallbackX = 50, fallbackY = 50) => {
  const source = Array.isArray(anchors) && anchors.length > 0
    ? anchors
    : [buildDefaultAnchor(0, fallbackX, fallbackY)];

  return source.map((anchor, index) => ({
    id: anchor?.id || `anchor_${Date.now()}_${index}`,
    x: clampPercent(anchor?.x, fallbackX),
    y: clampPercent(anchor?.y, fallbackY),
  }));
};

const buildDefaultBlank = (index = 0) => ({
  id: `blank_${Date.now()}_${index}`,
  blankNumber: index + 1,
  promptHtml: '[NUMBER] [BLANK]',
  correctAnswer: '',
  labelX: 10,
  labelY: 10 + index * 8,
  anchorX: 50,
  anchorY: 50,
  anchors: [buildDefaultAnchor(0, 50, 50)],
  width: 220,
  textAlign: 'left',
});

const normalizeBlank = (blank, index) => {
  const fallbackAnchorX = clampPercent(blank?.anchorX, 50);
  const fallbackAnchorY = clampPercent(blank?.anchorY, 50);
  const normalizedAnchors = normalizeAnchors(blank?.anchors, fallbackAnchorX, fallbackAnchorY);

  return {
    ...buildDefaultBlank(index),
    ...(blank || {}),
    id: blank?.id || `blank_${Date.now()}_${index}`,
    blankNumber: index + 1,
    promptHtml:
      typeof blank?.promptHtml === 'string' && blank.promptHtml.trim()
        ? blank.promptHtml
        : '[NUMBER] [BLANK]',
    labelX: clampPercent(blank?.labelX, 10),
    labelY: clampPercent(blank?.labelY, 10 + index * 8),
    anchorX: normalizedAnchors[0].x,
    anchorY: normalizedAnchors[0].y,
    anchors: normalizedAnchors,
    width: clampWidth(blank?.width, 220),
    textAlign: ['left', 'center', 'right'].includes(blank?.textAlign)
      ? blank.textAlign
      : 'left',
  };
};

const buildDefaultAnnotation = (index = 0) => ({
  id: `annotation_${Date.now()}_${index}`,
  noteText: 'Nhập chú thích trực tiếp trên hình',
  labelX: 62,
  labelY: 18 + index * 8,
  anchorX: 78,
  anchorY: 42 + index * 4,
  anchors: [buildDefaultAnchor(0, 78, 42 + index * 4)],
  width: 260,
  textAlign: 'left',
  showArrow: true,
});

const normalizeAnnotation = (annotation, index) => {
  const fallbackAnchorX = clampPercent(annotation?.anchorX, 78);
  const fallbackAnchorY = clampPercent(annotation?.anchorY, 42 + index * 4);
  const normalizedAnchors = normalizeAnchors(annotation?.anchors, fallbackAnchorX, fallbackAnchorY);

  return {
    ...buildDefaultAnnotation(index),
    ...(annotation || {}),
    id: annotation?.id || `annotation_${Date.now()}_${index}`,
    noteText:
      typeof annotation?.noteText === 'string' && annotation.noteText.trim()
        ? annotation.noteText
        : 'Nhập chú thích trực tiếp trên hình',
    labelX: clampPercent(annotation?.labelX, 62),
    labelY: clampPercent(annotation?.labelY, 18 + index * 8),
    anchorX: normalizedAnchors[0].x,
    anchorY: normalizedAnchors[0].y,
    anchors: normalizedAnchors,
    width: clampWidth(annotation?.width, 260),
    textAlign: ['left', 'center', 'right'].includes(annotation?.textAlign)
      ? annotation.textAlign
      : 'left',
    showArrow: annotation?.showArrow !== false,
  };
};

const getDetailForNumber = (detailMap, questionNumber) => {
  if (!detailMap) return null;
  if (detailMap instanceof Map) return detailMap.get(questionNumber) || null;
  return detailMap[questionNumber] || null;
};

const normalizeReviewValue = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .join(', ');
  }

  return String(value ?? '').trim();
};

const getReviewStudentValue = (detail, fallback = '') => normalizeReviewValue(
  detail?.studentLabel ?? detail?.student ?? detail?.studentAnswer ?? fallback
);

const getReviewCorrectValue = (detail, fallback = '') => normalizeReviewValue(
  detail?.correctAnswer ?? detail?.expectedLabel ?? detail?.expected ?? fallback
);

const normalizePromptTemplate = (promptHtml) => {
  const raw = String(promptHtml || '').trim();
  if (!raw) return ['[NUMBER]', ' ', '[BLANK]'];

  const withBlank = raw.includes('[BLANK]') ? raw : `${raw} [BLANK]`;
  return withBlank.split(/(\[NUMBER\]|\[BLANK\])/g).filter(Boolean);
};

const resolveImageUrl = (url) => {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^data:/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) return raw;
  return hostPath(raw);
};

const BLANK_THEME = {
  line: '#a855f7',
  lineActive: '#7e22ce',
  accent: '#7c3aed',
  accentStrong: '#6d28d9',
  accentSoft: '#f3e8ff',
  accentMuted: '#ede9fe',
  accentBorder: '#ddd6fe',
  text: '#5b21b6',
  handleBorder: 'rgba(124, 58, 237, 0.32)',
  handleActiveBorder: 'rgba(124, 58, 237, 0.55)',
  handleGradient:
    'radial-gradient(circle, rgba(168, 85, 247, 0.82) 0 22%, rgba(168, 85, 247, 0.2) 23%, rgba(168, 85, 247, 0.08) 58%, rgba(168, 85, 247, 0) 59%)',
  handleActiveGradient:
    'radial-gradient(circle, rgba(124, 58, 237, 0.94) 0 22%, rgba(124, 58, 237, 0.24) 23%, rgba(124, 58, 237, 0.1) 58%, rgba(124, 58, 237, 0) 59%)',
};

const ANNOTATION_THEME = {
  line: '#fb923c',
  lineActive: '#ea580c',
  accent: '#f97316',
  accentStrong: '#c2410c',
  accentSoft: '#fff7ed',
  accentMuted: '#ffedd5',
  accentBorder: '#fed7aa',
  text: '#c2410c',
  handleBorder: 'rgba(249, 115, 22, 0.32)',
  handleActiveBorder: 'rgba(249, 115, 22, 0.55)',
  handleGradient:
    'radial-gradient(circle, rgba(251, 146, 60, 0.84) 0 22%, rgba(251, 146, 60, 0.22) 23%, rgba(251, 146, 60, 0.08) 58%, rgba(251, 146, 60, 0) 59%)',
  handleActiveGradient:
    'radial-gradient(circle, rgba(249, 115, 22, 0.94) 0 22%, rgba(249, 115, 22, 0.24) 23%, rgba(249, 115, 22, 0.1) 58%, rgba(249, 115, 22, 0) 59%)',
};

const EDIT_BOARD_BASE_WIDTH = 760;
const RUNTIME_BOARD_BASE_WIDTH = 860;

const DiagramLabelingQuestion = ({
  question,
  onChange,
  mode = 'edit',
  questionNumber = 1,
  answers = {},
  onAnswerChange,
  detailMap,
  showCorrect = true,
  registerQuestionRef,
  onFocusQuestion,
}) => {
  const fileInputRef = useRef(null);
  const boardRef = useRef(null);
  const dragListenersRef = useRef({ move: null, up: null });
  const arrowMarkerBaseId = useId().replace(/:/g, '');
  const arrowMarkerIds = useMemo(
    () => ({
      blank: `${arrowMarkerBaseId}-blank`,
      blankActive: `${arrowMarkerBaseId}-blank-active`,
      annotation: `${arrowMarkerBaseId}-annotation`,
      annotationActive: `${arrowMarkerBaseId}-annotation-active`,
    }),
    [arrowMarkerBaseId]
  );
  const [activeBlankIndex, setActiveBlankIndex] = useState(0);
  const [activeAnnotationIndex, setActiveAnnotationIndex] = useState(0);
  const [selectionMode, setSelectionMode] = useState(null);
  const [showExpandedLabels, setShowExpandedLabels] = useState(true);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showStudentPreview, setShowStudentPreview] = useState(false);
  const [collapsedBlankCards, setCollapsedBlankCards] = useState({});
  const [dragPreview, setDragPreview] = useState(null);
  const [studentPreviewAnswers, setStudentPreviewAnswers] = useState({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');

  const blanks = useMemo(
    () => (Array.isArray(question?.blanks) ? question.blanks : []).map(normalizeBlank),
    [question?.blanks]
  );
  const annotations = useMemo(
    () => (Array.isArray(question?.annotations) ? question.annotations : []).map(normalizeAnnotation),
    [question?.annotations]
  );
  const baseQuestionNumber = getStartNumber(question?.questionNumber, questionNumber);
  const imageUrl = resolveImageUrl(question?.diagramImageUrl || question?.imageUrl || '');
  const useCompactAnswerLayout = mode === 'answer';
  const useRuntimeLayout = mode === 'answer' || mode === 'review';

  const resolveRuntimeBoxWidth = (width) => {
    if (!useRuntimeLayout) {
      return `${width}px`;
    }

    const boundedWidth = clampWidth(width, 220);
    const percentWidth = Math.max(18, (boundedWidth / RUNTIME_BOARD_BASE_WIDTH) * 100);
    return `min(${boundedWidth}px, ${percentWidth.toFixed(2)}%)`;
  };

  const getBlankReviewState = (blank, blankIndex) => {
    const absoluteQuestionNumber = baseQuestionNumber + blankIndex;
    const answerKey = `q_${baseQuestionNumber}_${blankIndex}`;
    const detail = getDetailForNumber(detailMap, absoluteQuestionNumber);
    const studentAnswer = getReviewStudentValue(detail, answers?.[answerKey] || '');
    const correctAnswer = getReviewCorrectValue(detail, blank?.correctAnswer || '');

    return {
      absoluteQuestionNumber,
      answerKey,
      detail,
      studentAnswer,
      correctAnswer,
    };
  };

  useEffect(() => {
    if (activeBlankIndex > blanks.length - 1) {
      setActiveBlankIndex(Math.max(0, blanks.length - 1));
    }
  }, [activeBlankIndex, blanks.length]);

  useEffect(() => {
    if (activeAnnotationIndex > annotations.length - 1) {
      setActiveAnnotationIndex(Math.max(0, annotations.length - 1));
    }
  }, [activeAnnotationIndex, annotations.length]);

  useEffect(() => {
    const validKeys = new Set(
      blanks.map((_, blankIndex) => `q_${baseQuestionNumber}_${blankIndex}`)
    );

    setStudentPreviewAnswers((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => validKeys.has(key))
    ));
  }, [blanks, baseQuestionNumber]);

  useEffect(() => {
    return () => {
      if (dragListenersRef.current.move) {
        window.removeEventListener('mousemove', dragListenersRef.current.move);
      }
      if (dragListenersRef.current.up) {
        window.removeEventListener('mouseup', dragListenersRef.current.up);
      }
    };
  }, []);

  const emitQuestion = (patch) => {
    if (!onChange) return;
    onChange({
      ...question,
      questionType: 'diagram-labeling',
      blanks,
      annotations,
      ...patch,
    });
  };

  const commitBlanks = (nextBlanks) => {
    emitQuestion({
      blanks: nextBlanks.map((blank, index) => normalizeBlank(blank, index)),
    });
  };

  const commitAnnotations = (nextAnnotations) => {
    emitQuestion({
      annotations: nextAnnotations.map((annotation, index) => normalizeAnnotation(annotation, index)),
    });
  };

  const updateBlankPatch = (index, patch) => {
    const nextBlanks = blanks.map((blank, blankIndex) =>
      blankIndex === index ? { ...blank, ...patch } : blank
    );
    commitBlanks(nextBlanks);
  };

  const updateBlank = (index, field, value) => {
    updateBlankPatch(index, { [field]: value });
  };

  const updateAnnotationPatch = (index, patch) => {
    const nextAnnotations = annotations.map((annotation, annotationIndex) =>
      annotationIndex === index ? { ...annotation, ...patch } : annotation
    );
    commitAnnotations(nextAnnotations);
  };

  const updateAnnotation = (index, field, value) => {
    updateAnnotationPatch(index, { [field]: value });
  };

  const setActiveEntity = (entityType, itemIndex) => {
    if (entityType === 'annotation') {
      setActiveAnnotationIndex(itemIndex);
      return;
    }

    setActiveBlankIndex(itemIndex);
  };

  const updateEntityPatch = (entityType, itemIndex, patch) => {
    if (entityType === 'annotation') {
      updateAnnotationPatch(itemIndex, patch);
      return;
    }

    updateBlankPatch(itemIndex, patch);
  };

  const buildAnchorPatch = (item, anchorIndex, nextPosition) => {
    const currentAnchors = Array.isArray(item?.anchors) && item.anchors.length > 0
      ? item.anchors
      : [buildDefaultAnchor(0, item?.anchorX, item?.anchorY)];
    const nextAnchors = currentAnchors.map((anchor, index) =>
      index === anchorIndex
        ? { ...anchor, x: nextPosition.x, y: nextPosition.y }
        : anchor
    );

    return {
      anchors: nextAnchors,
      anchorX: nextAnchors[0].x,
      anchorY: nextAnchors[0].y,
    };
  };

  const addArrowToEntity = (entityType, itemIndex) => {
    const items = entityType === 'annotation' ? annotations : blanks;
    const item = items[itemIndex];

    if (!item) {
      return;
    }

    const currentAnchors = Array.isArray(item.anchors) && item.anchors.length > 0
      ? item.anchors
      : [buildDefaultAnchor(0, item.anchorX, item.anchorY)];
    const previousAnchor = currentAnchors[currentAnchors.length - 1] || buildDefaultAnchor(0, item.anchorX, item.anchorY);
    const nextAnchor = buildDefaultAnchor(
      currentAnchors.length,
      Math.min(96, previousAnchor.x + 6),
      Math.min(96, previousAnchor.y + 6)
    );

    updateEntityPatch(entityType, itemIndex, {
      anchors: [...currentAnchors, nextAnchor],
      anchorX: currentAnchors[0].x,
      anchorY: currentAnchors[0].y,
      ...(entityType === 'annotation' ? { showArrow: true } : {}),
    });
  };

  const removeArrowFromEntity = (entityType, itemIndex, anchorIndex) => {
    const items = entityType === 'annotation' ? annotations : blanks;
    const item = items[itemIndex];
    const currentAnchors = Array.isArray(item?.anchors) && item.anchors.length > 0 ? item.anchors : [];

    if (!item || currentAnchors.length <= 1) {
      return;
    }

    const nextAnchors = currentAnchors.filter((_, index) => index !== anchorIndex);
    updateEntityPatch(entityType, itemIndex, {
      anchors: nextAnchors,
      anchorX: nextAnchors[0].x,
      anchorY: nextAnchors[0].y,
    });
  };

  const clearDragListeners = () => {
    if (dragListenersRef.current.move) {
      window.removeEventListener('mousemove', dragListenersRef.current.move);
    }
    if (dragListenersRef.current.up) {
      window.removeEventListener('mouseup', dragListenersRef.current.up);
    }
    dragListenersRef.current = { move: null, up: null };
  };

  const handleDragStart = (event, entityType, itemIndex, target, anchorIndex = 0) => {
    const items = entityType === 'annotation' ? annotations : blanks;
    const currentItem = items[itemIndex];
    const currentAnchor = currentItem?.anchors?.[anchorIndex] || buildDefaultAnchor(anchorIndex, currentItem?.anchorX, currentItem?.anchorY);

    if (mode !== 'edit' || !boardRef.current || !currentItem) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const elementRect = event.currentTarget.getBoundingClientRect();
    const offsetX =
      target === 'label'
        ? event.clientX - elementRect.left - 2
        : event.clientX - (elementRect.left + elementRect.width / 2);
    const offsetY =
      target === 'label'
        ? event.clientY - elementRect.top - 2
        : event.clientY - (elementRect.top + elementRect.height / 2);

    const getNextPosition = (clientX, clientY) => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) return null;

      if (target === 'label') {
        return {
          x: clampPercent(((clientX - rect.left - offsetX) / rect.width) * 100, currentItem.labelX),
          y: clampPercent(((clientY - rect.top - offsetY) / rect.height) * 100, currentItem.labelY),
        };
      }

      return {
        x: clampPercent(((clientX - offsetX - rect.left) / rect.width) * 100, currentAnchor.x),
        y: clampPercent(((clientY - offsetY - rect.top) / rect.height) * 100, currentAnchor.y),
      };
    };

    setActiveEntity(entityType, itemIndex);
    setSelectionMode(null);
    setDragPreview({
      entityType,
      itemIndex,
      target,
      anchorIndex,
      x: target === 'label' ? currentItem.labelX : currentAnchor.x,
      y: target === 'label' ? currentItem.labelY : currentAnchor.y,
    });

    clearDragListeners();

    const handleMouseMove = (moveEvent) => {
      const nextPosition = getNextPosition(moveEvent.clientX, moveEvent.clientY);
      if (!nextPosition) return;

      setDragPreview({
        entityType,
        itemIndex,
        target,
        anchorIndex,
        ...nextPosition,
      });
    };

    const handleMouseUp = (upEvent) => {
      const nextPosition = getNextPosition(upEvent.clientX, upEvent.clientY);

      if (nextPosition) {
        if (target === 'label') {
          updateEntityPatch(entityType, itemIndex, {
            labelX: nextPosition.x,
            labelY: nextPosition.y,
          });
        } else {
          updateEntityPatch(entityType, itemIndex, buildAnchorPatch(currentItem, anchorIndex, nextPosition));
        }
      }

      setDragPreview(null);
      clearDragListeners();
    };

    dragListenersRef.current = { move: handleMouseMove, up: handleMouseUp };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (event, entityType, itemIndex) => {
    const items = entityType === 'annotation' ? annotations : blanks;
    const currentItem = items[itemIndex];

    if (mode !== 'edit' || !currentItem) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = currentItem.width;

    setActiveEntity(entityType, itemIndex);
    setSelectionMode(null);
    setDragPreview({
      entityType,
      itemIndex,
      target: 'resize',
      width: startWidth,
    });

    clearDragListeners();

    const getNextWidth = (clientX) => clampWidth(startWidth + (clientX - startX), startWidth);

    const handleMouseMove = (moveEvent) => {
      setDragPreview({
        entityType,
        itemIndex,
        target: 'resize',
        width: getNextWidth(moveEvent.clientX),
      });
    };

    const handleMouseUp = (upEvent) => {
      updateEntityPatch(entityType, itemIndex, {
        width: getNextWidth(upEvent.clientX),
      });

      setDragPreview(null);
      clearDragListeners();
    };

    dragListenersRef.current = { move: handleMouseMove, up: handleMouseUp };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleBoardClick = (event) => {
    if (mode !== 'edit' || selectionMode === null || !boardRef.current || !blanks[activeBlankIndex]) {
      return;
    }

    const rect = boardRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    if (selectionMode === 'label') {
      updateBlankPatch(activeBlankIndex, {
        labelX: clampPercent(x, 10),
        labelY: clampPercent(y, 10),
      });
    }

    if (selectionMode === 'anchor') {
      const activeBlank = blanks[activeBlankIndex];
      if (activeBlank) {
        updateBlankPatch(
          activeBlankIndex,
          buildAnchorPatch(activeBlank, 0, {
            x: clampPercent(x, 50),
            y: clampPercent(y, 50),
          })
        );
      }
    }

    setSelectionMode(null);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploadError('');
    setIsUploadingImage(true);

    try {
      const uploadedUrl = await uploadCambridgeImageFile(file);
      emitQuestion({ diagramImageUrl: uploadedUrl });
    } catch (error) {
      setImageUploadError(error?.message || 'Lỗi khi upload ảnh diagram');
    } finally {
      setIsUploadingImage(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleAddBlank = () => {
    const nextBlanks = [...blanks, buildDefaultBlank(blanks.length)];
    commitBlanks(nextBlanks);
    setActiveBlankIndex(nextBlanks.length - 1);
  };

  const handleAddAnnotation = () => {
    const nextAnnotations = [...annotations, buildDefaultAnnotation(annotations.length)];
    commitAnnotations(nextAnnotations);
    setActiveAnnotationIndex(nextAnnotations.length - 1);
  };

  const handleRemoveBlank = (index) => {
    const nextBlanks = blanks.filter((_, blankIndex) => blankIndex !== index);
    commitBlanks(nextBlanks);
    setActiveBlankIndex((current) => Math.max(0, Math.min(current, nextBlanks.length - 1)));
  };

  const handleRemoveAnnotation = (index) => {
    const nextAnnotations = annotations.filter((_, annotationIndex) => annotationIndex !== index);
    commitAnnotations(nextAnnotations);
    setActiveAnnotationIndex((current) => Math.max(0, Math.min(current, nextAnnotations.length - 1)));
  };

  const toggleBlankCard = (blankId) => {
    setCollapsedBlankCards((current) => ({
      ...current,
      [blankId]: !current[blankId],
    }));
  };

  const collapseAllBlankCards = () => {
    setCollapsedBlankCards(
      blanks.reduce((nextState, blank) => {
        nextState[blank.id] = true;
        return nextState;
      }, {})
    );
  };

  const expandAllBlankCards = () => {
    setCollapsedBlankCards({});
  };

  const renderedBlanks = blanks.map((blank, blankIndex) => {
    if (
      !dragPreview ||
      dragPreview.entityType !== 'blank' ||
      dragPreview.itemIndex !== blankIndex
    ) {
      return blank;
    }

    if (dragPreview.target === 'resize') {
      return {
        ...blank,
        width: dragPreview.width,
      };
    }

    if (dragPreview.target === 'label') {
      return {
        ...blank,
        labelX: dragPreview.x,
        labelY: dragPreview.y,
      };
    }

    return {
      ...blank,
      ...buildAnchorPatch(blank, dragPreview.anchorIndex ?? 0, {
        x: dragPreview.x,
        y: dragPreview.y,
      }),
    };
  });

  const renderedAnnotations = annotations.map((annotation, annotationIndex) => {
    if (
      !dragPreview ||
      dragPreview.entityType !== 'annotation' ||
      dragPreview.itemIndex !== annotationIndex
    ) {
      return annotation;
    }

    if (dragPreview.target === 'resize') {
      return {
        ...annotation,
        width: dragPreview.width,
      };
    }

    if (dragPreview.target === 'label') {
      return {
        ...annotation,
        labelX: dragPreview.x,
        labelY: dragPreview.y,
      };
    }

    return {
      ...annotation,
      ...buildAnchorPatch(annotation, dragPreview.anchorIndex ?? 0, {
        x: dragPreview.x,
        y: dragPreview.y,
      }),
    };
  });

  const renderPromptWithBlank = (blank, blankIndex) => {
    const {
      absoluteQuestionNumber,
      answerKey,
      detail,
      studentAnswer,
      correctAnswer,
    } = getBlankReviewState(blank, blankIndex);
    const promptParts = normalizePromptTemplate(blank.promptHtml);

    const answerValue = mode === 'review' ? studentAnswer : answers?.[answerKey] || '';

    const blankNode = (() => {
      if (mode === 'edit') {
        return (
          <span
            style={{
              display: 'inline-block',
              minWidth: '84px',
              borderBottom: '2px dashed #0e276f',
              margin: '0 4px',
              height: '1.2em',
              verticalAlign: 'bottom',
            }}
          />
        );
      }

      if (mode === 'review') {
        const reviewBorder = detail
          ? detail.isCorrect
            ? '2px solid #16a34a'
            : '2px solid #dc2626'
          : '2px solid #cbd5e1';
        const reviewBackground = detail
          ? detail.isCorrect
            ? '#f0fdf4'
            : '#fef2f2'
          : '#f8fafc';

        return (
          <input
            ref={(element) => registerQuestionRef?.(absoluteQuestionNumber, element)}
            type="text"
            aria-label={`Ô trả lời câu ${absoluteQuestionNumber}`}
            value={answerValue}
            readOnly
            style={{
              width: useCompactAnswerLayout ? '72px' : '92px',
              padding: '4px 6px',
              margin: useCompactAnswerLayout ? '0 2px' : '0 4px',
              borderRadius: '6px',
              border: reviewBorder,
              backgroundColor: reviewBackground,
              fontWeight: 700,
              fontSize: '1em',
              fontFamily: 'inherit',
              lineHeight: 'inherit',
            }}
          />
        );
      }

      return (
        <input
          ref={(element) => registerQuestionRef?.(absoluteQuestionNumber, element)}
          type="text"
          aria-label={`Ô trả lời câu ${absoluteQuestionNumber}`}
          value={answerValue}
          onChange={(event) => onAnswerChange?.(answerKey, event.target.value)}
          onFocus={() => onFocusQuestion?.(absoluteQuestionNumber)}
          style={{
            width: useCompactAnswerLayout ? '72px' : '92px',
            padding: useCompactAnswerLayout ? '3px 5px' : '4px 6px',
            margin: useCompactAnswerLayout ? '0 2px' : '0 4px',
            borderRadius: useCompactAnswerLayout ? '5px' : '6px',
            border: answerValue ? '2px solid #0e276f' : '2px solid #cbd5e1',
            backgroundColor: '#ffffff',
            fontWeight: 700,
            fontSize: '1em',
            fontFamily: 'inherit',
            lineHeight: 'inherit',
          }}
        />
      );
    })();

    const containsNumberToken = promptParts.includes('[NUMBER]');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: useCompactAnswerLayout ? '4px' : '6px' }}>
        {!containsNumberToken && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: useCompactAnswerLayout ? '24px' : '28px',
              height: useCompactAnswerLayout ? '24px' : '28px',
              borderRadius: '999px',
              backgroundColor: '#0e276f',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: useCompactAnswerLayout ? '11px' : '12px',
            }}
          >
            {absoluteQuestionNumber}
          </div>
        )}

        <div style={{ lineHeight: useCompactAnswerLayout ? 1.34 : 1.5 }}>
          {promptParts.map((part, partIndex) => {
            if (part === '[NUMBER]') {
              return (
                <span
                  key={`${blank.id}-number-${partIndex}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: useCompactAnswerLayout ? '20px' : '24px',
                    height: useCompactAnswerLayout ? '20px' : '24px',
                    borderRadius: '999px',
                    backgroundColor: '#0e276f',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: useCompactAnswerLayout ? '10px' : '11px',
                    marginRight: useCompactAnswerLayout ? '4px' : '6px',
                  }}
                >
                  {absoluteQuestionNumber}
                </span>
              );
            }

            if (part === '[BLANK]') {
              return <React.Fragment key={`${blank.id}-blank-${partIndex}`}>{blankNode}</React.Fragment>;
            }

            return <span key={`${blank.id}-text-${partIndex}`}>{part}</span>;
          })}
        </div>

        {mode === 'review' && detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                alignSelf: 'flex-start',
                padding: '4px 8px',
                borderRadius: '999px',
                backgroundColor: detail.isCorrect ? '#dcfce7' : '#fee2e2',
                color: detail.isCorrect ? '#166534' : '#991b1b',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {detail.isCorrect ? 'Correct' : 'Incorrect'}
            </div>

            {showCorrect && !detail.isCorrect && correctAnswer && (
              <div
                style={{
                  padding: '4px 8px',
                  borderRadius: '8px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                Correct: {correctAnswer}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const boardContent = (
    <div
      ref={boardRef}
      onClick={handleBoardClick}
      style={{
        position: 'relative',
        width: '100%',
        minWidth: mode === 'edit' ? `${EDIT_BOARD_BASE_WIDTH}px` : `${RUNTIME_BOARD_BASE_WIDTH}px`,
        minHeight: '520px',
        borderRadius: '12px',
        overflow: 'visible',
        background:
          imageUrl
            ? '#ffffff'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        border: imageUrl ? '1px solid #cbd5e1' : '2px dashed #94a3b8',
        cursor: mode === 'edit' && selectionMode ? 'crosshair' : 'default',
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={question?.diagramImageAlt || 'Diagram'}
          style={{ width: '100%', display: 'block', borderRadius: '12px' }}
        />
      ) : (
        <div
          style={{
            minHeight: '520px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            textAlign: 'center',
            padding: '24px',
            lineHeight: 1.6,
          }}
        >
          Tải ảnh diagram lên để bắt đầu đặt text và mũi tên.
        </div>
      )}

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        <defs>
          <marker
            id={arrowMarkerIds.blank}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill={BLANK_THEME.line} />
          </marker>
          <marker
            id={arrowMarkerIds.blankActive}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill={BLANK_THEME.lineActive} />
          </marker>
          <marker
            id={arrowMarkerIds.annotation}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill={ANNOTATION_THEME.line} />
          </marker>
          <marker
            id={arrowMarkerIds.annotationActive}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill={ANNOTATION_THEME.lineActive} />
          </marker>
        </defs>

        {renderedBlanks.map((blank, blankIndex) => (
          (blank.anchors || []).map((anchor, anchorIndex) => (
            <g key={`${blank.id}-line-${anchor.id || anchorIndex}`}>
              <line
                x1={blank.labelX}
                y1={blank.labelY}
                x2={anchor.x}
                y2={anchor.y}
                stroke={activeBlankIndex === blankIndex ? BLANK_THEME.lineActive : BLANK_THEME.line}
                strokeWidth="0.45"
                markerEnd={`url(#${activeBlankIndex === blankIndex ? arrowMarkerIds.blankActive : arrowMarkerIds.blank})`}
              />
              {mode === 'edit' ? (
                <circle
                  cx={anchor.x}
                  cy={anchor.y}
                  r="1.1"
                  fill={activeBlankIndex === blankIndex ? BLANK_THEME.lineActive : BLANK_THEME.line}
                />
              ) : null}
            </g>
          ))
        ))}

        {renderedAnnotations
          .filter((annotation) => annotation.showArrow)
          .map((annotation, annotationIndex) => (
            (annotation.anchors || []).map((anchor, anchorIndex) => (
              <g key={`${annotation.id}-line-${anchor.id || anchorIndex}`}>
                <line
                  x1={annotation.labelX}
                  y1={annotation.labelY}
                  x2={anchor.x}
                  y2={anchor.y}
                  stroke={activeAnnotationIndex === annotationIndex ? ANNOTATION_THEME.lineActive : ANNOTATION_THEME.line}
                  strokeWidth="0.45"
                  markerEnd={`url(#${activeAnnotationIndex === annotationIndex ? arrowMarkerIds.annotationActive : arrowMarkerIds.annotation})`}
                />
                {mode === 'edit' ? (
                  <circle
                    cx={anchor.x}
                    cy={anchor.y}
                    r="1.1"
                    fill={activeAnnotationIndex === annotationIndex ? ANNOTATION_THEME.lineActive : ANNOTATION_THEME.line}
                  />
                ) : null}
              </g>
            ))
          ))}
      </svg>

      {mode === 'edit' && renderedBlanks.map((blank, blankIndex) => {
        const absoluteQuestionNumber = baseQuestionNumber + blankIndex;
        const isActive = activeBlankIndex === blankIndex;

        return (blank.anchors || []).map((anchor, anchorIndex) => (
          <button
            key={`${blank.id}-anchor-handle-${anchor.id || anchorIndex}`}
            type="button"
            title={`Kéo mũi tên ${anchorIndex + 1} của Q${absoluteQuestionNumber}`}
            aria-label={`Kéo mũi tên ${anchorIndex + 1} của Q${absoluteQuestionNumber}`}
            onMouseDown={(event) => handleDragStart(event, 'blank', blankIndex, 'anchor', anchorIndex)}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setActiveBlankIndex(blankIndex);
            }}
            style={{
              position: 'absolute',
              top: `${anchor.y}%`,
              left: `${anchor.x}%`,
              width: '20px',
              height: '20px',
              transform: 'translate(-50%, -50%)',
              borderRadius: '999px',
              border: `1px solid ${isActive ? BLANK_THEME.handleActiveBorder : BLANK_THEME.handleBorder}`,
              background: isActive
                ? BLANK_THEME.handleActiveGradient
                : BLANK_THEME.handleGradient,
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)',
              cursor: 'grab',
              zIndex: 5,
              padding: 0,
            }}
          />
        ));
      })}

      {renderedBlanks.map((blank, blankIndex) => {
        const absoluteQuestionNumber = baseQuestionNumber + blankIndex;
        const isActive = activeBlankIndex === blankIndex;

        if (mode === 'edit' && !showExpandedLabels) {
          return (
            <button
              key={blank.id}
              type="button"
              title={`Kéo label Q${absoluteQuestionNumber}`}
              aria-label={`Kéo label Q${absoluteQuestionNumber}`}
              onMouseDown={(event) => handleDragStart(event, 'blank', blankIndex, 'label')}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setActiveBlankIndex(blankIndex);
              }}
              style={{
                position: 'absolute',
                top: `${blank.labelY}%`,
                left: `${blank.labelX}%`,
                transform: 'translate(-2px, -2px)',
                minWidth: '56px',
                padding: '8px 10px',
                borderRadius: '999px',
                border: `2px solid ${isActive ? BLANK_THEME.accentStrong : BLANK_THEME.accentBorder}`,
                backgroundColor: isActive ? BLANK_THEME.accentSoft : 'rgba(255,255,255,0.95)',
                color: isActive ? BLANK_THEME.text : BLANK_THEME.accentStrong,
                fontWeight: 800,
                boxShadow: '0 8px 18px rgba(15, 23, 42, 0.14)',
                cursor: 'grab',
                zIndex: isActive ? 4 : 3,
              }}
            >
              Q{absoluteQuestionNumber}
            </button>
          );
        }

        return (
          <div
            key={blank.id}
            title={mode === 'edit' ? `Kéo label Q${absoluteQuestionNumber}` : undefined}
            aria-label={mode === 'edit' ? `Kéo label Q${absoluteQuestionNumber}` : undefined}
            onMouseDown={mode === 'edit' ? (event) => handleDragStart(event, 'blank', blankIndex, 'label') : undefined}
            onClick={mode === 'edit' ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              setActiveBlankIndex(blankIndex);
            } : undefined}
            style={{
              position: 'absolute',
              top: `${blank.labelY}%`,
              left: `${blank.labelX}%`,
              width: resolveRuntimeBoxWidth(blank.width),
              transform: 'translate(-2px, -2px)',
              backgroundColor: 'rgba(255,255,255,0.96)',
              border: `2px solid ${isActive ? BLANK_THEME.accentStrong : BLANK_THEME.accentBorder}`,
              borderRadius: useCompactAnswerLayout ? '10px' : '12px',
              padding: useCompactAnswerLayout ? '7px 9px' : '10px 12px',
              boxShadow: useCompactAnswerLayout ? '0 4px 10px rgba(15, 23, 42, 0.1)' : '0 8px 18px rgba(15, 23, 42, 0.14)',
              textAlign: blank.textAlign,
              pointerEvents: 'auto',
              cursor: mode === 'edit' ? 'grab' : 'auto',
              userSelect: 'none',
              zIndex: isActive ? 4 : 3,
            }}
          >
            {renderPromptWithBlank(blank, blankIndex)}
            {mode === 'edit' && (
              <button
                type="button"
                title={`Co giãn label Q${absoluteQuestionNumber}`}
                aria-label={`Co giãn label Q${absoluteQuestionNumber}`}
                onMouseDown={(event) => handleResizeStart(event, 'blank', blankIndex)}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                style={{
                  position: 'absolute',
                  right: '6px',
                  bottom: '6px',
                  width: '16px',
                  height: '16px',
                  border: 'none',
                  borderRadius: '4px',
                  background: isActive ? BLANK_THEME.accent : BLANK_THEME.accentBorder,
                  cursor: 'nwse-resize',
                  padding: 0,
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.18)',
                  backgroundImage: 'linear-gradient(135deg, transparent 0 45%, rgba(255,255,255,0.9) 45% 55%, transparent 55% 100%)',
                }}
              />
            )}
          </div>
        );
      })}

      {mode === 'edit' && renderedAnnotations
        .filter((annotation) => annotation.showArrow)
        .map((annotation, annotationIndex) => {
          const isActive = activeAnnotationIndex === annotationIndex;

          return (annotation.anchors || []).map((anchor, anchorIndex) => (
            <button
              key={`${annotation.id}-anchor-handle-${anchor.id || anchorIndex}`}
              type="button"
              title={`Kéo mũi tên ${anchorIndex + 1} của chú thích ${annotationIndex + 1}`}
              aria-label={`Kéo mũi tên ${anchorIndex + 1} của chú thích ${annotationIndex + 1}`}
              onMouseDown={(event) => handleDragStart(event, 'annotation', annotationIndex, 'anchor', anchorIndex)}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setActiveAnnotationIndex(annotationIndex);
              }}
              style={{
                position: 'absolute',
                top: `${anchor.y}%`,
                left: `${anchor.x}%`,
                width: '18px',
                height: '18px',
                transform: 'translate(-50%, -50%)',
                borderRadius: '999px',
                border: `1px solid ${isActive ? ANNOTATION_THEME.handleActiveBorder : ANNOTATION_THEME.handleBorder}`,
                background: isActive
                  ? ANNOTATION_THEME.handleActiveGradient
                  : ANNOTATION_THEME.handleGradient,
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)',
                cursor: 'grab',
                zIndex: 6,
                padding: 0,
              }}
            />
          ));
        })}

      {renderedAnnotations.map((annotation, annotationIndex) => {
        const isActive = activeAnnotationIndex === annotationIndex;

        return (
          <div
            key={annotation.id}
            title={mode === 'edit' ? `Kéo chú thích ${annotationIndex + 1}` : undefined}
            aria-label={mode === 'edit' ? `Kéo chú thích ${annotationIndex + 1}` : undefined}
            onMouseDown={mode === 'edit' ? (event) => handleDragStart(event, 'annotation', annotationIndex, 'label') : undefined}
            onClick={mode === 'edit' ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              setActiveAnnotationIndex(annotationIndex);
            } : undefined}
            style={{
              position: 'absolute',
              top: `${annotation.labelY}%`,
              left: `${annotation.labelX}%`,
              width: resolveRuntimeBoxWidth(annotation.width),
              transform: 'translate(-2px, -2px)',
              backgroundColor: 'rgba(255,255,255,0.96)',
              border: `2px solid ${isActive ? ANNOTATION_THEME.accent : ANNOTATION_THEME.accentBorder}`,
              borderRadius: useCompactAnswerLayout ? '10px' : '12px',
              padding: useCompactAnswerLayout ? '7px 9px' : '10px 12px',
              boxShadow: useCompactAnswerLayout ? '0 4px 10px rgba(15, 23, 42, 0.1)' : '0 8px 18px rgba(15, 23, 42, 0.14)',
              textAlign: annotation.textAlign,
              pointerEvents: 'auto',
              cursor: mode === 'edit' ? 'grab' : 'default',
              userSelect: 'none',
              zIndex: isActive ? 6 : 4,
              whiteSpace: 'pre-wrap',
              lineHeight: useCompactAnswerLayout ? 1.28 : 1.4,
              color: isActive ? ANNOTATION_THEME.text : '#0f172a',
            }}
          >
            {annotation.noteText}
            {mode === 'edit' && (
              <button
                type="button"
                title={`Co giãn chú thích ${annotationIndex + 1}`}
                aria-label={`Co giãn chú thích ${annotationIndex + 1}`}
                onMouseDown={(event) => handleResizeStart(event, 'annotation', annotationIndex)}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                style={{
                  position: 'absolute',
                  right: '6px',
                  bottom: '6px',
                  width: '16px',
                  height: '16px',
                  border: 'none',
                  borderRadius: '4px',
                  background: isActive ? ANNOTATION_THEME.accent : ANNOTATION_THEME.accentBorder,
                  cursor: 'nwse-resize',
                  padding: 0,
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.18)',
                  backgroundImage: 'linear-gradient(135deg, transparent 0 45%, rgba(255,255,255,0.9) 45% 55%, transparent 55% 100%)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  if (mode === 'answer' || mode === 'review') {
    return (
      <div
        style={{
          padding: '16px',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
          <span
            style={{
              padding: '6px 10px',
              borderRadius: '999px',
              backgroundColor: '#0e276f',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            Questions {baseQuestionNumber}
            {blanks.length > 1 ? `-${baseQuestionNumber + blanks.length - 1}` : ''}
          </span>

          {question?.maxWords ? (
            <span
              style={{
                padding: '6px 10px',
                borderRadius: '999px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                fontWeight: 600,
                fontSize: '12px',
              }}
            >
              No more than {question.maxWords} word(s)
            </span>
          ) : null}
        </div>

        {question?.questionText ? (
          <div
            style={{ marginBottom: '12px', lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: question.questionText }}
          />
        ) : null}

        {question?.diagramTitle ? (
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '18px', marginBottom: '12px' }}>
            {question.diagramTitle}
          </div>
        ) : null}

        <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>{boardContent}</div>

        {mode === 'review' && blanks.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '10px',
              marginTop: '16px',
            }}
          >
            {blanks.map((blank, blankIndex) => {
              const {
                absoluteQuestionNumber,
                detail,
                studentAnswer,
                correctAnswer,
              } = getBlankReviewState(blank, blankIndex);

              return (
                <div
                  key={`review-summary-${blank.id}`}
                  style={{
                    borderRadius: '12px',
                    border: '1px solid #dbeafe',
                    backgroundColor: '#f8fafc',
                    padding: '12px',
                    display: 'grid',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Q{absoluteQuestionNumber}</div>
                    {detail ? (
                      <div
                        style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          backgroundColor: detail.isCorrect ? '#dcfce7' : '#fee2e2',
                          color: detail.isCorrect ? '#166534' : '#991b1b',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {detail.isCorrect ? 'Correct' : 'Incorrect'}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Student answer
                    </div>
                    <div style={{ color: studentAnswer ? '#0f172a' : '#94a3b8', fontWeight: 600 }}>
                      {studentAnswer || 'No answer'}
                    </div>
                  </div>

                  {showCorrect ? (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Correct answer
                      </div>
                      <div style={{ color: correctAnswer ? '#166534' : '#94a3b8', fontWeight: 700 }}>
                        {correctAnswer || 'Not set'}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '18px',
        borderRadius: '14px',
        border: '2px solid #0e276f',
        backgroundColor: '#f8fbff',
        marginTop: '14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <h4 style={{ margin: 0, color: '#0e276f', fontSize: '18px' }}>Diagram Labeling</h4>
          <p style={{ margin: '6px 0 0 0', color: '#475569', fontSize: '12px' }}>
            Dùng token [NUMBER] và [BLANK] trong mỗi prompt. Có thể bấm để đặt nhanh hoặc kéo trực tiếp label và đầu mũi tên trên ảnh.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSelectionMode('label')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              backgroundColor: selectionMode === 'label' ? '#0e276f' : '#dbeafe',
              color: selectionMode === 'label' ? '#ffffff' : '#1d4ed8',
            }}
          >
            Đặt text box
          </button>
          <button
            type="button"
            onClick={() => setSelectionMode('anchor')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              backgroundColor: selectionMode === 'anchor' ? BLANK_THEME.accent : BLANK_THEME.accentSoft,
              color: selectionMode === 'anchor' ? '#ffffff' : BLANK_THEME.text,
            }}
          >
            Đặt đầu mũi tên
          </button>
          <button
            type="button"
            onClick={handleAddBlank}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              backgroundColor: BLANK_THEME.accent,
              color: '#ffffff',
            }}
          >
            Thêm label
          </button>
          <button
            type="button"
            onClick={handleAddAnnotation}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              backgroundColor: ANNOTATION_THEME.accent,
              color: '#ffffff',
            }}
          >
            Thêm chú thích
          </button>
          <button
            type="button"
            onClick={() => setShowStudentPreview((value) => !value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${BLANK_THEME.accentBorder}`,
              cursor: 'pointer',
              fontWeight: 700,
              backgroundColor: showStudentPreview ? BLANK_THEME.accentSoft : '#ffffff',
              color: showStudentPreview ? BLANK_THEME.text : '#0f172a',
            }}
          >
            {showStudentPreview ? 'Ẩn xem trước học sinh' : 'Xem trước kiểu học sinh'}
          </button>
          <button
            type="button"
            onClick={() => setShowExpandedLabels((value) => !value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              fontWeight: 700,
              backgroundColor: '#ffffff',
              color: '#0f172a',
            }}
          >
            {showExpandedLabels ? 'Ẩn nội dung Q trên hình' : 'Hiện nội dung Q trên hình'}
          </button>
          <button
            type="button"
            onClick={() => setShowAdvancedControls((value) => !value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              fontWeight: 700,
              backgroundColor: showAdvancedControls ? '#0f172a' : '#ffffff',
              color: showAdvancedControls ? '#ffffff' : '#0f172a',
            }}
          >
            {showAdvancedControls ? 'Ẩn chế độ nâng cao' : 'Hiện chế độ nâng cao'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #dbeafe', borderRadius: '12px', padding: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                  Tiêu đề diagram
                </label>
                <input
                  type="text"
                  value={question?.diagramTitle || ''}
                  onChange={(event) => emitQuestion({ diagramTitle: event.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  placeholder="Ví dụ: How a boat is lifted"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                  Giới hạn từ
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={question?.maxWords || 1}
                  onChange={(event) => emitQuestion({ maxWords: Math.max(1, Number(event.target.value) || 1) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '160px 1fr', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                  backgroundColor: isUploadingImage ? '#94a3b8' : '#0e276f',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                {isUploadingImage ? 'Đang upload...' : 'Tải ảnh lên'}
              </button>
              <input
                type="text"
                value={question?.diagramImageUrl || ''}
                onChange={(event) => emitQuestion({ diagramImageUrl: event.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                placeholder="Hoặc dán URL ảnh"
              />
            </div>

            {imageUploadError ? (
              <div style={{ marginTop: '8px', color: '#b91c1c', fontSize: '12px', fontWeight: 600 }}>
                {imageUploadError}
              </div>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />

            <div style={{ marginTop: '8px', color: '#64748b', fontSize: '12px' }}>
              Ảnh upload sẽ được lưu thành URL để tránh lỗi payload quá lớn khi tạo đề.
            </div>
          </div>

          <div style={{ overflowX: 'auto', paddingBottom: '6px' }}>
            {question?.diagramTitle ? (
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '18px', marginBottom: '12px' }}>
                {question.diagramTitle}
              </div>
            ) : null}
            {boardContent}
          </div>

          {showStudentPreview ? (
            <div
              data-testid="student-preview-panel"
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: `1px solid ${BLANK_THEME.accentBorder}`,
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <div>
                  <h5 style={{ margin: 0, color: BLANK_THEME.text, fontSize: '16px' }}>Xem trước giao diện học sinh</h5>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '12px' }}>
                    Gõ thử đáp án trực tiếp để kiểm tra bố cục và vị trí label như lúc học sinh làm bài.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStudentPreviewAnswers({})}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: `1px solid ${BLANK_THEME.accentBorder}`,
                    cursor: 'pointer',
                    backgroundColor: BLANK_THEME.accentSoft,
                    color: BLANK_THEME.text,
                    fontWeight: 700,
                  }}
                >
                  Xóa đáp án thử
                </button>
              </div>

              <DiagramLabelingQuestion
                question={question}
                mode="answer"
                questionNumber={baseQuestionNumber}
                answers={studentPreviewAnswers}
                onAnswerChange={(answerKey, value) => {
                  setStudentPreviewAnswers((current) => ({
                    ...current,
                    [answerKey]: value,
                  }));
                }}
              />
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <h5 style={{ margin: 0, color: '#0e276f', fontSize: '16px' }}>Danh sách label</h5>
                <p style={{ margin: '4px 0 0 0', color: '#475569', fontSize: '12px' }}>
                  Chỉnh prompt, đáp án và vị trí cho từng câu ngay bên dưới sơ đồ.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={collapseAllBlankCards}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    backgroundColor: '#f8fafc',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  Thu nhỏ tất cả
                </button>
                <button
                  type="button"
                  onClick={expandAllBlankCards}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  Mở rộng tất cả
                </button>
                <div style={{ color: '#475569', fontSize: '12px', fontWeight: 600 }}>
                  {blanks.length} label
                </div>
              </div>
            </div>

            {!showAdvancedControls && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: '12px',
                  lineHeight: 1.6,
                  border: '1px solid #bfdbfe',
                }}
              >
                Tọa độ Text X / Y và Arrow X / Y đang được ẩn trong giao diện thường. Dùng kéo thả trực tiếp trên hình, hoặc mở chế độ nâng cao khi cần chỉnh tay.
              </div>
            )}

            {blanks.map((blank, blankIndex) => {
              const absoluteQuestionNumber = baseQuestionNumber + blankIndex;
              const isBlankCollapsed = !!collapsedBlankCards[blank.id];
              const blankAnchors = Array.isArray(blank.anchors) && blank.anchors.length > 0
                ? blank.anchors
                : [buildDefaultAnchor(0, blank.anchorX, blank.anchorY)];
              const promptPreview = String(blank.promptHtml || '')
                .replace(/\[NUMBER\]/g, String(absoluteQuestionNumber))
                .replace(/\[BLANK\]/g, '_____')
                .replace(/\s+/g, ' ')
                .trim();

              return (
                <div
                  key={blank.id}
                  style={{
                    border: `2px solid ${activeBlankIndex === blankIndex ? BLANK_THEME.accent : BLANK_THEME.accentBorder}`,
                    borderRadius: '12px',
                    padding: '14px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: isBlankCollapsed ? '0' : '10px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveBlankIndex(blankIndex)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '999px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        backgroundColor: activeBlankIndex === blankIndex ? BLANK_THEME.accent : BLANK_THEME.accentMuted,
                        color: activeBlankIndex === blankIndex ? '#ffffff' : BLANK_THEME.text,
                      }}
                    >
                      Q{absoluteQuestionNumber}
                    </button>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => toggleBlankCard(blank.id)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          backgroundColor: '#f8fafc',
                          color: '#334155',
                          fontWeight: 700,
                        }}
                      >
                        {isBlankCollapsed ? 'Mở rộng' : 'Thu nhỏ'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveBlank(blankIndex)}
                        disabled={blanks.length <= 1}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: blanks.length <= 1 ? 'not-allowed' : 'pointer',
                          backgroundColor: blanks.length <= 1 ? '#cbd5e1' : BLANK_THEME.accentSoft,
                          color: blanks.length <= 1 ? '#64748b' : BLANK_THEME.text,
                          fontWeight: 700,
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {isBlankCollapsed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                        {promptPreview || 'Chưa có prompt'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Đáp án: {blank.correctAnswer || '(chưa có)'}
                      </div>
                    </div>
                  ) : (
                    <>

                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                        Prompt
                      </label>
                      <textarea
                        value={blank.promptHtml}
                        onChange={(event) => updateBlank(blankIndex, 'promptHtml', event.target.value)}
                        rows={3}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', resize: 'vertical' }}
                        placeholder="Ví dụ: A pair of [NUMBER] [BLANK] are lifted in order to shut out water from canal basin"
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px', marginTop: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                            Đáp án đúng
                          </label>
                          <input
                            type="text"
                            value={blank.correctAnswer || ''}
                            onChange={(event) => updateBlank(blankIndex, 'correctAnswer', event.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                            placeholder="Ví dụ: gates"
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                            Width
                          </label>
                          <input
                            type="number"
                            min="140"
                            max="420"
                            value={blank.width}
                            onChange={(event) => updateBlank(blankIndex, 'width', clampWidth(event.target.value, 220))}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                          {blankAnchors.length} mũi tên
                        </div>
                        <button
                          type="button"
                          onClick={() => addArrowToEntity('blank', blankIndex)}
                          aria-label={`Thêm mũi tên cho Q${absoluteQuestionNumber}`}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: `1px solid ${BLANK_THEME.accentBorder}`,
                            cursor: 'pointer',
                            backgroundColor: BLANK_THEME.accentSoft,
                            color: BLANK_THEME.text,
                            fontWeight: 700,
                          }}
                        >
                          Thêm mũi tên
                        </button>
                        {blankAnchors.length > 1 && blankAnchors.map((anchor, anchorIndex) => (
                          <button
                            key={anchor.id || anchorIndex}
                            type="button"
                            onClick={() => removeArrowFromEntity('blank', blankIndex, anchorIndex)}
                            aria-label={`Xóa mũi tên ${anchorIndex + 1} của Q${absoluteQuestionNumber}`}
                            style={{
                              padding: '7px 9px',
                              borderRadius: '999px',
                              border: `1px solid ${BLANK_THEME.accentBorder}`,
                              cursor: 'pointer',
                              backgroundColor: '#ffffff',
                              color: BLANK_THEME.text,
                              fontWeight: 700,
                              fontSize: '12px',
                            }}
                          >
                            Xóa mũi tên {anchorIndex + 1}
                          </button>
                        ))}
                      </div>

                      {showAdvancedControls && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                                Text X / Y
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <input
                                  type="number"
                                  value={blank.labelX}
                                  min="0"
                                  max="100"
                                  onChange={(event) => updateBlank(blankIndex, 'labelX', clampPercent(event.target.value, 10))}
                                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                />
                                <input
                                  type="number"
                                  value={blank.labelY}
                                  min="0"
                                  max="100"
                                  onChange={(event) => updateBlank(blankIndex, 'labelY', clampPercent(event.target.value, 10))}
                                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <label style={{ display: 'block', fontWeight: 700, fontSize: '13px' }}>
                                Arrow X / Y
                              </label>
                              {blankAnchors.map((anchor, anchorIndex) => (
                                <div key={anchor.id || anchorIndex} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                                  <input
                                    type="number"
                                    value={anchor.x}
                                    min="0"
                                    max="100"
                                    onChange={(event) => updateBlankPatch(blankIndex, buildAnchorPatch(blank, anchorIndex, { x: clampPercent(event.target.value, anchor.x), y: anchor.y }))}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                  />
                                  <input
                                    type="number"
                                    value={anchor.y}
                                    min="0"
                                    max="100"
                                    onChange={(event) => updateBlankPatch(blankIndex, buildAnchorPatch(blank, anchorIndex, { x: anchor.x, y: clampPercent(event.target.value, anchor.y) }))}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                  />
                                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                                    Mũi tên {anchorIndex + 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
                        <select
                          value={blank.textAlign}
                          onChange={(event) => updateBlank(blankIndex, 'textAlign', event.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>

                        <div style={{ color: '#475569', fontSize: '12px', lineHeight: 1.6 }}>
                          `[NUMBER]` chèn số câu, `[BLANK]` chèn ô điền. Nếu thiếu `[BLANK]`, hệ thống sẽ tự thêm ở cuối prompt.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div>
                  <h5 style={{ margin: 0, color: '#0e276f', fontSize: '16px' }}>Chú thích trên hình</h5>
                  <p style={{ margin: '4px 0 0 0', color: '#475569', fontSize: '12px' }}>
                    Thêm đoạn văn giải thích hoặc mô tả trên sơ đồ mà không tính là câu hỏi.
                  </p>
                </div>
                <div style={{ color: '#475569', fontSize: '12px', fontWeight: 600 }}>
                  {annotations.length} chú thích
                </div>
              </div>

              {annotations.length === 0 ? (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: `1px dashed ${ANNOTATION_THEME.accentBorder}`,
                    backgroundColor: ANNOTATION_THEME.accentSoft,
                    color: ANNOTATION_THEME.text,
                    fontSize: '12px',
                    lineHeight: 1.6,
                  }}
                >
                  Chưa có chú thích. Bấm "Thêm chú thích" để đặt đoạn văn như "Boat is raised, floating in one of Wheel's two gondolas" lên sơ đồ mà không chấm điểm.
                </div>
              ) : (
                annotations.map((annotation, annotationIndex) => (
                  <div
                    key={annotation.id}
                    style={{
                      border: `2px solid ${activeAnnotationIndex === annotationIndex ? ANNOTATION_THEME.accent : ANNOTATION_THEME.accentBorder}`,
                      borderRadius: '12px',
                      padding: '14px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {(() => {
                      const annotationAnchors = Array.isArray(annotation.anchors) && annotation.anchors.length > 0
                        ? annotation.anchors
                        : [buildDefaultAnchor(0, annotation.anchorX, annotation.anchorY)];

                      return (
                        <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setActiveAnnotationIndex(annotationIndex)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '999px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                          backgroundColor: activeAnnotationIndex === annotationIndex ? ANNOTATION_THEME.accent : ANNOTATION_THEME.accentMuted,
                          color: activeAnnotationIndex === annotationIndex ? '#ffffff' : ANNOTATION_THEME.text,
                        }}
                      >
                        Chú thích {annotationIndex + 1}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveAnnotation(annotationIndex)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: ANNOTATION_THEME.accentSoft,
                          color: '#b91c1c',
                          fontWeight: 700,
                        }}
                      >
                        Xóa
                      </button>
                    </div>

                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                      Nội dung chú thích
                    </label>
                    <textarea
                      value={annotation.noteText}
                      onChange={(event) => updateAnnotation(annotationIndex, 'noteText', event.target.value)}
                      rows={4}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', resize: 'vertical' }}
                      placeholder="Ví dụ: Boat is raised, floating in one of Wheel's two gondolas"
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={annotation.showArrow}
                          onChange={(event) => updateAnnotation(annotationIndex, 'showArrow', event.target.checked)}
                        />
                        Có mũi tên
                      </label>

                      <input
                        type="number"
                        min="140"
                        max="420"
                        value={annotation.width}
                        onChange={(event) => updateAnnotation(annotationIndex, 'width', clampWidth(event.target.value, 260))}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />

                      <select
                        value={annotation.textAlign}
                        onChange={(event) => updateAnnotation(annotationIndex, 'textAlign', event.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      >
                        <option value="left">Canh trái</option>
                        <option value="center">Canh giữa</option>
                        <option value="right">Canh phải</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                        {annotationAnchors.length} mũi tên
                      </div>
                      <button
                        type="button"
                        onClick={() => addArrowToEntity('annotation', annotationIndex)}
                        aria-label={`Thêm mũi tên cho chú thích ${annotationIndex + 1}`}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: `1px solid ${ANNOTATION_THEME.accentBorder}`,
                          cursor: 'pointer',
                          backgroundColor: ANNOTATION_THEME.accentSoft,
                          color: ANNOTATION_THEME.text,
                          fontWeight: 700,
                        }}
                      >
                        Thêm mũi tên
                      </button>
                      {annotationAnchors.length > 1 && annotationAnchors.map((anchor, anchorIndex) => (
                        <button
                          key={anchor.id || anchorIndex}
                          type="button"
                          onClick={() => removeArrowFromEntity('annotation', annotationIndex, anchorIndex)}
                          aria-label={`Xóa mũi tên ${anchorIndex + 1} của chú thích ${annotationIndex + 1}`}
                          style={{
                            padding: '7px 9px',
                            borderRadius: '999px',
                            border: `1px solid ${ANNOTATION_THEME.accentBorder}`,
                            cursor: 'pointer',
                            backgroundColor: '#ffffff',
                            color: ANNOTATION_THEME.text,
                            fontWeight: 700,
                            fontSize: '12px',
                          }}
                        >
                          Xóa mũi tên {anchorIndex + 1}
                        </button>
                      ))}
                    </div>

                    {showAdvancedControls && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginTop: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                            Text X / Y
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <input
                              type="number"
                              value={annotation.labelX}
                              min="0"
                              max="100"
                              onChange={(event) => updateAnnotation(annotationIndex, 'labelX', clampPercent(event.target.value, 62))}
                              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                            />
                            <input
                              type="number"
                              value={annotation.labelY}
                              min="0"
                              max="100"
                              onChange={(event) => updateAnnotation(annotationIndex, 'labelY', clampPercent(event.target.value, 18))}
                              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                            Arrow X / Y
                          </label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {annotationAnchors.map((anchor, anchorIndex) => (
                              <div key={anchor.id || anchorIndex} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                                <input
                                  type="number"
                                  value={anchor.x}
                                  min="0"
                                  max="100"
                                  disabled={!annotation.showArrow}
                                  onChange={(event) => updateAnnotationPatch(annotationIndex, buildAnchorPatch(annotation, anchorIndex, { x: clampPercent(event.target.value, anchor.x), y: anchor.y }))}
                                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                />
                                <input
                                  type="number"
                                  value={anchor.y}
                                  min="0"
                                  max="100"
                                  disabled={!annotation.showArrow}
                                  onChange={(event) => updateAnnotationPatch(annotationIndex, buildAnchorPatch(annotation, anchorIndex, { x: anchor.x, y: clampPercent(event.target.value, anchor.y) }))}
                                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                />
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                                  Mũi tên {anchorIndex + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                        </>
                      );
                    })()}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagramLabelingQuestion;