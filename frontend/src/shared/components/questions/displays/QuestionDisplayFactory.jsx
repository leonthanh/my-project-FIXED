import React from 'react';
import {
  SignMessageDisplay,
  PeopleMatchingDisplay,
  LongTextMCDisplay,
  ClozeMCDisplay,
  ClozeTestDisplay,
  SummaryCompletionDisplay,
  ShortMessageDisplay,
  InlineChoiceDisplay,
} from './index';

/**
 * QuestionDisplayFactory - Routes section types to appropriate display components
 * Used in student test-taking interface (DoCambridgeReadingTest)
 */
const QuestionDisplayFactory = ({
  section,
  questionType,
  startingNumber,
  onAnswerChange,
  answers,
  submitted,
  testType,
  questionIndex = 0,
}) => {
  const singleQuestion = section?.questions?.[0] || {};
  const baseKey = `${section?.id || 'section'}-${questionIndex}`;

  const normalize = (value) => String(value || '').trim().toLowerCase();
  const acceptedAnswers = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && (raw.includes('|') || raw.includes('/'))) {
      return raw.split(/[|/]/).map((item) => item.trim()).filter(Boolean);
    }
    return [raw];
  };

  switch (questionType) {
    case 'fill': {
      const userAnswer = answers[baseKey] || '';
      const correctAnswer = singleQuestion?.correctAnswer;
      const isCorrect = submitted && acceptedAnswers(correctAnswer).some((ans) => normalize(ans) === normalize(userAnswer));

      return (
        <div style={{ marginTop: 8 }}>
          {singleQuestion?.questionText && (
            <div style={{ marginBottom: 10, fontSize: 15, lineHeight: 1.7, color: '#1f2937' }}>
              {singleQuestion.questionText}
            </div>
          )}
          <input
            type="text"
            value={userAnswer}
            disabled={submitted}
            onChange={(e) => onAnswerChange(baseKey, e.target.value)}
            placeholder="Type your answer..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '15px',
              ...(submitted
                ? {
                    backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                    borderColor: isCorrect ? '#22c55e' : '#ef4444',
                  }
                : {}),
            }}
          />
          {submitted && !isCorrect && correctAnswer && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#166534' }}>
              Correct: <strong>{String(correctAnswer).split(/[|/]/)[0]}</strong>
            </div>
          )}
        </div>
      );
    }

    case 'abc': {
      const userAnswer = answers[baseKey] || '';
      const options = Array.isArray(singleQuestion?.options) ? singleQuestion.options : [];
      const correct = String(singleQuestion?.correctAnswer || '').trim().toUpperCase();

      return (
        <div style={{ marginTop: 8 }}>
          {singleQuestion?.questionText && (
            <div style={{ marginBottom: 12, fontSize: 15, lineHeight: 1.7, color: '#1f2937' }}>
              {singleQuestion.questionText}
            </div>
          )}
          <div style={{ display: 'grid', gap: 8 }}>
            {options.map((optionText, idx) => {
              const optionLetter = String.fromCharCode(65 + idx);
              const selected = userAnswer === optionLetter;
              const showCorrect = submitted && optionLetter === correct;
              const cleanText = String(optionText || '').replace(/^[A-H]\.\s*/i, '').trim();

              return (
                <label
                  key={`${baseKey}-${optionLetter}`}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    padding: '9px 10px',
                    borderRadius: 8,
                    border: showCorrect ? '1px solid #22c55e' : '1px solid #e5e7eb',
                    backgroundColor: selected ? '#eff6ff' : showCorrect ? '#f0fdf4' : '#fff',
                    cursor: submitted ? 'default' : 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name={`question-${baseKey}`}
                    value={optionLetter}
                    checked={selected}
                    disabled={submitted}
                    onChange={() => onAnswerChange(baseKey, optionLetter)}
                    style={{ marginTop: 2 }}
                  />
                  <span style={{ fontSize: 14, color: '#111827' }}>
                    <strong>{optionLetter}.</strong> {cleanText}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    case 'sign-message':
      // Part 1: 6 sign/message images with ABC options
      return section.questions?.map((question, idx) => (
        <SignMessageDisplay
          key={idx}
          question={question}
          questionNumber={startingNumber + idx}
          onAnswerChange={(value) => onAnswerChange(`${section.id}-${idx}`, value)}
          userAnswer={answers[`${section.id}-${idx}`]}
          submitted={submitted}
        />
      ));

    case 'people-matching':
      // Part 2: 5 people (A-E), 8 texts to match
      return (
        <PeopleMatchingDisplay
          section={section}
          startingNumber={startingNumber}
          onAnswerChange={onAnswerChange}
          answers={answers}
          submitted={submitted}
        />
      );

    case 'long-text-mc':
      // Part 3: Passage + 5-7 multiple choice questions
      return (
        <LongTextMCDisplay
          section={section}
          startingNumber={startingNumber}
          onAnswerChange={onAnswerChange}
          answers={answers}
          submitted={submitted}
        />
      );

    case 'cloze-mc':
      // Part 4: Passage with numbered blanks + ABC options
      return (
        <ClozeMCDisplay
          section={section}
          startingNumber={startingNumber}
          onAnswerChange={onAnswerChange}
          answers={answers}
          submitted={submitted}
          testType={testType}
        />
      );

    case 'cloze-test':
      // Part 5: Passage with blanks, text input
      return (
        <ClozeTestDisplay
          section={section}
          startingNumber={startingNumber}
          onAnswerChange={onAnswerChange}
          answers={answers}
          submitted={submitted}
        />
      );

    case 'summary-completion':
      // Summary completion using list of lettered options (A-L)
      return (
        <SummaryCompletionDisplay
          section={section}
          startingNumber={startingNumber}
          onAnswerChange={onAnswerChange}
          answers={answers}
          submitted={submitted}
        />
      );

    case 'word-form':
      return (
        <div style={{ display: 'grid', gap: 12 }}>
          {(singleQuestion?.sentences || []).map((sentence, idx) => {
            const qKey = `${section.id}-${questionIndex}-${idx}`;
            const userAnswer = answers[qKey] || '';
            const sentenceText = sentence?.sentence || sentence?.text || '';
            const rootWord = sentence?.rootWord || '';
            const correctAnswer = sentence?.correctAnswer || '';
            const isCorrect = submitted && acceptedAnswers(correctAnswer).some((ans) => normalize(ans) === normalize(userAnswer));

            return (
              <div key={qKey} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fff' }}>
                <div style={{ marginBottom: 8, color: '#1f2937', lineHeight: 1.7 }}>
                  <strong style={{ marginRight: 8 }}>{startingNumber + idx}.</strong>
                  {sentenceText}
                </div>
                {rootWord && (
                  <div style={{ marginBottom: 8, fontSize: 13, color: '#92400e' }}>
                    Root word: <strong>{rootWord}</strong>
                  </div>
                )}
                <input
                  type="text"
                  value={userAnswer}
                  disabled={submitted}
                  onChange={(e) => onAnswerChange(qKey, e.target.value)}
                  placeholder="Type your answer..."
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    border: '2px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 15,
                    ...(submitted
                      ? {
                          backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                          borderColor: isCorrect ? '#22c55e' : '#ef4444',
                        }
                      : {}),
                  }}
                />
                {submitted && !isCorrect && correctAnswer && (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#166534' }}>
                    Correct: <strong>{String(correctAnswer).split(/[|/]/)[0]}</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );

    case 'inline-choice':
      return (
        <InlineChoiceDisplay
          section={section}
          startingNumber={startingNumber}
          onAnswerChange={onAnswerChange}
          answers={answers}
          submitted={submitted}
        />
      );

    case 'short-message':
      // Part 7: Writing task with images + bullet points
      return (
        <ShortMessageDisplay
          section={section}
          questionNumber={startingNumber}
          onAnswerChange={(value) => onAnswerChange(`${section.id}-0`, value)}
          userAnswer={answers[`${section.id}-0`]}
          submitted={submitted}
        />
      );

    default:
      return (
        <div style={{ padding: '20px', color: '#ef4444', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
          ⚠️ Unknown question type: <strong>{questionType}</strong>
        </div>
      );
  }
};

export default QuestionDisplayFactory;
