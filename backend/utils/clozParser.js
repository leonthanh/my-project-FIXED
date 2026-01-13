/**
 * Cloze Test Parser Utility
 * Parses blanks from passageText HTML and creates blanks array
 * Used for cloze-test (Open Cloze) questions
 */

/**
 * Parse blanks from cloze-test passage
 * Supports: (1), (2), [1], [2], ___, ______
 * 
 * @param {string} passageHtml - HTML passage text with blanks marked
 * @param {number} startingNumber - First question number (default: 25 for KET Part 5)
 * @returns {Array} Array of blank objects with questionNum, fullMatch
 */
function parseClozeTestBlanks(passageHtml, startingNumber = 25) {
  if (!passageHtml || typeof passageHtml !== 'string') {
    return [];
  }

  // Strip HTML tags to get plain text for parsing
  const tempDiv = {
    innerHTML: passageHtml,
    textContent: stripHtmlTags(passageHtml)
  };
  const plainText = tempDiv.textContent || '';

  const blanks = [];
  
  // Try numbered patterns first: (1), [1], (25), [25], etc.
  const numberedPattern = /\((\d+)\)|\[(\d+)\]/g;
  let match;
  
  while ((match = numberedPattern.exec(plainText)) !== null) {
    const num = parseInt(match[1] || match[2]);
    blanks.push({
      questionNum: num,
      fullMatch: match[0],
      index: match.index,
      type: 'numbered'
    });
  }
  
  // If no numbered blanks found, look for underscores: ___, _______, ………
  if (blanks.length === 0) {
    const underscorePattern = /[_…]{3,}/g;
    let blankIndex = 0;
    
    while ((match = underscorePattern.exec(plainText)) !== null) {
      blanks.push({
        questionNum: startingNumber + blankIndex,
        fullMatch: match[0],
        index: match.index,
        type: 'underscore'
      });
      blankIndex++;
    }
  }
  
  // Sort by question number
  blanks.sort((a, b) => a.questionNum - b.questionNum);
  
  return blanks;
}

/**
 * Strip HTML tags from string
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
function stripHtmlTags(html) {
  // For Node.js environment (backend)
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]*>/g, '');
  }
  
  // For browser environment
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Process cloze-test question data
 * Adds blanks array if not present
 * 
 * @param {Object} question - Question data
 * @returns {Object} Question with blanks array added
 */
function processClozeTestQuestion(question) {
  if (!question) return question;
  
  // Already has blanks, return as-is
  if (question.blanks && Array.isArray(question.blanks)) {
    return question;
  }
  
  // Parse blanks from passageText
  const passageText = question.passageText || question.passage || '';
  const startingNumber = question.startingNumber || 25;
  
  const blanks = parseClozeTestBlanks(passageText, startingNumber);
  
  return {
    ...question,
    blanks: blanks,
    // Keep both for compatibility
    passageText: passageText || question.passageText
  };
}

/**
 * Normalize question data
 * Rename 'answer' field to 'correctAnswer' for consistency with scoring logic
 * 
 * @param {Object} question - Question data
 * @returns {Object} Question with normalized fields
 */
function normalizeQuestion(question) {
  if (!question) return question;
  
  // If question has 'answer' but not 'correctAnswer', rename it
  if (question.answer !== undefined && question.correctAnswer === undefined) {
    const { answer, ...rest } = question;
    return {
      ...rest,
      correctAnswer: answer
    };
  }
  
  return question;
}

/**
 * Process all questions in a test part
 * For cloze-test questions, parse and add blanks array
 * Also normalize all questions to have 'correctAnswer' field
 * 
 * @param {Object} part - Test part with questions
 * @returns {Object} Part with processed questions
 */
function processPartQuestions(part) {
  if (!part || !part.sections) {
    return part;
  }
  
  return {
    ...part,
    sections: part.sections.map(section => {
      return {
        ...section,
        questions: section.questions.map(q => {
          // For cloze-test, parse blanks first, then normalize
          if (section.questionType === 'cloze-test') {
            q = processClozeTestQuestion(q);
          }
          // Always normalize to have correctAnswer field
          return normalizeQuestion(q);
        })
      };
    })
  };
}

/**
 * Process entire test parts array
 * For all cloze-test questions, parse and add blanks array
 * 
 * @param {Array} parts - Test parts array
 * @returns {Array} Parts with processed questions
 */
function processTestParts(parts) {
  if (!Array.isArray(parts)) {
    return parts;
  }
  
  return parts.map(part => processPartQuestions(part));
}

module.exports = {
  parseClozeTestBlanks,
  stripHtmlTags,
  processClozeTestQuestion,
  normalizeQuestion,
  processPartQuestions,
  processTestParts
};
