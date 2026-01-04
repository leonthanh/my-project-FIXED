import React from "react";
import { getQuestionTypesForTest, QUESTION_TYPES } from "../../config/questionTypes";

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
}) => {
  // Get available question types
  const questionTypes = showAll 
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
      {questionTypes.map((qt) => (
        <option key={qt.id} value={qt.id} title={qt.description}>
          {qt.icon} {qt.label}
        </option>
      ))}
    </select>
  );
};

export default QuestionTypeSelector;
