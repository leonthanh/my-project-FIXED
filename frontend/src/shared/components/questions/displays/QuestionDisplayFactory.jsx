import React from 'react';
import {
  SignMessageDisplay,
  PeopleMatchingDisplay,
  LongTextMCDisplay,
  ClozeMCDisplay,
  ClozeTestDisplay,
  WordFormDisplay,
  ShortMessageDisplay,
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
}) => {
  switch (questionType) {
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

    case 'word-form':
      // Part 6: 6 sentences with root words
      return (
        <WordFormDisplay
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
