/**
 * Question Helper Functions for Reading Test
 * Các hàm xử lý câu hỏi
 */

/**
 * Tính số câu hỏi thực tế từ questionNumber
 * Xử lý các format: "38-40" (3 câu), "38" (1 câu), "38,39,40" (3 câu)
 * @param {string|number} questionNumber 
 * @returns {number} Số câu hỏi
 */
export const getQuestionCount = (questionNumber) => {
  if (!questionNumber) return 1;
  
  const qNum = String(questionNumber).trim();
  
  // Handle range format: "38-40"
  if (qNum.includes('-') && !qNum.includes(',')) {
    const parts = qNum.split('-').map(p => p.trim());
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        return end - start + 1;
      }
    }
  }
  
  // Handle comma-separated format: "38,39,40"
  if (qNum.includes(',')) {
    const parts = qNum.split(',').map(p => p.trim()).filter(p => p);
    return parts.length;
  }
  
  // Single number: "38"
  return 1;
};

/**
 * Tính tổng số câu hỏi trong tất cả passages
 * @param {Array} passages - Mảng passages
 * @returns {number} Tổng số câu hỏi
 */
export const calculateTotalQuestions = (passages) => {
  if (!passages || !Array.isArray(passages)) return 0;
  
  let total = 0;
  
  passages.forEach((p) => {
    p.sections?.forEach((sec) => {
      sec.questions?.forEach((q) => {
        total += getQuestionCount(q.questionNumber);
      });
    });
  });
  
  return total;
};

/**
 * Tạo câu hỏi mặc định theo loại
 * @param {string} type - Loại câu hỏi
 * @returns {Object} Câu hỏi mặc định
 */
export const createDefaultQuestionByType = (type) => {
  const baseQuestion = {
    questionNumber: 1,
    questionType: type,
    questionText: '',
    correctAnswer: '',
    options: []
  };

  switch (type) {
    case 'multiple-choice':
      return { ...baseQuestion, options: ['', '', '', ''] };
    
    case 'multi-select':
      return { ...baseQuestion, options: ['', '', '', '', ''], maxSelection: 2 };
    
    case 'fill-in-the-blanks':
      return { ...baseQuestion, maxWords: 3 };
    
    case 'matching':
      return { 
        ...baseQuestion, 
        questionText: 'Match the items:',
        leftItems: ['Item A', 'Item B', 'Item C'],
        rightItems: ['Item 1', 'Item 2', 'Item 3'],
        matches: ['1', '2', '3']
      };
    
    case 'true-false-not-given':
      return { ...baseQuestion, correctAnswer: 'TRUE' };
    
    case 'yes-no-not-given':
      return { ...baseQuestion, correctAnswer: 'YES' };
    
    case 'cloze-test':
      return {
        ...baseQuestion,
        paragraphText: 'Another example of cheap technology helping poor people in the countryside is [BLANK]. Kerosene lamps and conventional bulbs give off less [BLANK] than GSBF lamps.',
        maxWords: 3,
        blanks: [
          { id: 'blank_0', blankNumber: 1, correctAnswer: '' },
          { id: 'blank_1', blankNumber: 2, correctAnswer: '' }
        ]
      };
    
    case 'paragraph-matching':
      return { ...baseQuestion, correctAnswer: 'A' };
    
    case 'sentence-completion':
      return { ...baseQuestion, options: ['', '', '', ''], correctAnswer: 'A' };
    
    case 'paragraph-fill-blanks':
      return { 
        ...baseQuestion, 
        paragraphText: '',
        blanks: [
          { id: 'blank1', correctAnswer: '' },
          { id: 'blank2', correctAnswer: '' },
          { id: 'blank3', correctAnswer: '' }
        ],
        options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
      };
    
    case 'short-answer':
      return { ...baseQuestion, maxWords: 3 };
    
    default:
      return { ...baseQuestion, options: ['', '', '', ''] };
  }
};

/**
 * Tạo passage mới với section mặc định
 * @returns {Object} Passage mới
 */
export const createNewPassage = () => ({
  passageTitle: '', 
  passageText: '', 
  sections: [
    {
      sectionTitle: '',
      sectionInstruction: '',
      sectionImage: null,
      questions: [{ 
        questionNumber: 1, 
        questionType: 'multiple-choice', 
        questionText: '', 
        options: [''], 
        correctAnswer: '' 
      }]
    }
  ]
});

/**
 * Tạo section mới
 * @param {number} sectionNumber - Số thứ tự section
 * @returns {Object} Section mới
 */
export const createNewSection = (sectionNumber = 1) => ({
  sectionTitle: `Section ${sectionNumber}`,
  sectionInstruction: '',
  sectionImage: null,
  questions: []
});

/**
 * Tạo câu hỏi mới mặc định
 * @param {number} questionNumber - Số thứ tự câu hỏi
 * @returns {Object} Câu hỏi mới
 */
export const createNewQuestion = (questionNumber = 1) => ({
  questionNumber,
  questionType: 'multiple-choice',
  questionText: '',
  options: [''],
  correctAnswer: ''
});
