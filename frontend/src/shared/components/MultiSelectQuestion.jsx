import React from 'react';
import MultiSelectEditor from './questions/editors/MultiSelectEditor';

const DEFAULT_OPTIONS = ['', '', '', '', ''];

const splitLetters = (value) => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .flatMap((item) => String(item || '').split(/[\s,;/|]+/))
          .flatMap((item) => (/^[A-Za-z]{2,}$/.test(item) ? item.split('') : [item]))
          .map((item) => String(item || '').trim().toUpperCase())
          .filter((item) => /^[A-Z]$/.test(item))
      )
    ).sort();
  }

  const raw = String(value || '').trim();
  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split(/[\s,;/|]+/)
        .flatMap((item) => (/^[A-Za-z]{2,}$/.test(item) ? item.split('') : [item]))
        .map((item) => String(item || '').trim().toUpperCase())
        .filter((item) => /^[A-Z]$/.test(item))
    )
  ).sort();
};

const stripOptionPrefix = (value) => String(value || '').replace(/^[A-Z]\.\s*/, '');

const getStartingNumber = (questionNumber) => {
  const match = String(questionNumber || '').match(/\d+/);
  if (!match) return 1;

  const parsed = parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : 1;
};

const MultiSelectQuestion = ({ question, onChange }) => {
  if (!question) {
    return <div style={{ color: 'red', padding: '10px' }}>Error: Question object missing</div>;
  }

  const requiredAnswers = Number(question.requiredAnswers || question.maxSelection || 2);
  const normalizedLetters = splitLetters(question.correctAnswer);
  const normalizedQuestion = {
    ...question,
    options: Array.isArray(question.options) && question.options.length > 0
      ? question.options
      : DEFAULT_OPTIONS,
    correctAnswer: normalizedLetters.join(','),
    requiredAnswers: requiredAnswers === 3 ? 3 : 2,
  };

  const handleEditorChange = (field, value) => {
    const nextRequiredAnswers = field === 'requiredAnswers'
      ? (Number(value) === 3 ? 3 : 2)
      : normalizedQuestion.requiredAnswers;
    const nextQuestion = {
      ...question,
      requiredAnswers: nextRequiredAnswers,
      maxSelection: nextRequiredAnswers,
    };

    if (field === 'correctAnswer') {
      nextQuestion.correctAnswer = splitLetters(value).join('');
      onChange(nextQuestion);
      return;
    }

    if (field === 'options') {
      nextQuestion.options = Array.isArray(value)
        ? value.map((item) => stripOptionPrefix(item))
        : value;
      onChange(nextQuestion);
      return;
    }

    if (field === 'requiredAnswers') {
      nextQuestion.correctAnswer = splitLetters(question.correctAnswer)
        .slice(0, nextRequiredAnswers)
        .join('');
      onChange(nextQuestion);
      return;
    }

    nextQuestion[field] = value;
    onChange(nextQuestion);
  };

  return (
    <MultiSelectEditor
      question={normalizedQuestion}
      onChange={handleEditorChange}
      startingNumber={getStartingNumber(question.questionNumber)}
    />
  );
};

export default MultiSelectQuestion;
