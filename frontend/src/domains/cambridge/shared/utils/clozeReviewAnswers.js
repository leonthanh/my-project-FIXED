const hasAnswerValue = (value) => (
  value !== undefined &&
  value !== null &&
  String(value).trim() !== ""
);

const getClozeReviewCorrectAnswer = ({ question, blank, blankIdx, blankCount }) => {
  if (hasAnswerValue(blank?.correctAnswer)) return blank.correctAnswer;

  const answers = question?.answers;
  if (!answers || typeof answers !== "object") return "";

  const questionNumbers = [blank?.questionNum, blank?.number]
    .filter((value) => value !== undefined && value !== null)
    .map(String);

  for (const questionNumber of questionNumbers) {
    if (hasAnswerValue(answers[questionNumber])) return answers[questionNumber];
  }

  const count = Number.isInteger(blankCount) && blankCount > 0
    ? blankCount
    : Object.keys(answers).length;
  const localAnswerStarts = [1, 2, 0];
  const answerStart = localAnswerStarts.find((start) => (
    Array.from({ length: count }, (_, index) => String(start + index))
      .every((answerNumber) => Object.prototype.hasOwnProperty.call(answers, answerNumber))
  ));

  if (answerStart !== undefined) {
    const answer = answers[String(answerStart + blankIdx)];
    if (hasAnswerValue(answer)) return answer;
  }

  for (const answerNumber of [blankIdx + 1, blankIdx + 2, blankIdx]) {
    if (hasAnswerValue(answers[String(answerNumber)])) {
      return answers[String(answerNumber)];
    }
  }

  return "";
};

export default getClozeReviewCorrectAnswer;
