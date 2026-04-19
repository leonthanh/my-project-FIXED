const { processTestParts } = require('../../../utils/clozParser');

const scoreQuestion = (userAnswer, correctAnswer, questionType) => {
  if (!userAnswer) {
    return false;
  }

  const toArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && (value.includes('/') || value.includes('|'))) {
      return value.split(/[\/|]/).map((item) => item.trim()).filter(Boolean);
    }
    return [value];
  };

  const normalize = (value) => String(value).trim().toLowerCase();
  const normalizeMc = (value) => String(value).trim().toUpperCase();
  const acceptedAnswers = toArray(correctAnswer);

  if (questionType === 'fill' || questionType === 'cloze-test') {
    const userNorm = normalize(userAnswer);
    const stripTrailingDot = (value) => value.replace(/\.+$/, '').trim();
    const allVariants = new Set();

    acceptedAnswers.forEach((raw) => {
      const base = normalize(raw);
      const withoutOptional = base.replace(/\s*\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();
      const withOptional = base.replace(/\(([^)]+)\)/g, '$1').replace(/\s+/g, ' ').trim();

      [base, withoutOptional, withOptional].forEach((value) => {
        if (!value) return;
        allVariants.add(value);
        allVariants.add(stripTrailingDot(value));
      });
    });

    return allVariants.has(userNorm) || allVariants.has(stripTrailingDot(userNorm));
  }

  if (
    questionType === 'abc' ||
    questionType === 'abcd' ||
    questionType === 'matching' ||
    questionType === 'multiple-choice-pictures'
  ) {
    const userNorm = normalizeMc(userAnswer);
    return acceptedAnswers.some((answer) => normalizeMc(answer) === userNorm);
  }

  const userNorm = normalize(userAnswer);
  return acceptedAnswers.some((answer) => normalize(answer) === userNorm);
};

const scoreTest = (test, answers) => {
  let score = 0;
  let total = 0;
  const detailedResults = {};

  let parts = test?.parts;
  if (typeof parts === 'string') {
    try {
      parts = JSON.parse(parts);
    } catch (_err) {
      parts = [];
    }
  }
  parts = processTestParts(parts);

  const pickAnswer = (primaryKey, legacyKeys = []) => {
    if (answers && Object.prototype.hasOwnProperty.call(answers, primaryKey)) {
      return answers[primaryKey];
    }
    for (const key of legacyKeys) {
      if (answers && Object.prototype.hasOwnProperty.call(answers, key)) {
        return answers[key];
      }
    }
    return undefined;
  };

  parts?.forEach((part, partIdx) => {
    part.sections?.forEach((section, secIdx) => {
      const q0 = section?.questions?.[0] || {};
      const sectionType =
        section?.questionType ||
        q0?.questionType ||
        q0?.type ||
        (Array.isArray(q0?.people) ? 'people-matching' : '') ||
        (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
        (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
        '';

      section.questions?.forEach((question, qIdx) => {
        if (sectionType === 'people-matching' && Array.isArray(question?.people)) {
          const people = question.people;
          const correctMap = question.answers && typeof question.answers === 'object' ? question.answers : {};

          people.forEach((person, personIdx) => {
            const personId = person?.id || String.fromCharCode(65 + personIdx);
            const key = `${partIdx}-${secIdx}-${qIdx}-${personId}`;
            const legacyKey = `${partIdx}-${secIdx}-${personId}`;
            const legacyIndexKey = `${partIdx}-${secIdx}-${personIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey, legacyIndexKey]);
            const correctAnswer = correctMap?.[personId];

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'matching',
                questionText: '',
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'matching');
            if (isCorrect) score++;

            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'matching',
              questionText: '',
            };
          });
          return;
        }

        if (sectionType === 'gap-match' && Array.isArray(question?.leftItems)) {
          const leftItems = question.leftItems;
          const correctList = Array.isArray(question.correctAnswers) ? question.correctAnswers : [];

          leftItems.forEach((_, itemIdx) => {
            const key = `${partIdx}-${secIdx}-${qIdx}-${itemIdx}`;
            const legacyKey = `${partIdx}-${secIdx}-${itemIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey]);
            const correctAnswer = correctList[itemIdx];

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'gap-match',
                questionText: '',
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'matching');
            if (isCorrect) score++;

            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'gap-match',
              questionText: '',
            };
          });
          return;
        }

        if (sectionType === 'word-form' && Array.isArray(question?.sentences)) {
          question.sentences.forEach((sentence, sentIdx) => {
            const key = `${partIdx}-${secIdx}-${qIdx}-${sentIdx}`;
            const legacyKey = `${partIdx}-${secIdx}-${sentIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey]);
            const correctAnswer = sentence?.correctAnswer;

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'fill',
                questionText: sentence?.sentence || sentence?.text || '',
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'fill');
            if (isCorrect) score++;

            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'fill',
              questionText: sentence?.sentence || sentence?.text || '',
            };
          });
          return;
        }

        if (sectionType === 'matching-pictures' && Array.isArray(question.prompts)) {
          question.prompts.forEach((prompt) => {
            const promptId = String(prompt.id || prompt.number || 0);
            const key = `${partIdx}-${secIdx}-${promptId}`;
            const userAnswer = answers?.[key];
            const correctAnswer = prompt.correctAnswer ?? prompt.answer;

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'matching-pictures',
                questionText: prompt.text || '',
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'abc');
            if (isCorrect) score++;
            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'matching-pictures',
              questionText: prompt.text || '',
            };
          });
          return;
        }

        if (
          (sectionType === 'draw-lines' || question.questionType === 'draw-lines') &&
          Array.isArray(question.leftItems) &&
          question.anchors && typeof question.anchors === 'object'
        ) {
          const leftItems = question.leftItems || [];
          const correctMap = question.answers && typeof question.answers === 'object' ? question.answers : {};

          leftItems.forEach((_name, nameIdx) => {
            if (nameIdx === 0) return;
            const key = `${partIdx}-${secIdx}-${qIdx}-${nameIdx}`;
            const userAnswer = answers?.[key];
            const correctAnswer = correctMap[String(nameIdx)];

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'draw-lines',
                questionText: leftItems[nameIdx] || '',
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'matching');
            if (isCorrect) score++;

            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'draw-lines',
              questionText: leftItems[nameIdx] || '',
            };
          });
          return;
        }

        if (sectionType === 'image-cloze') {
          const passageText = question.passageText || '';
          const answersMap = question.answers && typeof question.answers === 'object' ? question.answers : {};
          const imageBank = Array.isArray(question.imageBank) ? question.imageBank : [];
          const resolveWord = (id) => {
            if (!id) return id;
            const entry = imageBank.find((item) => item.id === id);
            return entry ? entry.word || id : id;
          };

          const blankNums = [];
          const blankRe = /\(\s*(\d+)\s*\)/g;
          let blankMatch;
          while ((blankMatch = blankRe.exec(passageText)) !== null) {
            blankNums.push(parseInt(blankMatch[1], 10));
          }

          blankNums.forEach((blankNum) => {
            const key = `${partIdx}-${secIdx}-blank-${blankNum}`;
            const userAnswer = answers?.[key];
            const correctId = answersMap[String(blankNum)];
            if (!correctId) {
              detailedResults[key] = { isCorrect: null, userAnswer: userAnswer || null, correctAnswer: null, questionType: 'image-cloze', questionText: '' };
              return;
            }
            total++;
            const isCorrect = userAnswer === correctId;
            if (isCorrect) score++;
            detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer: resolveWord(correctId), questionType: 'image-cloze', questionText: '' };
          });

          if (question.titleQuestion && question.titleQuestion.enabled) {
            const key = `${partIdx}-${secIdx}-title`;
            const userAnswer = answers?.[key];
            const correctAnswer = question.titleQuestion.correctAnswer;
            if (correctAnswer) {
              total++;
              const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'abc');
              if (isCorrect) score++;
              detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer, questionType: 'abc', questionText: question.titleQuestion.text || '' };
            }
          }
          return;
        }

        if (sectionType === 'short-message') {
          const key = `${partIdx}-${secIdx}-${qIdx}`;
          const userAnswer = answers?.[key];
          detailedResults[key] = {
            isCorrect: null,
            userAnswer: userAnswer || null,
            correctAnswer: null,
            questionType: 'short-message',
            questionText: question?.situation || question?.questionText || '',
          };
          return;
        }

        if (sectionType === 'long-text-mc' && question.questions && Array.isArray(question.questions)) {
          question.questions.forEach((nestedQ, nestedIdx) => {
            const key = `${partIdx}-${secIdx}-${qIdx}-${nestedIdx}`;
            const legacyKey = `${partIdx}-${secIdx}-${nestedIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey]);
            const correctAnswer = nestedQ.correctAnswer ?? nestedQ.answers ?? nestedQ.answer ?? nestedQ.correct;

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: nestedQ.questionType || 'abc',
                questionText: nestedQ.questionText || '',
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, nestedQ.questionType);
            if (isCorrect) score++;
            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: nestedQ.questionType || 'abc',
              questionText: nestedQ.questionText || '',
            };
          });
        } else if (sectionType === 'cloze-mc' && question.blanks && Array.isArray(question.blanks)) {
          question.blanks.forEach((blank, blankIdx) => {
            const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
            const legacyKey = `${partIdx}-${secIdx}-${blankIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey]);
            const correctAnswer =
              blank.correctAnswer ??
              blank.answers ??
              blank.answer ??
              blank.correct ??
              question.correctAnswer ??
              question.answers ??
              question.answer ??
              question.correct;

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'abc',
                questionText: blank.questionText || '',
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'abc');
            if (isCorrect) score++;
            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'abc',
              questionText: blank.questionText || '',
            };
          });
        } else if (sectionType === 'cloze-test' && question.blanks && Array.isArray(question.blanks)) {
          question.blanks.forEach((blank, blankIdx) => {
            const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
            const legacyKey = `${partIdx}-${secIdx}-${blankIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey]);
            let correctAnswer = blank.correctAnswer ?? blank.answers ?? blank.answer ?? blank.correct;

            if (!correctAnswer && question.answers && typeof question.answers === 'object' && !Array.isArray(question.answers)) {
              correctAnswer = question.answers[blank.questionNum || blank.number];
            }

            if (!correctAnswer) {
              correctAnswer = question.correctAnswer ?? question.answers ?? question.answer ?? question.correct;
            }

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'fill',
                questionText: blank.questionText || '',
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'fill');
            if (isCorrect) score++;
            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'fill',
              questionText: blank.questionText || '',
            };
          });
        } else if (sectionType === 'inline-choice' && question.blanks && Array.isArray(question.blanks)) {
          const stripChoiceLabel = (value) => {
            if (value === undefined || value === null) return '';
            const normalizedValue = String(value).trim();
            const match = normalizedValue.match(/^[A-H](?:\.\s*|\s+)(.+)$/i);
            return match ? match[1].trim() : normalizedValue;
          };

          question.blanks.forEach((blank, blankIdx) => {
            const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
            const legacyKey = `${partIdx}-${secIdx}-${blankIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey]);
            let correctAnswer =
              blank.correctAnswer ??
              blank.answers ??
              blank.answer ??
              blank.correct ??
              question.correctAnswer ??
              question.answers ??
              question.answer ??
              question.correct;

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'inline-choice',
                questionText: blank.questionText || '',
              };
              return;
            }

            correctAnswer = stripChoiceLabel(correctAnswer);
            const normalizedUser = stripChoiceLabel(userAnswer);
            total++;
            const isCorrect = scoreQuestion(normalizedUser, correctAnswer, 'fill');
            if (isCorrect) score++;
            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'inline-choice',
              questionText: blank.questionText || '',
            };
          });
        } else if (sectionType === 'word-drag-cloze' && question.blanks && Array.isArray(question.blanks)) {
          question.blanks.forEach((blank) => {
            const key = `${partIdx}-${secIdx}-blank-${blank.number}`;
            const userAnswer = answers?.[key];
            const correctAnswer = blank.correctAnswer ?? blank.answer ?? blank.correct;
            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = { isCorrect: null, userAnswer: userAnswer || null, correctAnswer: null, questionType: 'fill', questionText: '' };
              return;
            }
            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'fill');
            if (isCorrect) score++;
            detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer, questionType: 'fill', questionText: '' };
          });
        } else if (sectionType === 'story-completion' && question.items && Array.isArray(question.items)) {
          question.items.forEach((item, itemIdx) => {
            const key = `${partIdx}-${secIdx}-item-${itemIdx + 1}`;
            const userAnswer = answers?.[key];
            const correctAnswer = item.answer ?? item.correctAnswer;
            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = { isCorrect: null, userAnswer: userAnswer || null, correctAnswer: null, questionType: 'fill', questionText: item.sentence || '' };
              return;
            }
            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'fill');
            if (isCorrect) score++;
            detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer, questionType: 'fill', questionText: item.sentence || '' };
          });
        } else if (sectionType === 'look-read-write' && question.groups && Array.isArray(question.groups)) {
          question.groups.forEach((group, groupIdx) => {
            (group.items || []).forEach((item, itemIdx) => {
              const key = `${partIdx}-${secIdx}-g${groupIdx}-item${itemIdx}`;
              const userAnswer = answers?.[key];
              const correctAnswer = (item.answer ?? item.correctAnswer ?? '').trim();
              total++;
              if (!correctAnswer) {
                const isCorrect = !!(userAnswer && userAnswer.trim());
                if (isCorrect) score++;
                detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer: null, questionType: 'fill', questionText: item.sentence || '' };
                return;
              }
              const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'fill');
              if (isCorrect) score++;
              detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer, questionType: 'fill', questionText: item.sentence || '' };
            });
          });
        } else if (
          (sectionType === 'letter-matching' || question.questionType === 'letter-matching') &&
          Array.isArray(question.people) &&
          question.people.length > 1
        ) {
          question.people.forEach((person, personIndex) => {
            if (personIndex === 0) return;
            const name = String(person?.name || '').trim();
            if (!name) return;
            const key = `${partIdx}-${secIdx}-${qIdx}-${personIndex}`;
            const userAnswer = answers?.[key];
            const correctAnswer = person?.correctAnswer ?? question.answers?.[String(personIndex)] ?? null;
            if (!correctAnswer) {
              detailedResults[key] = { isCorrect: null, userAnswer: userAnswer || null, correctAnswer: null, questionType: 'letter-matching', questionText: name };
              return;
            }
            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'abc');
            if (isCorrect) score++;
            detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer, questionType: 'letter-matching', questionText: name };
          });
        } else if (sectionType === 'image-tick' || question.questionType === 'image-tick') {
          const key = `${partIdx}-${secIdx}-${qIdx}`;
          const userAnswer = answers?.[key];
          const correctAnswer = question.correctAnswer ?? question.answers ?? question.answer ?? question.correct ?? null;
          if (!correctAnswer) {
            detailedResults[key] = { isCorrect: null, userAnswer: userAnswer || null, correctAnswer: null, questionType: 'image-tick', questionText: question.questionText || '' };
          } else {
            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'abc');
            if (isCorrect) score++;
            detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer, questionType: 'image-tick', questionText: question.questionText || '' };
          }
        } else {
          const key = `${partIdx}-${secIdx}-${qIdx}`;
          const userAnswer = answers[key];
          const correctAnswer = question.correctAnswer ?? question.answers ?? question.answer ?? question.correct;

          if (correctAnswer === undefined || correctAnswer === null) {
            detailedResults[key] = {
              isCorrect: null,
              userAnswer: userAnswer || null,
              correctAnswer: null,
              questionType: question.questionType || 'fill',
              questionText: question.questionText || '',
            };
            return;
          }

          const effectiveType = sectionType === 'sign-message' ? 'abc' : question.questionType || 'fill';
          total++;
          const isCorrect = scoreQuestion(userAnswer, correctAnswer, effectiveType);
          if (isCorrect) score++;
          detailedResults[key] = {
            isCorrect,
            userAnswer: userAnswer || null,
            correctAnswer,
            questionType: effectiveType,
            questionText: question.questionText || '',
          };
        }
      });
    });
  });

  return {
    score,
    total,
    percentage: total > 0 ? Math.round((score / total) * 100) : 0,
    detailedResults,
  };
};

module.exports = {
  scoreQuestion,
  scoreTest,
};