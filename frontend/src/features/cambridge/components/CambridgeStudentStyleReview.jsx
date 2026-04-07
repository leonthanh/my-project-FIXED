import React, { useMemo, useRef, useState } from 'react';
import { hostPath } from '../../../shared/utils/api';
import { computeQuestionStarts, getQuestionCountForSection, parseClozeBlanksFromText } from '../utils/questionNumbering';
import QuestionDisplayFactory from '../../../shared/components/questions/displays/QuestionDisplayFactory';
import createListeningStyles from '../pages/DoCambridgeListeningTest.styles';
import SignMessageDisplay from '../../../shared/components/questions/displays/SignMessageDisplay';
import LongTextMCDisplay from '../../../shared/components/questions/displays/LongTextMCDisplay';
import ClozeMCDisplay from '../../../shared/components/questions/displays/ClozeMCDisplay';
import ClozeTestDisplay from '../../../shared/components/questions/displays/ClozeTestDisplay';
import WordFormDisplay from '../../../shared/components/questions/displays/WordFormDisplay';
import InlineChoiceDisplay from '../../../shared/components/questions/displays/InlineChoiceDisplay';
import MatchingPicturesDisplay from '../../../shared/components/questions/displays/MatchingPicturesDisplay';
import ImageClozeDisplay from '../../../shared/components/questions/displays/ImageClozeDisplay';
import WordDragClozeDisplay from '../../../shared/components/questions/displays/WordDragClozeDisplay';
import StoryCompletionDisplay from '../../../shared/components/questions/displays/StoryCompletionDisplay';
import LookReadWriteDisplay from '../../../shared/components/questions/displays/LookReadWriteDisplay';
import { CambridgeQuestionDisplay } from './CambridgeQuestionCards';
import { ColourWriteStudentSection, DrawLinesQuestion, ImageTickSlideSection, LetterMatchingStudentSection } from './CambridgeListeningRuntimeSections';
import '../pages/DoCambridgeReadingTest.css';

const noop = () => {};
const EMPTY_FLAGGED_QUESTIONS = new Set();
const NO_ANSWER_TEXT = '(No answer)';
const STUDENT_ANSWER_LABEL = 'Student answer';
const CORRECT_ANSWER_LABEL = 'Correct answer';

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  introCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '20px 22px',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
  },
  introTitle: {
    margin: '0 0 8px',
    fontSize: '20px',
    fontWeight: 700,
    color: '#0f172a',
  },
  introText: {
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.7,
    color: '#475569',
  },
  reviewToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  reviewToolbarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  toolbarButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '36px',
    padding: '0 14px',
    borderRadius: '999px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  partCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '20px',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
  },
  partHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '14px',
    paddingBottom: '14px',
    borderBottom: '1px solid #e5e7eb',
  },
  partEyebrow: {
    margin: '0 0 4px',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#0e276f',
  },
  partTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: '#0f172a',
  },
  partRange: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '34px',
    padding: '0 12px',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: '13px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  partActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  partToggleButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '34px',
    padding: '0 14px',
    borderRadius: '999px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  partInstruction: {
    marginBottom: '16px',
    padding: '14px 16px',
    borderRadius: '12px',
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    color: '#334155',
    lineHeight: 1.7,
    fontSize: '14px',
  },
  collapsedNote: {
    marginTop: '6px',
    padding: '14px 16px',
    borderRadius: '12px',
    background: '#f8fafc',
    border: '1px dashed #cbd5e1',
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  partAudio: {
    width: '100%',
    marginBottom: '16px',
  },
  sectionCard: {
    marginTop: '16px',
    padding: '16px',
    borderRadius: '14px',
    background: '#fcfdff',
    border: '1px solid #e5e7eb',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '14px',
  },
  sectionTitleWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a',
  },
  sectionType: {
    margin: 0,
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  sectionRange: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '30px',
    padding: '0 10px',
    borderRadius: '999px',
    background: '#f1f5f9',
    color: '#334155',
    fontSize: '12px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  singleQuestionCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '16px',
  },
  singleQuestionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  singleQuestionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: '#0e276f',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 800,
    flexShrink: 0,
  },
  statusChip: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '26px',
    padding: '0 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'minmax(260px, 360px) minmax(0, 1fr)',
    gap: '16px',
  },
  asideCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '14px',
  },
  asideTitle: {
    margin: '0 0 10px',
    fontSize: '13px',
    fontWeight: 800,
    color: '#0e276f',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  imagePreview: {
    width: '100%',
    maxHeight: '420px',
    objectFit: 'contain',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    background: '#f8fafc',
  },
  drawImageWrap: {
    position: 'relative',
    width: '100%',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    background: '#f8fafc',
  },
  drawAnchor: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '26px',
    height: '26px',
    padding: '0 8px',
    borderRadius: '999px',
    background: '#0e276f',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 800,
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.18)',
  },
  reviewRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  reviewRowCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '14px',
  },
  reviewRowHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  reviewNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#0e276f',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 800,
    flexShrink: 0,
  },
  reviewTitle: {
    flex: 1,
    margin: 0,
    fontSize: '15px',
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.5,
  },
  reviewMeta: {
    display: 'grid',
    gap: '8px',
  },
  answerLine: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  answerLabel: {
    minWidth: '96px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#64748b',
    lineHeight: 1.6,
  },
  answerValue: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: '10px',
    fontSize: '14px',
    lineHeight: 1.6,
    background: '#f8fafc',
    color: '#0f172a',
    border: '1px solid #e5e7eb',
    wordBreak: 'break-word',
  },
  optionsBank: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  optionChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '999px',
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    color: '#0f172a',
    fontSize: '13px',
    fontWeight: 600,
  },
  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '12px',
  },
  mediaCard: {
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    background: '#ffffff',
  },
  mediaImage: {
    width: '100%',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
    display: 'block',
  },
  mcChoices: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '12px',
  },
  pictureChoices: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '14px',
  },
  mcChoice: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '14px',
    border: '2px solid #e5e7eb',
    background: '#ffffff',
  },
  mcChoiceImageWrap: {
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    background: '#f8fafc',
  },
  mcChoiceImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  mcChoiceLetter: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background: '#0e276f',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 800,
  },
  pictureChoiceCaption: {
    fontSize: '13px',
    lineHeight: 1.5,
    color: '#334155',
    textAlign: 'center',
    minHeight: '38px',
  },
  textareaWrap: {
    display: 'grid',
    gap: '14px',
  },
  textarea: {
    width: '100%',
    minHeight: '220px',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    fontSize: '15px',
    lineHeight: 1.8,
    color: '#0f172a',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  richPromptHtml: {
    fontSize: '14px',
    lineHeight: 1.7,
    color: '#334155',
  },
  sampleAnswer: {
    padding: '14px 16px',
    borderRadius: '12px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    fontSize: '14px',
    lineHeight: 1.7,
  },
  unsupported: {
    padding: '14px 16px',
    borderRadius: '12px',
    background: '#fff7ed',
    border: '1px solid #fdba74',
    color: '#9a3412',
    fontSize: '14px',
    lineHeight: 1.6,
  },
};

function resolveAsset(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(String(url))) return String(url);
  return hostPath(String(url));
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizePromptHtml(rawHtml = '') {
  const source = String(rawHtml || '').trim();
  if (!source) return '';

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return escapeHtml(source).replace(/\n/g, '<br />');
  }

  try {
    const doc = new DOMParser().parseFromString(source, 'text/html');

    doc
      .querySelectorAll('script, style, iframe, object, embed, form, link, meta')
      .forEach((node) => node.remove());

    doc.querySelectorAll('*').forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        if (attribute.name.toLowerCase().startsWith('on')) {
          element.removeAttribute(attribute.name);
        }
      });

      if (element.tagName === 'IMG') {
        const rawSrc = String(element.getAttribute('src') || '').trim();
        if (!rawSrc) {
          element.remove();
          return;
        }

        element.setAttribute('src', resolveAsset(rawSrc));
        element.setAttribute('alt', element.getAttribute('alt') || 'Writing prompt image');
        element.setAttribute('loading', 'lazy');
        element.setAttribute(
          'style',
          'display:block;max-width:100%;height:auto;border-radius:12px;margin:10px 0;border:1px solid #dbe3f0;background:#fff;'
        );
      }
    });

    doc.querySelectorAll('p').forEach((paragraph) => {
      const text = String(paragraph.textContent || '').replace(/\u00a0/g, ' ').trim();
      const hasMedia = paragraph.querySelector('img, video, audio');
      if (!text && !hasMedia) {
        paragraph.remove();
        return;
      }
      paragraph.setAttribute('style', 'margin:0 0 8px;line-height:1.7;');
    });

    const html = String(doc.body.innerHTML || '').trim();
    return html || escapeHtml(source).replace(/\n/g, '<br />');
  } catch {
    return escapeHtml(source).replace(/\n/g, '<br />');
  }
}

function getExamType(testType) {
  return String(testType || '').split('-')[0].trim().toUpperCase();
}

function hasAnchors(question) {
  return Boolean(question?.anchors && Object.keys(question.anchors || {}).length > 0);
}

function getSectionType(section) {
  const q0 = section?.questions?.[0] || {};
  const rawType = section?.questionType || q0?.questionType || q0?.type || '';

  if (rawType === 'letter-matching' || (Array.isArray(q0?.people) && q0.people.length > 0 && q0?.questionType === 'letter-matching')) {
    return 'letter-matching';
  }

  if (rawType === 'draw-lines' || ((rawType === 'matching' || !rawType) && hasAnchors(q0))) {
    return 'draw-lines';
  }

  if (rawType === 'matching' && Array.isArray(q0?.leftItems)) {
    return 'gap-match';
  }

  return (
    rawType ||
    (hasAnchors(q0) ? 'draw-lines' : '') ||
    (Array.isArray(q0?.imageOptions) ? 'multiple-choice-pictures' : '') ||
    (Array.isArray(q0?.people) ? (q0?.questionType === 'letter-matching' ? 'letter-matching' : 'people-matching') : '') ||
    (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
    (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
    ''
  );
}

function getSectionDisplayName(sectionType) {
  const labels = {
    fill: 'Fill In The Blank',
    abc: 'Multiple Choice',
    'multiple-choice-pictures': 'Multiple Choice Pictures',
    'sign-message': 'Sign Message',
    'people-matching': 'People Matching',
    'long-text-mc': 'Reading Passage',
    'cloze-mc': 'Cloze Multiple Choice',
    'cloze-test': 'Open Cloze',
    'gap-match': 'Matching',
    'word-form': 'Word Form',
    'matching-pictures': 'Matching Pictures',
    'image-cloze': 'Image Cloze',
    'word-drag-cloze': 'Word Drag Cloze',
    'inline-choice': 'Inline Choice',
    'short-message': 'Writing Task',
    'story-writing': 'Story Writing',
    'story-completion': 'Story Completion',
    'look-read-write': 'Look, Read and Write',
    'draw-lines': 'Draw Lines',
    'letter-matching': 'Letter Matching',
    'image-tick': 'Image Tick',
    'colour-write': 'Colour and Write',
  };

  return labels[sectionType] || sectionType || 'Section';
}

function questionCountForQuestion(sectionType, question) {
  if (!question || typeof question !== 'object') return 0;
  const isLegacyDrawLines = sectionType === 'matching' && hasAnchors(question);

  if (sectionType === 'long-text-mc') return Array.isArray(question.questions) ? question.questions.length : 0;
  if (sectionType === 'cloze-mc' || sectionType === 'inline-choice') return Array.isArray(question.blanks) ? question.blanks.length : 0;
  if (sectionType === 'cloze-test') {
    if (Array.isArray(question.blanks) && question.blanks.length > 0) return question.blanks.length;
    if (Array.isArray(question.answers) && question.answers.length > 0) return question.answers.length;
    if (question.answers && typeof question.answers === 'object') return Object.keys(question.answers).length;
    return parseClozeBlanksFromText(question.passageText || question.passage || question.clozeText || '', 1).length;
  }
  if (sectionType === 'people-matching') return Array.isArray(question.people) ? question.people.length : 0;
  if (sectionType === 'gap-match' || (sectionType === 'matching' && !isLegacyDrawLines)) {
    return Array.isArray(question.leftItems) ? question.leftItems.length : 0;
  }
  if (sectionType === 'word-form') return Array.isArray(question.sentences) ? question.sentences.length : 0;
  if (sectionType === 'matching-pictures') return Array.isArray(question.prompts) ? question.prompts.length : 0;
  if (sectionType === 'image-cloze') {
    const blanks = parseClozeBlanksFromText(question.passageText || '', 1).length;
    return blanks + (question.titleQuestion?.enabled ? 1 : 0);
  }
  if (sectionType === 'word-drag-cloze') return Array.isArray(question.blanks) ? question.blanks.length : 0;
  if (sectionType === 'story-completion') return Array.isArray(question.items) ? question.items.length : 0;
  if (sectionType === 'look-read-write') {
    return (question.groups || []).reduce((sum, group) => sum + (Array.isArray(group?.items) ? group.items.length : 0), 0);
  }
  if (sectionType === 'draw-lines' || isLegacyDrawLines) {
    return Array.isArray(question.leftItems)
      ? question.leftItems.slice(1).filter((item) => String(item || '').trim()).length
      : 0;
  }
  if (sectionType === 'letter-matching') {
    return Array.isArray(question.people)
      ? question.people.slice(1).filter((person) => String(person?.name || '').trim()).length
      : 0;
  }
  if (sectionType === 'short-message' || sectionType === 'story-writing') return 0;

  return 1;
}

function getWritingAnswer(answers, partIdx, secIdx, qIdx) {
  return (
    answers?.[`${partIdx}-${secIdx}-${qIdx}`] ||
    answers?.[`${partIdx}-${secIdx}-0`] ||
    ''
  );
}

function getWritingDetailedResult(detailedResults, partIdx, secIdx, qIdx) {
  return (
    detailedResults?.[`${partIdx}-${secIdx}-${qIdx}`] ||
    detailedResults?.[`${partIdx}-${secIdx}-0`] ||
    null
  );
}

function buildWritingPromptHtml(sectionType, question, detailedResult) {
  const detailedPrompt =
    typeof detailedResult?.questionText === 'string' ? detailedResult.questionText.trim() : '';

  if (detailedPrompt) {
    return sanitizePromptHtml(detailedPrompt);
  }

  if (sectionType === 'short-message') {
    const fallback =
      question?.situation ||
      question?.questionText ||
      question?.prompt ||
      '';
    return fallback ? sanitizePromptHtml(fallback) : '';
  }

  if (sectionType === 'story-writing') {
    const promptParts = [];

    if (typeof question?.prompt === 'string' && question.prompt.trim()) {
      promptParts.push(`<p>${escapeHtml(question.prompt.trim())}</p>`);
    }

    const images = Array.isArray(question?.images)
      ? question.images.filter(Boolean)
      : Array.isArray(question?.imageUrls)
        ? question.imageUrls.filter(Boolean)
        : [];

    if (images.length) {
      promptParts.push(
        `<div>${images
          .map((imageUrl) => `<img src="${escapeHtml(resolveAsset(imageUrl))}" alt="Story prompt" />`)
          .join('')}</div>`
      );
    }

    const bulletPoints = Array.isArray(question?.bulletPoints)
      ? question.bulletPoints.map((point) => String(point || '').trim()).filter(Boolean)
      : [];

    if (bulletPoints.length) {
      promptParts.push(
        `<div><strong>Write about:</strong><ul>${bulletPoints
          .map((point) => `<li>${escapeHtml(point)}</li>`)
          .join('')}</ul></div>`
      );
    }

    if (!promptParts.length && question?.questionText) {
      promptParts.push(`<p>${escapeHtml(question.questionText)}</p>`);
    }

    return sanitizePromptHtml(promptParts.join(''));
  }

  const fallback =
    question?.questionText ||
    question?.prompt ||
    question?.situation ||
    question?.openingSentence ||
    '';

  return fallback ? sanitizePromptHtml(`<p>${escapeHtml(fallback)}</p>`) : '';
}

function getPictureOptions(question) {
  const rawOptions = (() => {
    if (Array.isArray(question?.imageOptions) && question.imageOptions.length > 0) return question.imageOptions;
    if (Array.isArray(question?.options) && question.options.length > 0) return question.options;
    if (Array.isArray(question?.images) && question.images.length > 0) return question.images;
    return [];
  })();

  return rawOptions.map((option) => {
    if (!option) return {};
    if (typeof option === 'string') {
      return { imageUrl: option, label: '' };
    }

    return {
      ...option,
      imageUrl: option.imageUrl || option.image || option.url || option.src || option.path || '',
      label: option.label || option.text || option.caption || option.title || '',
    };
  });
}

function getResultStatus(result) {
  const isBlank = !result || result.userAnswer === null || result.userAnswer === undefined || result.userAnswer === '';

  if (result?.isCorrect === null && !isBlank) {
    return {
      label: 'Pending review',
      background: '#e0f2fe',
      color: '#075985',
      border: '#7dd3fc',
    };
  }

  if (result?.isCorrect === true) {
    return {
      label: 'Correct',
      background: '#dcfce7',
      color: '#166534',
      border: '#22c55e',
    };
  }

  if (isBlank) {
    return {
      label: 'Blank',
      background: '#f1f5f9',
      color: '#475569',
      border: '#cbd5e1',
    };
  }

  return {
    label: 'Wrong',
    background: '#fee2e2',
    color: '#991b1b',
    border: '#ef4444',
  };
}

function hasIntegratedLookReadWriteWriting(part) {
  return (part?.sections || []).some((section) => {
    if (section?.questionType !== 'look-read-write') return false;
    return (section.questions || []).some((question) =>
      Array.isArray(question?.groups) &&
      question.groups.some((group) => group?.type === 'write' && Array.isArray(group?.items) && group.items.length > 0)
    );
  });
}

function SectionShell({ title, typeLabel, rangeLabel, children }) {
  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitleWrap}>
          <h4 style={styles.sectionTitle}>{title}</h4>
          <p style={styles.sectionType}>{typeLabel}</p>
        </div>
        {rangeLabel ? <span style={styles.sectionRange}>{rangeLabel}</span> : null}
      </div>
      {children}
    </div>
  );
}

function FillOrChoiceQuestion({ section, question, partIdx, secIdx, qIdx, questionNumber, answers, examType, testType }) {
  return (
    <div style={styles.singleQuestionCard}>
      <div style={styles.singleQuestionHeader}>
        <span style={styles.singleQuestionBadge}>{questionNumber}</span>
      </div>
      <QuestionDisplayFactory
        section={{
          ...section,
          id: `${partIdx}-${secIdx}`,
          questions: [question],
        }}
        questionType={section.questionType === 'colour-write' ? 'fill' : section.questionType}
        startingNumber={questionNumber}
        onAnswerChange={noop}
        answers={answers}
        submitted
        questionIndex={qIdx}
        examType={examType}
        testType={testType}
      />
    </div>
  );
}

function ListeningRuntimeQuestionReview({
  question,
  answerKey,
  questionNumber,
  answers,
  detailedResults,
  listeningStyles,
  questionRefs,
  currentPart,
  drawLinesComponent,
}) {
  const reviewQuestion = question?.correctAnswer || !detailedResults?.[answerKey]?.correctAnswer
    ? question
    : {
        ...question,
        correctAnswer: detailedResults[answerKey].correctAnswer,
      };

  return (
    <CambridgeQuestionDisplay
      question={reviewQuestion}
      questionKey={answerKey}
      questionNum={questionNumber}
      answers={answers}
      submitted
      results={{ answers: detailedResults }}
      activeQuestion={null}
      styles={listeningStyles}
      handleAnswerChange={noop}
      toggleFlag={noop}
      flaggedQuestions={EMPTY_FLAGGED_QUESTIONS}
      isDarkMode={false}
      currentPart={currentPart || null}
      questionRefs={questionRefs}
      resolveImgSrc={resolveAsset}
      DrawLinesComponent={drawLinesComponent}
      allowFlagging={false}
    />
  );
}

function PeopleMatchingReview({ question, partIdx, secIdx, sectionStart, answers, detailedResults }) {
  const people = Array.isArray(question?.people) ? question.people : [];
  const texts = Array.isArray(question?.texts) ? question.texts : [];
  const answerMap = question?.answers && typeof question.answers === 'object' ? question.answers : {};

  const getPersonId = (person, idx) => String(person?.id || String.fromCharCode(65 + idx));

  return (
    <div style={styles.twoColumn}>
      <div style={styles.asideCard}>
        <h5 style={styles.asideTitle}>People</h5>
        <div style={styles.reviewRows}>
          {people.map((person, idx) => {
            const personId = getPersonId(person, idx);
            const answerKey = `${partIdx}-${secIdx}-${personId}`;
            const result = detailedResults?.[answerKey] || null;
            const studentAnswer = answers?.[answerKey] || '';
            const correctAnswer = answerMap?.[personId] || result?.correctAnswer || '';
            const status = getResultStatus({ ...result, userAnswer: studentAnswer, correctAnswer });

            return (
              <div key={answerKey} style={styles.reviewRowCard}>
                <div style={styles.reviewRowHeader}>
                  <span style={styles.reviewNumber}>{sectionStart + idx}</span>
                  <h5 style={styles.reviewTitle}>{person?.name || `Person ${personId}`}</h5>
                  <span style={{ ...styles.statusChip, background: status.background, color: status.color }}>
                    {status.label}
                  </span>
                </div>

                {person?.imageUrl ? (
                  <div style={{ marginBottom: '10px' }}>
                    <img src={resolveAsset(person.imageUrl)} alt={person?.name || personId} style={{ ...styles.imagePreview, maxHeight: '180px' }} />
                  </div>
                ) : null}

                {person?.need ? (
                  <div style={{ marginBottom: '10px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
                    {person.need}
                  </div>
                ) : null}

                <div style={styles.reviewMeta}>
                  <div style={styles.answerLine}>
                    <span style={styles.answerLabel}>{STUDENT_ANSWER_LABEL}</span>
                    <span style={{ ...styles.answerValue, background: status.background, color: status.color, borderColor: status.border }}>
                      {studentAnswer || NO_ANSWER_TEXT}
                    </span>
                  </div>
                  {correctAnswer ? (
                    <div style={styles.answerLine}>
                      <span style={styles.answerLabel}>{CORRECT_ANSWER_LABEL}</span>
                      <span style={{ ...styles.answerValue, background: '#dcfce7', color: '#166534', borderColor: '#22c55e' }}>
                        {correctAnswer}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.asideCard}>
        <h5 style={styles.asideTitle}>{question?.textsTitle || 'Texts'}</h5>
        <div style={styles.reviewRows}>
          {texts.map((text, idx) => {
            const label = String(text?.id || String.fromCharCode(65 + idx));
            return (
              <div key={label} style={styles.reviewRowCard}>
                <div style={styles.reviewRowHeader}>
                  <span style={styles.reviewNumber}>{label}</span>
                  <h5 style={styles.reviewTitle}>{text?.title || text?.label || `Text ${label}`}</h5>
                </div>
                <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
                  {text?.content || text?.text || String(text || '')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GapMatchReview({ question, partIdx, secIdx, sectionStart, answers, detailedResults }) {
  const leftItems = Array.isArray(question?.leftItems) ? question.leftItems : [];
  const options = Array.isArray(question?.options) ? question.options : [];
  const correctAnswers = Array.isArray(question?.correctAnswers) ? question.correctAnswers : [];

  return (
    <div style={styles.twoColumn}>
      <div style={styles.asideCard}>
        <h5 style={styles.asideTitle}>{question?.leftTitle || 'Prompts'}</h5>
        <div style={styles.reviewRows}>
          {leftItems.map((item, idx) => {
            const answerKey = `${partIdx}-${secIdx}-0-${idx}`;
            const result = detailedResults?.[answerKey] || null;
            const studentAnswer = answers?.[answerKey] || '';
            const correctAnswer = correctAnswers?.[idx] || result?.correctAnswer || '';
            const status = getResultStatus({ ...result, userAnswer: studentAnswer, correctAnswer });

            return (
              <div key={answerKey} style={styles.reviewRowCard}>
                <div style={styles.reviewRowHeader}>
                  <span style={styles.reviewNumber}>{sectionStart + idx}</span>
                  <h5 style={styles.reviewTitle}>{item || `Item ${idx + 1}`}</h5>
                  <span style={{ ...styles.statusChip, background: status.background, color: status.color }}>
                    {status.label}
                  </span>
                </div>

                <div style={styles.reviewMeta}>
                  <div style={styles.answerLine}>
                    <span style={styles.answerLabel}>{STUDENT_ANSWER_LABEL}</span>
                    <span style={{ ...styles.answerValue, background: status.background, color: status.color, borderColor: status.border }}>
                      {studentAnswer || NO_ANSWER_TEXT}
                    </span>
                  </div>
                  {correctAnswer ? (
                    <div style={styles.answerLine}>
                      <span style={styles.answerLabel}>{CORRECT_ANSWER_LABEL}</span>
                      <span style={{ ...styles.answerValue, background: '#dcfce7', color: '#166534', borderColor: '#22c55e' }}>
                        {correctAnswer}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.asideCard}>
        <h5 style={styles.asideTitle}>{question?.rightTitle || 'Options'}</h5>
        <div style={styles.optionsBank}>
          {options.map((option) => (
            <span key={option} style={styles.optionChip}>{option}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DrawLinesReview({ part, question, partIdx, secIdx, sectionStart, answers, detailedResults }) {
  const leftItems = Array.isArray(question?.leftItems) ? question.leftItems : [];
  const anchors = question?.anchors && typeof question.anchors === 'object' ? question.anchors : {};
  const anchorLabels = question?.answers && typeof question.answers === 'object' ? question.answers : {};
  const imageUrl = part?.imageUrl || question?.imageUrl || '';

  return (
    <div style={styles.twoColumn}>
      <div style={styles.asideCard}>
        <h5 style={styles.asideTitle}>Students</h5>
        <div style={styles.reviewRows}>
          {leftItems.slice(1).map((name, rowIdx) => {
            const nameIdx = rowIdx + 1;
            const answerKey = `${partIdx}-${secIdx}-0-${nameIdx}`;
            const result = detailedResults?.[answerKey] || null;
            const studentAnswer = answers?.[answerKey] || '';
            const correctAnswer = result?.correctAnswer || '';
            const status = getResultStatus({ ...result, userAnswer: studentAnswer, correctAnswer });

            return (
              <div key={answerKey} style={styles.reviewRowCard}>
                <div style={styles.reviewRowHeader}>
                  <span style={styles.reviewNumber}>{sectionStart + rowIdx}</span>
                  <h5 style={styles.reviewTitle}>{name}</h5>
                  <span style={{ ...styles.statusChip, background: status.background, color: status.color }}>
                    {status.label}
                  </span>
                </div>

                <div style={styles.reviewMeta}>
                  <div style={styles.answerLine}>
                    <span style={styles.answerLabel}>Student match</span>
                    <span style={{ ...styles.answerValue, background: status.background, color: status.color, borderColor: status.border }}>
                      {studentAnswer || NO_ANSWER_TEXT}
                    </span>
                  </div>
                  {correctAnswer ? (
                    <div style={styles.answerLine}>
                      <span style={styles.answerLabel}>{CORRECT_ANSWER_LABEL}</span>
                      <span style={{ ...styles.answerValue, background: '#dcfce7', color: '#166534', borderColor: '#22c55e' }}>
                        {correctAnswer}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.asideCard}>
        <h5 style={styles.asideTitle}>Picture</h5>
        {imageUrl ? (
          <div style={styles.drawImageWrap}>
            <img src={resolveAsset(imageUrl)} alt={part?.partTitle || 'Part illustration'} style={styles.imagePreview} />
            {Object.entries(anchors).map(([anchorId, position]) => (
              <span
                key={anchorId}
                style={{
                  ...styles.drawAnchor,
                  left: `${position?.x || 0}%`,
                  top: `${position?.y || 0}%`,
                }}
              >
                {anchorId === '0' ? 'Ex' : (anchorLabels?.[anchorId] || anchorId)}
              </span>
            ))}
          </div>
        ) : (
          <div style={styles.unsupported}>No image is available for this part.</div>
        )}
      </div>
    </div>
  );
}

function LetterMatchingReview({ question, partIdx, secIdx, sectionStart, answers, detailedResults }) {
  const people = Array.isArray(question?.people) ? question.people : [];
  const options = Array.isArray(question?.options) ? question.options : [];

  const resolveOption = (letter) => {
    const option = options.find((item) => String(item?.letter || '').toUpperCase() === String(letter || '').toUpperCase());
    if (!option) return letter;
    return `${option.letter} - ${option.text || option.label || ''}`.trim();
  };

  return (
    <div style={styles.twoColumn}>
      <div style={styles.asideCard}>
        <h5 style={styles.asideTitle}>People</h5>
        <div style={styles.reviewRows}>
          {people.slice(1).map((person, rowIdx) => {
            const personIdx = rowIdx + 1;
            const answerKey = `${partIdx}-${secIdx}-0-${personIdx}`;
            const result = detailedResults?.[answerKey] || null;
            const studentAnswer = answers?.[answerKey] || '';
            const correctAnswer = result?.correctAnswer || person?.correctAnswer || '';
            const status = getResultStatus({ ...result, userAnswer: studentAnswer, correctAnswer });

            return (
              <div key={answerKey} style={styles.reviewRowCard}>
                <div style={styles.reviewRowHeader}>
                  <span style={styles.reviewNumber}>{sectionStart + rowIdx}</span>
                  <h5 style={styles.reviewTitle}>{person?.name || `Person ${personIdx}`}</h5>
                  <span style={{ ...styles.statusChip, background: status.background, color: status.color }}>
                    {status.label}
                  </span>
                </div>

                <div style={styles.reviewMeta}>
                  <div style={styles.answerLine}>
                    <span style={styles.answerLabel}>{STUDENT_ANSWER_LABEL}</span>
                    <span style={{ ...styles.answerValue, background: status.background, color: status.color, borderColor: status.border }}>
                      {studentAnswer ? resolveOption(studentAnswer) : NO_ANSWER_TEXT}
                    </span>
                  </div>
                  {correctAnswer ? (
                    <div style={styles.answerLine}>
                      <span style={styles.answerLabel}>{CORRECT_ANSWER_LABEL}</span>
                      <span style={{ ...styles.answerValue, background: '#dcfce7', color: '#166534', borderColor: '#22c55e' }}>
                        {resolveOption(correctAnswer)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.asideCard}>
        <h5 style={styles.asideTitle}>Options</h5>
        <div style={styles.reviewRows}>
          {options.map((option) => (
            <div key={option?.letter || option?.text} style={styles.reviewRowCard}>
              <div style={styles.reviewRowHeader}>
                <span style={styles.reviewNumber}>{option?.letter || '?'}</span>
                <h5 style={styles.reviewTitle}>{option?.text || option?.label || ''}</h5>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImageTickReview({ section, partIdx, secIdx, sectionStart, answers, detailedResults }) {
  return (
    <div style={styles.reviewRows}>
      {(section?.questions || []).map((question, qIdx) => {
        const answerKey = `${partIdx}-${secIdx}-${qIdx}`;
        const result = detailedResults?.[answerKey] || null;
        const studentAnswer = answers?.[answerKey] || '';
        const correctAnswer = result?.correctAnswer || question?.correctAnswer || '';
        const status = getResultStatus({ ...result, userAnswer: studentAnswer, correctAnswer });
        const options = Array.isArray(question?.imageOptions) ? question.imageOptions : [];

        return (
          <div key={answerKey} style={styles.reviewRowCard}>
            <div style={styles.reviewRowHeader}>
              <span style={styles.reviewNumber}>{sectionStart + qIdx}</span>
              <h5 style={styles.reviewTitle}>{question?.questionText || `Question ${sectionStart + qIdx}`}</h5>
              <span style={{ ...styles.statusChip, background: status.background, color: status.color }}>
                {status.label}
              </span>
            </div>

            <div style={styles.mcChoices}>
              {['A', 'B', 'C'].map((letter, idx) => {
                const option = options[idx] || {};
                const isSelected = studentAnswer === letter;
                const isCorrect = correctAnswer === letter;

                let borderColor = '#e5e7eb';
                let background = '#ffffff';
                if (isCorrect) {
                  borderColor = '#22c55e';
                  background = '#f0fdf4';
                }
                if (isSelected && !isCorrect) {
                  borderColor = '#ef4444';
                  background = '#fef2f2';
                }

                return (
                  <div key={`${answerKey}-${letter}`} style={{ ...styles.mcChoice, borderColor, background }}>
                    <div style={styles.mcChoiceImageWrap}>
                      {option?.imageUrl ? (
                        <img src={resolveAsset(option.imageUrl)} alt={letter} style={styles.mcChoiceImage} />
                      ) : null}
                    </div>
                    <span style={styles.mcChoiceLetter}>{letter}</span>
                    {isCorrect ? <span style={{ ...styles.statusChip, background: '#dcfce7', color: '#166534' }}>Correct</span> : null}
                    {isSelected && !isCorrect ? <span style={{ ...styles.statusChip, background: '#fee2e2', color: '#991b1b' }}>Selected by student</span> : null}
                  </div>
                );
              })}
            </div>

            {correctAnswer && studentAnswer !== correctAnswer ? (
              <div style={{ marginTop: '12px' }}>
                <div style={styles.answerLine}>
                  <span style={styles.answerLabel}>{CORRECT_ANSWER_LABEL}</span>
                  <span style={{ ...styles.answerValue, background: '#dcfce7', color: '#166534', borderColor: '#22c55e' }}>
                    {correctAnswer}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function MultipleChoicePicturesReview({ section, partIdx, secIdx, sectionStart, answers, detailedResults }) {
  return (
    <div style={styles.reviewRows}>
      {(section?.questions || []).map((question, qIdx) => {
        const answerKey = `${partIdx}-${secIdx}-${qIdx}`;
        const result = detailedResults?.[answerKey] || null;
        const studentAnswer = answers?.[answerKey] || '';
        const correctAnswer = result?.correctAnswer || question?.correctAnswer || '';
        const status = getResultStatus({ ...result, userAnswer: studentAnswer, correctAnswer });
        const options = getPictureOptions(question);

        return (
          <div key={answerKey} style={styles.reviewRowCard}>
            <div style={styles.reviewRowHeader}>
              <span style={styles.reviewNumber}>{sectionStart + qIdx}</span>
              <h5 style={styles.reviewTitle}>{question?.questionText || `Question ${sectionStart + qIdx}`}</h5>
              <span style={{ ...styles.statusChip, background: status.background, color: status.color }}>
                {status.label}
              </span>
            </div>

            <div style={styles.pictureChoices}>
              {['A', 'B', 'C'].map((letter, idx) => {
                const option = options[idx] || {};
                const isSelected = studentAnswer === letter;
                const isCorrect = correctAnswer === letter;

                let borderColor = '#e5e7eb';
                let background = '#ffffff';
                if (isCorrect) {
                  borderColor = '#22c55e';
                  background = '#f0fdf4';
                }
                if (isSelected && !isCorrect) {
                  borderColor = '#ef4444';
                  background = '#fef2f2';
                }

                return (
                  <div key={`${answerKey}-${letter}`} style={{ ...styles.mcChoice, borderColor, background }}>
                    <div style={{ ...styles.mcChoiceImageWrap, aspectRatio: '5 / 4' }}>
                      {option?.imageUrl ? (
                        <img src={resolveAsset(option.imageUrl)} alt={letter} style={{ ...styles.mcChoiceImage, objectFit: 'contain', background: '#ffffff' }} />
                      ) : null}
                    </div>
                    <span style={styles.mcChoiceLetter}>{letter}</span>
                    <div style={styles.pictureChoiceCaption}>{option?.label || ''}</div>
                    {isCorrect ? <span style={{ ...styles.statusChip, background: '#dcfce7', color: '#166534' }}>Correct answer</span> : null}
                    {isSelected && !isCorrect ? <span style={{ ...styles.statusChip, background: '#fee2e2', color: '#991b1b' }}>Selected by student</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WritingTaskReview({ sectionType, question, userAnswer, detailedResult, questionNumber }) {
  const wordLimit = question?.wordLimit || {};
  const status = getResultStatus({ ...detailedResult, userAnswer: userAnswer || '' });
  const promptHtml = buildWritingPromptHtml(sectionType, question, detailedResult);
  const title = sectionType === 'short-message' ? 'Writing Task' : 'Story Writing';

  return (
    <div style={styles.textareaWrap}>
      <div style={styles.asideCard}>
        <div style={styles.reviewRowHeader}>
          <span style={styles.reviewNumber}>{questionNumber || 'W'}</span>
          <h5 style={styles.reviewTitle}>{title}</h5>
          <span style={{ ...styles.statusChip, background: status.background, color: status.color }}>
            {status.label}
          </span>
        </div>
        <h5 style={styles.asideTitle}>Writing Prompt</h5>
        {promptHtml ? (
          <div style={styles.richPromptHtml} dangerouslySetInnerHTML={{ __html: promptHtml }} />
        ) : null}
        {(wordLimit.min || wordLimit.max) ? (
          <div style={{ marginTop: '10px', fontSize: '13px', color: '#64748b' }}>
            Word limit: {wordLimit.min || 0} - {wordLimit.max || '...'} words
          </div>
        ) : null}
      </div>

      <textarea style={styles.textarea} value={userAnswer || ''} readOnly />

      {question?.sampleAnswer ? (
        <div style={styles.sampleAnswer}>
          <strong>Sample answer:</strong>
          <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{question.sampleAnswer}</div>
        </div>
      ) : null}
    </div>
  );
}

export default function CambridgeStudentStyleReview({ test, submission }) {
  const testType = submission?.testType || '';
  const examType = getExamType(testType);
  const isListeningTest = /listening/i.test(testType);
  const answers = submission?.answers && typeof submission.answers === 'object' ? submission.answers : {};
  const detailedResults = submission?.detailedResults && typeof submission.detailedResults === 'object'
    ? submission.detailedResults
    : {};
  const [expandedParts, setExpandedParts] = useState({});
  const questionRefs = useRef({});

  const questionStarts = useMemo(() => computeQuestionStarts(test?.parts || []), [test?.parts]);
  const listeningStyles = useMemo(() => createListeningStyles(false, examType), [examType]);
  const runtimeResults = useMemo(() => ({ answers: detailedResults }), [detailedResults]);

  const setAllPartsExpanded = (expanded) => {
    const next = {};
    (test?.parts || []).forEach((_, partIdx) => {
      next[partIdx] = expanded;
    });
    setExpandedParts(next);
  };

  const togglePart = (partIdx) => {
    setExpandedParts((prev) => ({
      ...prev,
      [partIdx]: !(prev[partIdx] ?? true),
    }));
  };

  if (!test?.parts || !Array.isArray(test.parts) || test.parts.length === 0) {
    return (
      <div style={styles.introCard}>
        <h3 style={styles.introTitle}>Student-style review</h3>
        <p style={styles.introText}>The original test data is not available for this submission.</p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.introCard}>
        <h3 style={styles.introTitle}>Original student layout</h3>
        <p style={styles.introText}>
          This view rebuilds the test in the same structure students saw during the attempt. Saved answers remain in place, and many question types also show the correct answer when the response was wrong.
        </p>
      </div>

      <div style={styles.reviewToolbar}>
        <div style={styles.reviewToolbarGroup}>
          <span style={styles.introText}>You can collapse each part to keep the teacher review more compact.</span>
        </div>
        <div style={styles.reviewToolbarGroup}>
          <button type="button" style={styles.toolbarButton} onClick={() => setAllPartsExpanded(true)}>
            Expand all parts
          </button>
          <button type="button" style={styles.toolbarButton} onClick={() => setAllPartsExpanded(false)}>
            Collapse all parts
          </button>
        </div>
      </div>

      {test.parts.map((part, partIdx) => {
        const partRangeSections = (part.sections || []).filter((section) => getQuestionCountForSection(section) > 0);
        const firstSectionIdx = part.sections?.findIndex((section) => getQuestionCountForSection(section) > 0);
        const firstNumber = firstSectionIdx >= 0 ? questionStarts.sectionStart[`${partIdx}-${firstSectionIdx}`] : null;
        const partQuestionCount = partRangeSections.reduce((sum, section) => sum + getQuestionCountForSection(section), 0);
        const partRangeLabel = Number.isFinite(firstNumber) && partQuestionCount > 0
          ? partQuestionCount === 1
            ? `Question ${firstNumber}`
            : `Questions ${firstNumber}-${firstNumber + partQuestionCount - 1}`
          : 'Writing';
        const integratedWriting = examType === 'MOVERS' && hasIntegratedLookReadWriteWriting(part);
        const visibleSections = (part.sections || []).filter((section) => {
          const sectionType = getSectionType(section);
          const isStandaloneWriting = sectionType === 'short-message' || sectionType === 'story-writing';
          return !(integratedWriting && isStandaloneWriting);
        });
        const standaloneWritingOnly =
          visibleSections.length > 0 &&
          visibleSections.every((section) => {
            const sectionType = getSectionType(section);
            return sectionType === 'short-message' || sectionType === 'story-writing';
          });
        const isExpanded = expandedParts[partIdx] ?? true;

        return (
          <div key={`part-${partIdx}`} style={styles.partCard}>
            <div style={styles.partHeader}>
              <div>
                <p style={styles.partEyebrow}>Part {partIdx + 1}</p>
                <h3 style={styles.partTitle}>{part.partTitle || `Part ${partIdx + 1}`}</h3>
              </div>
              <div style={styles.partActions}>
                <span style={styles.partRange}>{partRangeLabel}</span>
                <button type="button" style={styles.partToggleButton} onClick={() => togglePart(partIdx)}>
                  {isExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>

            {isExpanded && part.instruction && !standaloneWritingOnly ? (
              <div style={styles.partInstruction} dangerouslySetInnerHTML={{ __html: part.instruction }} />
            ) : null}

            {isExpanded && part.audioUrl ? (
              <audio controls preload="metadata" src={resolveAsset(part.audioUrl)} style={styles.partAudio} />
            ) : null}

            {!isExpanded ? (
              <div style={styles.collapsedNote}>
                This part is collapsed. Select Expand to reopen the student layout and answer review.
              </div>
            ) : (part.sections || []).map((section, secIdx) => {
              const sectionType = getSectionType(section);
              const isStandaloneWriting = sectionType === 'short-message' || sectionType === 'story-writing';
              if (integratedWriting && isStandaloneWriting) return null;

              const sectionStart = questionStarts.sectionStart[`${partIdx}-${secIdx}`] || 1;
              const questionCount = getQuestionCountForSection(section);
              const rangeLabel = questionCount > 0
                ? questionCount === 1
                  ? `Question ${sectionStart}`
                  : `Questions ${sectionStart}-${sectionStart + questionCount - 1}`
                : 'Writing task';

              let questionCursor = sectionStart;
              const content = (section.questions || []).map((question, qIdx) => {
                const questionStart = questionCursor;
                questionCursor += questionCountForQuestion(sectionType, question);

                if (sectionType === 'sign-message') {
                  const answerKey = `${partIdx}-${secIdx}-${qIdx}`;
                  return (
                    <SignMessageDisplay
                      key={answerKey}
                      question={question}
                      questionNumber={questionStart}
                      onAnswerChange={noop}
                      userAnswer={answers?.[answerKey] || ''}
                      submitted
                    />
                  );
                }

                if (sectionType === 'long-text-mc') {
                  return (
                    <LongTextMCDisplay
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      section={{ ...question, id: `${partIdx}-${secIdx}-${qIdx}` }}
                      startingNumber={questionStart}
                      onAnswerChange={noop}
                      answers={answers}
                      submitted
                    />
                  );
                }

                if (sectionType === 'cloze-mc') {
                  return (
                    <ClozeMCDisplay
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      section={{ ...question, id: `${partIdx}-${secIdx}-${qIdx}` }}
                      startingNumber={questionStart}
                      onAnswerChange={noop}
                      answers={answers}
                      submitted
                      testType={testType}
                      answerKeyPrefix={`${partIdx}-${secIdx}-${qIdx}`}
                    />
                  );
                }

                if (sectionType === 'cloze-test') {
                  const derivedAnswers = Array.isArray(question?.blanks) && question.blanks.length > 0
                    ? question.blanks.map((blank) => blank?.correctAnswer || '')
                    : Array.isArray(question?.answers)
                      ? question.answers
                      : Object.values(question?.answers || {});

                  return (
                    <ClozeTestDisplay
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      section={{
                        id: `${partIdx}-${secIdx}-${qIdx}`,
                        passage: question?.passage || question?.passageText || question?.clozeText || '',
                        answers: derivedAnswers,
                      }}
                      startingNumber={questionStart}
                      onAnswerChange={noop}
                      answers={answers}
                      submitted
                    />
                  );
                }

                if (sectionType === 'word-form') {
                  return (
                    <WordFormDisplay
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      section={{ ...question, id: `${partIdx}-${secIdx}-${qIdx}` }}
                      startingNumber={questionStart}
                      onAnswerChange={noop}
                      answers={answers}
                      submitted
                    />
                  );
                }

                if (sectionType === 'inline-choice') {
                  return (
                    <InlineChoiceDisplay
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      section={{ ...question, id: `${partIdx}-${secIdx}-${qIdx}` }}
                      startingNumber={questionStart}
                      onAnswerChange={noop}
                      answers={answers}
                      submitted
                      answerKeyPrefix={`${partIdx}-${secIdx}-${qIdx}`}
                    />
                  );
                }

                if (sectionType === 'people-matching') {
                  return (
                    <PeopleMatchingReview
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      question={question}
                      partIdx={partIdx}
                      secIdx={secIdx}
                      sectionStart={questionStart}
                      answers={answers}
                      detailedResults={detailedResults}
                    />
                  );
                }

                if (sectionType === 'gap-match') {
                  return (
                    <GapMatchReview
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      question={question}
                      partIdx={partIdx}
                      secIdx={secIdx}
                      sectionStart={questionStart}
                      answers={answers}
                      detailedResults={detailedResults}
                    />
                  );
                }

                if (sectionType === 'matching-pictures') {
                  return (
                    <MatchingPicturesDisplay
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      section={{ ...section, id: `${partIdx}-${secIdx}`, questions: [question] }}
                      startingNumber={questionStart}
                      answerKeyPrefix={`${partIdx}-${secIdx}`}
                      onAnswerChange={noop}
                      answers={answers}
                      submitted
                    />
                  );
                }

                if (sectionType === 'image-cloze') {
                  return (
                    <ImageClozeDisplay
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      section={{ ...section, id: `${partIdx}-${secIdx}`, questions: [question] }}
                      startingNumber={questionStart}
                      answerKeyPrefix={`${partIdx}-${secIdx}`}
                      onAnswerChange={noop}
                      answers={answers}
                      submitted
                    />
                  );
                }

                if (sectionType === 'word-drag-cloze') {
                  return (
                    <WordDragClozeDisplay
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      section={{ ...section, id: `${partIdx}-${secIdx}`, questions: [question] }}
                      startingNumber={questionStart}
                      answerKeyPrefix={`${partIdx}-${secIdx}`}
                      onAnswerChange={noop}
                      answers={answers}
                      submitted
                      partImage={part?.imageUrl || ''}
                    />
                  );
                }

                if (sectionType === 'story-completion') {
                  return (
                    <StoryCompletionDisplay
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      section={{ ...section, id: `${partIdx}-${secIdx}`, questions: [question] }}
                      startingNumber={questionStart}
                      answerKeyPrefix={`${partIdx}-${secIdx}`}
                      onAnswerChange={noop}
                      answers={answers}
                      submitted
                      partImage={part?.imageUrl || ''}
                      renderMode="full"
                    />
                  );
                }

                if (sectionType === 'look-read-write') {
                  return (
                    <LookReadWriteDisplay
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      section={{ ...section, id: `${partIdx}-${secIdx}`, questions: [question] }}
                      startingNumber={questionStart}
                      answerKeyPrefix={`${partIdx}-${secIdx}`}
                      onAnswerChange={noop}
                      answers={answers}
                      submitted
                      partImage={part?.imageUrl || ''}
                      renderMode="full"
                    />
                  );
                }

                if (sectionType === 'draw-lines') {
                  return isListeningTest ? (
                    <ListeningRuntimeQuestionReview
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      question={question}
                      answerKey={`${partIdx}-${secIdx}-${qIdx}`}
                      questionNumber={questionStart}
                      answers={answers}
                      detailedResults={detailedResults}
                      listeningStyles={listeningStyles}
                      questionRefs={questionRefs}
                      currentPart={part}
                      drawLinesComponent={DrawLinesQuestion}
                    />
                  ) : (
                    <DrawLinesReview
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      part={part}
                      question={question}
                      partIdx={partIdx}
                      secIdx={secIdx}
                      sectionStart={questionStart}
                      answers={answers}
                      detailedResults={detailedResults}
                    />
                  );
                }

                if (sectionType === 'letter-matching') {
                  return isListeningTest ? (
                    <LetterMatchingStudentSection
                      key={`${partIdx}-${secIdx}`}
                      section={section}
                      secIdx={secIdx}
                      sectionStartNum={sectionStart}
                      answers={answers}
                      submitted
                      results={runtimeResults}
                      isDarkMode={false}
                      handleAnswerChange={noop}
                      currentPartIndex={partIdx}
                      questionRefs={questionRefs}
                      resolveImgSrc={resolveAsset}
                      activeQuestion={null}
                    />
                  ) : (
                    <LetterMatchingReview
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      question={question}
                      partIdx={partIdx}
                      secIdx={secIdx}
                      sectionStart={questionStart}
                      answers={answers}
                      detailedResults={detailedResults}
                    />
                  );
                }

                if (sectionType === 'image-tick') {
                  if (qIdx > 0) return null;
                  return (
                    <ImageTickSlideSection
                      key={`${partIdx}-${secIdx}`}
                      questions={Array.isArray(section?.questions) ? section.questions : []}
                      exampleItem={section?.exampleItem || null}
                      secIdx={secIdx}
                      sectionStartNum={sectionStart}
                      answers={answers}
                      submitted
                      results={runtimeResults}
                      isDarkMode={false}
                      handleAnswerChange={noop}
                      currentPartIndex={partIdx}
                      questionRefs={questionRefs}
                      resolveImgSrc={resolveAsset}
                      activeQuestion={null}
                      onSlideChange={noop}
                    />
                  );
                }

                if (sectionType === 'colour-write') {
                  if (qIdx > 0) return null;
                  return (
                    <ColourWriteStudentSection
                      key={`${partIdx}-${secIdx}`}
                      questions={Array.isArray(section?.questions) ? section.questions : []}
                      exampleItem={section?.exampleItem || null}
                      sceneImageUrl={section?.sceneImageUrl ? resolveAsset(section.sceneImageUrl) : ''}
                      decoyPositions={Array.isArray(section?.decoyPositions) ? section.decoyPositions : []}
                      partIdx={partIdx}
                      secIdx={secIdx}
                      sectionStartNum={sectionStart}
                      answers={answers}
                      submitted
                      results={runtimeResults}
                      isDarkMode={false}
                      handleAnswerChange={noop}
                      currentPartIndex={partIdx}
                      questionRefs={questionRefs}
                    />
                  );
                }

                if (sectionType === 'multiple-choice-pictures') {
                  if (isListeningTest) {
                    return (
                      <ListeningRuntimeQuestionReview
                        key={`${partIdx}-${secIdx}-${qIdx}`}
                        question={question}
                        answerKey={`${partIdx}-${secIdx}-${qIdx}`}
                        questionNumber={questionStart}
                        answers={answers}
                        detailedResults={detailedResults}
                        listeningStyles={listeningStyles}
                        questionRefs={questionRefs}
                      />
                    );
                  }
                  if (qIdx > 0) return null;
                  return (
                    <MultipleChoicePicturesReview
                      key={`${partIdx}-${secIdx}`}
                      section={section}
                      partIdx={partIdx}
                      secIdx={secIdx}
                      sectionStart={sectionStart}
                      answers={answers}
                      detailedResults={detailedResults}
                    />
                  );
                }

                if (sectionType === 'short-message') {
                  const detailedResult = getWritingDetailedResult(detailedResults, partIdx, secIdx, qIdx);
                  return (
                    <div key={`${partIdx}-${secIdx}-${qIdx}`} style={styles.textareaWrap}>
                      <WritingTaskReview
                        sectionType={sectionType}
                        question={question}
                        questionNumber={questionStart || ''}
                        userAnswer={getWritingAnswer(answers, partIdx, secIdx, qIdx)}
                        detailedResult={detailedResult}
                      />
                      {question?.sampleAnswer ? (
                        <div style={styles.sampleAnswer}>
                          <strong>Sample answer:</strong>
                          <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{question.sampleAnswer}</div>
                        </div>
                      ) : null}
                    </div>
                  );
                }

                if (sectionType === 'story-writing') {
                  const detailedResult = getWritingDetailedResult(detailedResults, partIdx, secIdx, qIdx);
                  return (
                    <WritingTaskReview
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      sectionType={sectionType}
                      question={question}
                      questionNumber={questionStart || ''}
                      userAnswer={getWritingAnswer(answers, partIdx, secIdx, qIdx)}
                      detailedResult={detailedResult}
                    />
                  );
                }

                if (isListeningTest && (sectionType === 'fill' || sectionType === 'abc')) {
                  return (
                    <ListeningRuntimeQuestionReview
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      question={question}
                      answerKey={`${partIdx}-${secIdx}-${qIdx}`}
                      questionNumber={questionStart}
                      answers={answers}
                      detailedResults={detailedResults}
                      listeningStyles={listeningStyles}
                      questionRefs={questionRefs}
                    />
                  );
                }

                if (sectionType === 'fill' || sectionType === 'abc' || sectionType === 'colour-write') {
                  return (
                    <FillOrChoiceQuestion
                      key={`${partIdx}-${secIdx}-${qIdx}`}
                      section={section}
                      question={question}
                      partIdx={partIdx}
                      secIdx={secIdx}
                      qIdx={qIdx}
                      questionNumber={questionStart}
                      answers={answers}
                      examType={examType}
                      testType={testType}
                    />
                  );
                }

                return (
                  <div key={`${partIdx}-${secIdx}-${qIdx}`} style={styles.unsupported}>
                    A student-style renderer is not available yet for <strong>{sectionType || 'unknown'}</strong>. Teachers can still use the standard review information shown for this section.
                  </div>
                );
              });

              return (
                <SectionShell
                  key={`section-${partIdx}-${secIdx}`}
                  title={section.sectionTitle || getSectionDisplayName(sectionType)}
                  typeLabel={getSectionDisplayName(sectionType)}
                  rangeLabel={rangeLabel}
                >
                  {content}
                </SectionShell>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}