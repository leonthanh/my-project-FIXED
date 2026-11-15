import { isAnswerAccepted } from '../../shared/utils/questionAnswerMatching';

const isQuestionNumber = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

export const getPrepareQuestionSummaryStatuses = (parts, answers, detailedResults) => {
  const statuses = new Map();

  (parts || []).forEach((part, partIndex) => {
    (part.sections || []).forEach((section, sectionIndex) => {
      const questionType = section.questionType || section.questions?.[0]?.questionType;
      if (!['conditional-sentence-completion', 'reported-speech-transformation'].includes(questionType)) {
        return;
      }

      (section.questions || []).forEach((question, questionIndex) => {
        (question.items || []).forEach((item, itemIndex) => {
          if (questionType === 'conditional-sentence-completion') {
            const blankAnswers = Array.isArray(item.blankAnswers) ? item.blankAnswers : [];
            if (blankAnswers.length === 0) return;

            const blankKeys = blankAnswers.map((_, blankIndex) => (
              `${partIndex}-${sectionIndex}-${questionIndex}-${itemIndex}-${blankIndex}`
            ));
            const questionNumber = blankKeys
              .map((key) => detailedResults?.[key]?.questionNumber)
              .find(isQuestionNumber);
            if (!isQuestionNumber(questionNumber)) return;

            statuses.set(
              Number(questionNumber),
              blankAnswers.every((expected, blankIndex) => (
                isAnswerAccepted(answers?.[blankKeys[blankIndex]], expected)
              ))
            );
            return;
          }

          const answerKey = `${partIndex}-${sectionIndex}-${questionIndex}-${itemIndex}`;
          const questionNumber = detailedResults?.[answerKey]?.questionNumber;
          if (!isQuestionNumber(questionNumber)) return;
          statuses.set(
            Number(questionNumber),
            isAnswerAccepted(answers?.[answerKey], item.correctAnswer)
          );
        });
      });
    });
  });

  return statuses;
};

export const summarizePrepareQuestionResults = (questionResults) => {
  const scoredQuestions = (questionResults || []).filter(
    ({ result }) => !['short-message', 'story-writing'].includes(result?.questionType)
  );
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  scoredQuestions.forEach(({ result }) => {
    const isUnanswered = result?.userAnswer === null
      || result?.userAnswer === undefined
      || result?.userAnswer === '';

    if (result?.isCorrect === true) {
      correct += 1;
    } else if (result?.isCorrect === null && !isUnanswered) {
      return;
    } else if (isUnanswered) {
      unanswered += 1;
    } else {
      wrong += 1;
    }
  });

  const total = scoredQuestions.length;

  return {
    score: correct,
    total,
    percentage: total ? Math.round((correct / total) * 100) : 0,
    correct,
    wrong,
    unanswered,
  };
};
