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
  MatchingPicturesDisplay,
  ImageClozeDisplay,
  WordDragClozeDisplay,
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
  examType,
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

      // Kid-friendly game-style layout for young learners (MOVERS/STARTERS/FLYERS)
      if (examType === 'MOVERS' || examType === 'STARTERS' || examType === 'FLYERS') {
        const OPTION_THEMES = [
          { grad: ['#3b82f6', '#1d4ed8'], light: '#dbeafe', lightBorder: '#93c5fd', ring: '#3b82f640' },
          { grad: ['#f97316', '#ea580c'], light: '#ffedd5', lightBorder: '#fdba74', ring: '#f9731640' },
          { grad: ['#a855f7', '#8b5cf6'], light: '#f3e8ff', lightBorder: '#d8b4fe', ring: '#a855f740' },
        ];

        return (
          <div style={{ marginTop: 4 }}>
            <style>{`
              @keyframes abcPop { 0%{transform:scale(0.93)} 55%{transform:scale(1.05)} 100%{transform:scale(1)} }
              @keyframes abcShake { 0%,100%{transform:translateX(0)} 22%{transform:translateX(-5px)} 66%{transform:translateX(5px)} }
              @keyframes abcWiggle { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-2deg)} 75%{transform:rotate(2deg)} }
              .abc-kid-btn { transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.18s ease; }
              .abc-kid-btn:hover:not([disabled]) { transform: translateY(-3px) scale(1.02); }
              .abc-kid-btn:active:not([disabled]) { transform: scale(0.96); }
              .abc-kid-btn.abc-selected { animation: abcPop 0.32s cubic-bezier(.34,1.56,.64,1) forwards; }
              .abc-kid-btn.abc-wrong { animation: abcShake 0.45s ease; }
              .abc-kid-btn.abc-correct-reveal { animation: abcWiggle 0.5s ease; }
            `}</style>

            {singleQuestion?.questionText && (
              <div style={{ marginBottom: 14, fontSize: 15, lineHeight: 1.8, color: '#1f2937', whiteSpace: 'pre-line', fontWeight: 500 }}>
                {singleQuestion.questionText}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {options.map((optionText, idx) => {
                const optionLetter = String.fromCharCode(65 + idx);
                const theme = OPTION_THEMES[idx] || OPTION_THEMES[0];
                const selected = userAnswer === optionLetter;
                const isCorrectOption = submitted && optionLetter === correct;
                const isWrongSelected = submitted && selected && optionLetter !== correct;
                const cleanText = String(optionText || '').replace(/^[A-H]\.\s*/i, '').trim();

                let cardBg = '#fff';
                let cardBorder = '#e5e7eb';
                let cardShadow = '0 2px 8px rgba(0,0,0,0.06)';
                if (selected && !submitted) {
                  cardBg = theme.light;
                  cardBorder = theme.grad[0];
                  cardShadow = `0 6px 20px ${theme.ring}`;
                }
                if (isCorrectOption) { cardBg = '#f0fdf4'; cardBorder = '#22c55e'; cardShadow = '0 6px 18px #22c55e30'; }
                if (isWrongSelected) { cardBg = '#fef2f2'; cardBorder = '#f87171'; cardShadow = '0 4px 12px #ef444430'; }

                let circleGrad = `linear-gradient(135deg, ${theme.light}, ${theme.light})`;
                let circleColor = theme.grad[0];
                let circleLabel = optionLetter;
                if (selected && !submitted) { circleGrad = `linear-gradient(135deg, ${theme.grad[0]}, ${theme.grad[1]})`; circleColor = '#fff'; }
                if (isCorrectOption) { circleGrad = 'linear-gradient(135deg, #22c55e, #16a34a)'; circleColor = '#fff'; circleLabel = '✓'; }
                if (isWrongSelected) { circleGrad = 'linear-gradient(135deg, #ef4444, #dc2626)'; circleColor = '#fff'; circleLabel = '✗'; }

                return (
                  <button
                    key={`${baseKey}-${optionLetter}`}
                    className={`abc-kid-btn${selected && !submitted ? ' abc-selected' : ''}${isWrongSelected ? ' abc-wrong' : ''}${isCorrectOption ? ' abc-correct-reveal' : ''}`}
                    disabled={submitted}
                    onClick={() => onAnswerChange(baseKey, optionLetter)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '13px 16px',
                      borderRadius: 16,
                      border: `2.5px solid ${cardBorder}`,
                      backgroundColor: cardBg,
                      boxShadow: cardShadow,
                      cursor: submitted ? 'default' : 'pointer',
                      textAlign: 'left', width: '100%',
                    }}
                  >
                    {/* Letter bubble */}
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: circleGrad,
                      color: circleColor,
                      fontWeight: 900, fontSize: 18,
                      boxShadow: (selected && !submitted) ? `0 4px 10px ${theme.ring}` : 'none',
                      transition: 'all 0.2s ease',
                    }}>
                      {circleLabel}
                    </div>

                    {/* Answer text */}
                    <span style={{
                      fontSize: 15, fontWeight: selected ? 700 : 500,
                      color: isWrongSelected ? '#b91c1c' : isCorrectOption ? '#15803d' : '#1f2937',
                      flex: 1, lineHeight: 1.5,
                    }}>
                      {cleanText}
                    </span>

                    {/* Correct hint for wrong selection */}
                    {isWrongSelected && (
                      <span style={{ fontSize: 12, color: '#15803d', fontWeight: 700, whiteSpace: 'nowrap', background: '#dcfce7', borderRadius: 8, padding: '2px 7px' }}>
                        ✓ {correct}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      // Default style for KET/PET/IELTS
      return (
        <div style={{ marginTop: 8 }}>
          {singleQuestion?.questionText && (
            <div style={{ marginBottom: 12, fontSize: 15, lineHeight: 1.7, color: '#1f2937', whiteSpace: 'pre-line' }}>
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

    case 'matching-pictures':
      return (
        <MatchingPicturesDisplay
          section={section}
          startingNumber={startingNumber}
          onAnswerChange={onAnswerChange}
          answers={answers}
          submitted={submitted}
        />
      );

    case 'image-cloze':
      return (
        <ImageClozeDisplay
          section={section}
          startingNumber={startingNumber}
          answerKeyPrefix={section?.id}
          onAnswerChange={onAnswerChange}
          answers={answers}
          submitted={submitted}
        />
      );

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

    case 'word-drag-cloze':
      return (
        <WordDragClozeDisplay
          section={section}
          startingNumber={startingNumber}
          answerKeyPrefix={section?.id}
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
