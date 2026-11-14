import React from "react";
import { getQuestionTypesForTest, QUESTION_TYPES } from "../../config/questionTypes";

const getTestFamilyLabel = (testTypeId) => {
  const testType = String(testTypeId || '').trim().toLowerCase();
  if (testType.startsWith('prepare')) return 'PP';
  if (testType.startsWith('ket')) return 'KET';
  if (testType.startsWith('pet')) return 'PET';
  if (testType.startsWith('gateway')) return 'Gateway';
  if (testType.startsWith('ielts')) return 'IELTS';
  if (testType.startsWith('general')) return 'General';
  if (testType.startsWith('movers')) return 'Movers';
  if (testType.startsWith('flyers')) return 'Flyers';
  if (testType.startsWith('starters')) return 'Starters';
  return '';
};

export const getQuestionTypeScopeLabel = (questionType) => {
  if (typeof questionType?.scopeLabel === "string" && questionType.scopeLabel.trim()) {
    return questionType.scopeLabel.trim();
  }
  const labels = [...new Set(
    (Array.isArray(questionType?.supportedTests) ? questionType.supportedTests : [])
      .map(getTestFamilyLabel)
      .filter(Boolean)
  )];
  if (!labels.length) return '';
  return labels.length > 2 ? 'Dùng chung' : labels.join('/');
};

/**
 * QuestionTypeSelector - Dropdown để chọn loại câu hỏi
 * Hiển thị các question types phù hợp với test type
 * 
 * @param {string} testType - ID của test type (ielts-listening, ket-reading, etc.)
 * @param {string} value - Giá trị hiện tại
 * @param {Function} onChange - Handler khi thay đổi
 * @param {Object} style - Custom styles
 * @param {boolean} showAll - Hiển thị tất cả question types (không filter theo test)
 */
const QuestionTypeSelector = ({
  testType = 'ielts-listening',
  value = 'fill',
  onChange,
  style = {},
  showAll = false,
  className = '',
  questionTypes = null,
}) => {
  // Get available question types
  const availableQuestionTypes = Array.isArray(questionTypes) && questionTypes.length > 0
    ? questionTypes
    : showAll 
    ? Object.values(QUESTION_TYPES)
    : getQuestionTypesForTest(testType);

  const defaultStyle = {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "13px",
    width: "100%",
    backgroundColor: "#fff",
    cursor: "pointer",
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...defaultStyle, ...style }}
      className={className}
    >
      {availableQuestionTypes.map((qt) => {
        const scopeLabel = getQuestionTypeScopeLabel(qt);
        return (
          <option key={qt.id} value={qt.id} title={qt.description}>
            {qt.labelVi || qt.label}{scopeLabel ? ` - ${scopeLabel}` : ''}
          </option>
        );
      })}
    </select>
  );
};

export default QuestionTypeSelector;
