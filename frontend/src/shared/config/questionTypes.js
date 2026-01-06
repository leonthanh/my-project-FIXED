/**
 * Question Types Configuration
 * Central registry for all question types across different test formats
 * 
 * Supported Tests: IELTS, KET, PET, FLYERS, MOVERS, STARTERS
 */

// ============================================
// QUESTION TYPE DEFINITIONS
// ============================================

export const QUESTION_TYPES = {
  // =========== COMMON TYPES ===========
  'fill': {
    id: 'fill',
    label: 'Fill in the blank',
    labelVi: 'Điền vào chỗ trống',
    icon: '📝',
    description: 'Điền từ vào chỗ trống (từng câu)',
    editor: 'FillBlankEditor',
    defaultData: {
      questionText: '',
      correctAnswer: '',
    },
    supportedTests: ['ielts-listening', 'ielts-reading', 'ket-listening', 'ket-reading', 'pet-listening', 'pet-reading'],
  },

  'abc': {
    id: 'abc',
    label: 'Multiple Choice (A/B/C)',
    labelVi: 'Trắc nghiệm 3 lựa chọn',
    icon: '🔘',
    description: '3 lựa chọn A, B, C',
    editor: 'MultipleChoiceEditor',
    editorProps: { optionLabels: ['A', 'B', 'C'] },
    defaultData: {
      questionText: '',
      options: ['A. ', 'B. ', 'C. '],
      correctAnswer: '',
    },
    supportedTests: ['ielts-listening', 'ket-listening', 'ket-reading', 'pet-listening', 'pet-reading', 'flyers', 'movers'],
  },

  'abcd': {
    id: 'abcd',
    label: 'Multiple Choice (A/B/C/D)',
    labelVi: 'Trắc nghiệm 4 lựa chọn',
    icon: '🔘',
    description: '4 lựa chọn A, B, C, D',
    editor: 'MultipleChoiceEditor',
    editorProps: { optionLabels: ['A', 'B', 'C', 'D'] },
    defaultData: {
      questionText: '',
      options: ['A. ', 'B. ', 'C. ', 'D. '],
      correctAnswer: '',
    },
    supportedTests: ['ielts-listening', 'ielts-reading', 'pet-reading'],
  },

  'matching': {
    id: 'matching',
    label: 'Matching',
    labelVi: 'Nối cặp',
    icon: '🔗',
    description: 'Nối items với options A-H',
    editor: 'MatchingEditor',
    defaultData: {
      questionText: '',
      leftItems: [''],
      rightItems: ['A. ', 'B. ', 'C. '],
      answers: {},
      correctAnswer: '',
    },
    supportedTests: ['ielts-listening', 'ielts-reading', 'ket-listening', 'ket-reading', 'pet-listening', 'pet-reading'],
  },

  'multi-select': {
    id: 'multi-select',
    label: 'Multi Select',
    labelVi: 'Chọn nhiều đáp án',
    icon: '✅',
    description: 'Chọn 2-3 đáp án đúng từ A-E',
    editor: 'MultiSelectEditor',
    defaultData: {
      questionText: '',
      options: ['A. ', 'B. ', 'C. ', 'D. ', 'E. '],
      requiredAnswers: 2,
      correctAnswer: '',
    },
    supportedTests: ['ielts-listening', 'ielts-reading'],
  },

  // =========== IELTS LISTENING SPECIFIC ===========
  'form-completion': {
    id: 'form-completion',
    label: 'Form/Table Completion',
    labelVi: 'Hoàn thành form/bảng',
    icon: '📋',
    description: 'Form có bảng với nhiều blank (IELTS format)',
    editor: 'FormCompletionEditor',
    defaultData: {
      formTitle: '',
      questionRange: '',
      formRows: [
        { label: '– Example:', prefix: '', isBlank: false, blankNumber: null, suffix: 'Sample text' },
        { label: '– Field 1:', prefix: '', isBlank: true, blankNumber: 1, suffix: '' },
      ],
      answers: {},
    },
    supportedTests: ['ielts-listening', 'ielts-reading'],
  },

  'notes-completion': {
    id: 'notes-completion',
    label: 'Notes Completion',
    labelVi: 'Hoàn thành ghi chú',
    icon: '📝',
    description: 'Paste notes có ___ tự tách câu hỏi',
    editor: 'NotesCompletionEditor',
    defaultData: {
      notesTitle: '',
      notesText: '',
      wordLimit: 'ONE WORD ONLY',
      answers: {},
    },
    supportedTests: ['ielts-listening'],
  },

  'map-labeling': {
    id: 'map-labeling',
    label: 'Map/Plan Labeling',
    labelVi: 'Gắn nhãn bản đồ',
    icon: '🗺️',
    description: 'Gắn nhãn vị trí trên bản đồ A-H',
    editor: 'MapLabelingEditor',
    defaultData: {
      questionText: '',
      imageUrl: '',
      questionRange: '',
      items: [{ label: 'A', text: '' }],
      correctAnswer: '',
    },
    supportedTests: ['ielts-listening'],
  },

  'flowchart': {
    id: 'flowchart',
    label: 'Flowchart Completion',
    labelVi: 'Hoàn thành sơ đồ',
    icon: '📊',
    description: 'Hoàn thành các bước trong sơ đồ',
    editor: 'FlowchartEditor',
    defaultData: {
      questionText: '',
      questionRange: '',
      steps: [{ text: '', hasBlank: false }],
      options: ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.'],
      correctAnswer: '',
    },
    supportedTests: ['ielts-listening'],
  },

  // =========== IELTS READING SPECIFIC ===========
  'true-false-not-given': {
    id: 'true-false-not-given',
    label: 'True/False/Not Given',
    labelVi: 'Đúng/Sai/Không đề cập',
    icon: '✓✗',
    description: 'TRUE, FALSE, hoặc NOT GIVEN',
    editor: 'TFNGEditor', // Will create later
    defaultData: {
      questionText: '',
      correctAnswer: '',
    },
    supportedTests: ['ielts-reading', 'pet-reading'],
  },

  'yes-no-not-given': {
    id: 'yes-no-not-given',
    label: 'Yes/No/Not Given',
    labelVi: 'Có/Không/Không đề cập',
    icon: '✓✗',
    description: 'YES, NO, hoặc NOT GIVEN',
    editor: 'YNNGEditor', // Will create later
    defaultData: {
      questionText: '',
      correctAnswer: '',
    },
    supportedTests: ['ielts-reading'],
  },

  'matching-headings': {
    id: 'matching-headings',
    label: 'Matching Headings',
    labelVi: 'Ghép tiêu đề đoạn',
    icon: '📑',
    description: 'Ghép mỗi đoạn văn với 1 heading (i-x)',
    editor: 'MatchingHeadingsEditor', // Will create later
    defaultData: {
      paragraphs: [],
      headings: [],
      answers: {},
    },
    supportedTests: ['ielts-reading'],
  },

  'paragraph-matching': {
    id: 'paragraph-matching',
    label: 'Paragraph Matching',
    labelVi: 'Tìm thông tin ở đoạn nào',
    icon: '🔍',
    description: 'Tìm thông tin ở đoạn A-G',
    editor: 'ParagraphMatchingEditor', // Will create later
    defaultData: {
      statements: [],
      correctAnswer: '',
    },
    supportedTests: ['ielts-reading'],
  },

  'cloze-test': {
    id: 'cloze-test',
    label: 'Cloze Test',
    labelVi: 'Điền chỗ trống trong đoạn',
    icon: '📄',
    description: 'Điền từ vào các chỗ trống trong đoạn văn',
    editor: 'ClozeTestEditor', // Will create later
    defaultData: {
      passageText: '',
      blanks: [],
      answers: {},
    },
    supportedTests: ['ielts-reading', 'ket-reading', 'pet-reading'],
  },

  'sentence-completion': {
    id: 'sentence-completion',
    label: 'Sentence Completion',
    labelVi: 'Hoàn thành câu',
    icon: '✍️',
    description: 'Hoàn thành câu từ word list',
    editor: 'SentenceCompletionEditor', // Will create later
    defaultData: {
      sentences: [],
      wordList: [],
      answers: {},
    },
    supportedTests: ['ielts-reading', 'ket-reading'],
  },

  // =========== KET SPECIFIC ===========
  'sentence-transformation': {
    id: 'sentence-transformation',
    label: 'Sentence Transformation',
    labelVi: 'Biến đổi câu',
    icon: '🔄',
    description: 'Viết lại câu giữ nguyên nghĩa',
    editor: 'SentenceTransformationEditor', // Will create later
    defaultData: {
      originalSentence: '',
      promptWord: '',
      correctAnswer: '',
    },
    supportedTests: ['ket-reading', 'pet-reading'],
  },

  // =========== KET/PET WRITING ===========
  'short-message': {
    id: 'short-message',
    label: 'Short Message/Email',
    labelVi: 'Tin nhắn ngắn/Email',
    icon: '✉️',
    description: 'Viết tin nhắn ngắn (KET Part 7: 25-35 words)',
    editor: 'ShortMessageEditor',
    defaultData: {
      situation: '', // Mô tả tình huống
      recipient: '', // Người nhận (friend, teacher, etc.)
      messageType: 'email', // email, note, postcard
      bulletPoints: ['', '', ''], // 3 bullet points
      wordLimit: { min: 25, max: 35 },
      sampleAnswer: '', // Sample answer cho teacher
    },
    supportedTests: ['ket-reading', 'pet-reading'],
  },

  'story-writing': {
    id: 'story-writing',
    label: 'Story Writing',
    labelVi: 'Viết truyện ngắn',
    icon: '📖',
    description: 'Viết truyện ngắn (PET Part 7: ~100 words)',
    editor: 'StoryWritingEditor',
    defaultData: {
      openingSentence: '', // Câu mở đầu bắt buộc
      prompt: '', // Hướng dẫn thêm
      wordLimit: { min: 80, max: 100 },
      sampleAnswer: '',
    },
    supportedTests: ['pet-reading'],
  },

  // =========== YOUNG LEARNERS SPECIFIC ===========
  'matching-pictures': {
    id: 'matching-pictures',
    label: 'Matching with Pictures',
    labelVi: 'Ghép với hình ảnh',
    icon: '🖼️',
    description: 'Nối từ/câu với hình ảnh',
    editor: 'MatchingPicturesEditor', // Will create later
    defaultData: {
      items: [],
      images: [],
      answers: {},
    },
    supportedTests: ['flyers', 'movers', 'starters'],
  },

  'multiple-choice-pictures': {
    id: 'multiple-choice-pictures',
    label: 'Multiple Choice with Pictures',
    labelVi: 'Trắc nghiệm có hình',
    icon: '🎨',
    description: 'Chọn đáp án từ các hình ảnh',
    editor: 'MultipleChoicePicturesEditor', // Will create later
    defaultData: {
      questionText: '',
      imageOptions: [],
      correctAnswer: '',
    },
    supportedTests: ['flyers', 'movers', 'starters'],
  },

  'tick-cross': {
    id: 'tick-cross',
    label: 'Tick or Cross',
    labelVi: 'Đánh dấu ✓ hoặc ✗',
    icon: '✓✗',
    description: 'Đánh dấu đúng hoặc sai',
    editor: 'TickCrossEditor', // Will create later
    defaultData: {
      statements: [],
      correctAnswers: [],
    },
    supportedTests: ['starters', 'movers'],
  },
};

// ============================================
// TEST TYPE CONFIGURATIONS
// ============================================

export const TEST_CONFIGS = {
  // IELTS Tests
  'ielts-listening': {
    id: 'ielts-listening',
    name: 'IELTS Listening',
    nameVi: 'IELTS Listening',
    totalQuestions: 40,
    parts: 4,
    duration: 30, // minutes (+ 10 min transfer time)
    questionTypes: [
      'fill',
      'form-completion',
      'notes-completion',
      'abc',
      'abcd',
      'matching',
      'multi-select',
      'map-labeling',
      'flowchart',
    ],
    partStructure: [
      { part: 1, questions: '1-10', description: 'Social conversation' },
      { part: 2, questions: '11-20', description: 'Monologue in social context' },
      { part: 3, questions: '21-30', description: 'Academic discussion' },
      { part: 4, questions: '31-40', description: 'Academic lecture' },
    ],
  },

  'ielts-reading': {
    id: 'ielts-reading',
    name: 'IELTS Reading',
    nameVi: 'IELTS Reading',
    totalQuestions: 40,
    parts: 3,
    duration: 60, // minutes
    questionTypes: [
      'abc',
      'abcd',
      'multi-select',
      'fill',
      'matching',
      'true-false-not-given',
      'yes-no-not-given',
      'matching-headings',
      'paragraph-matching',
      'cloze-test',
      'sentence-completion',
    ],
    partStructure: [
      { part: 1, questions: '1-13', description: 'Passage 1' },
      { part: 2, questions: '14-26', description: 'Passage 2' },
      { part: 3, questions: '27-40', description: 'Passage 3' },
    ],
  },

  // KET (A2 Key)
  'ket-reading': {
    id: 'ket-reading',
    name: 'KET Reading & Writing',
    nameVi: 'KET Reading & Writing',
    totalQuestions: 35,
    parts: 7,
    duration: 60, // minutes
    questionTypes: [
      'abc',
      'matching',
      'fill',
      'cloze-test',
      'sentence-transformation',
      'short-message', // Part 7 Writing Task
    ],
    partStructure: [
      { part: 1, questions: '1-6', description: 'Signs & Messages - Multiple Choice' },
      { part: 2, questions: '7-13', description: 'Matching - People & Texts' },
      { part: 3, questions: '14-18', description: 'Long Text - Multiple Choice' },
      { part: 4, questions: '19-24', description: 'Cloze Test - Multiple Choice' },
      { part: 5, questions: '25-30', description: 'Cloze Test - Open Gap Fill' },
      { part: 6, questions: '31-35', description: 'Sentence Transformation' },
      { part: 7, questions: 'Writing', description: 'Writing Task - Short Message (25-35 words)' },
    ],
  },

  'ket-listening': {
    id: 'ket-listening',
    name: 'KET Listening',
    nameVi: 'KET Listening',
    totalQuestions: 25,
    parts: 5,
    duration: 30, // minutes
    questionTypes: [
      'abc',
      'fill',
      'matching',
    ],
    partStructure: [
      { part: 1, questions: '1-5', description: 'Short Conversations - 3-option Multiple Choice' },
      { part: 2, questions: '6-10', description: 'Longer Conversation - Gap Fill' },
      { part: 3, questions: '11-15', description: 'Longer Conversation - 3-option Multiple Choice' },
      { part: 4, questions: '16-20', description: 'Longer Conversation - Gap Fill' },
      { part: 5, questions: '21-25', description: 'Longer Monologue - Matching' },
    ],
  },

  // PET (B1 Preliminary)
  'pet-reading': {
    id: 'pet-reading',
    name: 'PET Reading',
    nameVi: 'PET Reading',
    totalQuestions: 32,
    parts: 6,
    duration: 45, // minutes
    questionTypes: [
      'abc',
      'abcd',
      'matching',
      'fill',
      'true-false-not-given',
      'cloze-test',
    ],
    partStructure: [
      { part: 1, questions: '1-5', description: 'Short Texts - 3-option Multiple Choice' },
      { part: 2, questions: '6-10', description: 'Matching - People & Texts' },
      { part: 3, questions: '11-15', description: 'Long Text - 4-option Multiple Choice' },
      { part: 4, questions: '16-20', description: 'Long Text - Gap Fill' },
      { part: 5, questions: '21-26', description: 'Cloze Test - Multiple Choice' },
      { part: 6, questions: '27-32', description: 'Cloze Test - Open Gap Fill' },
    ],
  },

  'pet-listening': {
    id: 'pet-listening',
    name: 'PET Listening',
    nameVi: 'PET Listening',
    totalQuestions: 25,
    parts: 4,
    duration: 36, // minutes
    questionTypes: [
      'abc',
      'fill',
      'matching',
      'true-false-not-given',
    ],
    partStructure: [
      { part: 1, questions: '1-7', description: 'Short Conversations - 3-option Multiple Choice' },
      { part: 2, questions: '8-13', description: 'Longer Monologue - Gap Fill' },
      { part: 3, questions: '14-19', description: 'Longer Conversation - Matching' },
      { part: 4, questions: '20-25', description: 'Interview - True/False' },
    ],
  },

  // Young Learners
  'flyers': {
    id: 'flyers',
    name: 'Cambridge Flyers',
    nameVi: 'Cambridge Flyers (A2)',
    totalQuestions: 50,
    parts: 5,
    duration: 40, // minutes (reading & writing)
    questionTypes: [
      'matching-pictures',
      'multiple-choice-pictures',
      'abc',
      'fill',
    ],
    partStructure: [
      { part: 1, questions: '1-10', description: 'Matching Definitions' },
      { part: 2, questions: '11-16', description: 'Conversation Gap Fill' },
      { part: 3, questions: '17-22', description: 'Picture Story - Choose Best Answer' },
      { part: 4, questions: '23-28', description: 'Reading Comprehension' },
      { part: 5, questions: '29-35', description: 'Story Writing' },
    ],
  },

  'movers': {
    id: 'movers',
    name: 'Cambridge Movers',
    nameVi: 'Cambridge Movers (A1)',
    totalQuestions: 40,
    parts: 6,
    duration: 30, // minutes (reading & writing)
    questionTypes: [
      'matching-pictures',
      'multiple-choice-pictures',
      'abc',
      'fill',
      'tick-cross',
    ],
    partStructure: [
      { part: 1, questions: '1-5', description: 'Matching Names to People' },
      { part: 2, questions: '6-10', description: 'True/False Picture' },
      { part: 3, questions: '11-16', description: 'Conversation Gap Fill' },
      { part: 4, questions: '17-23', description: 'Text Gap Fill' },
      { part: 5, questions: '24-29', description: 'Story Completion' },
      { part: 6, questions: '30-35', description: 'Story Writing' },
    ],
  },

  'starters': {
    id: 'starters',
    name: 'Cambridge Starters',
    nameVi: 'Cambridge Starters (Pre-A1)',
    totalQuestions: 25,
    parts: 5,
    duration: 20, // minutes (reading & writing)
    questionTypes: [
      'matching-pictures',
      'tick-cross',
      'fill',
    ],
    partStructure: [
      { part: 1, questions: '1-5', description: 'Word-Picture Matching' },
      { part: 2, questions: '6-10', description: 'Tick/Cross' },
      { part: 3, questions: '11-15', description: 'Word Gap Fill' },
      { part: 4, questions: '16-20', description: 'Text Gap Fill' },
      { part: 5, questions: '21-25', description: 'Picture Description' },
    ],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get question types available for a specific test type
 */
export const getQuestionTypesForTest = (testTypeId) => {
  const testConfig = TEST_CONFIGS[testTypeId];
  if (!testConfig) return [];
  
  return testConfig.questionTypes
    .map(typeId => QUESTION_TYPES[typeId])
    .filter(Boolean);
};

/**
 * Get default question data by type
 */
export const getDefaultQuestionData = (questionTypeId) => {
  const questionType = QUESTION_TYPES[questionTypeId];
  if (!questionType) {
    return { questionText: '', correctAnswer: '' };
  }
  return { ...questionType.defaultData, questionType: questionTypeId };
};

/**
 * Get question type info
 */
export const getQuestionTypeInfo = (questionTypeId) => {
  return QUESTION_TYPES[questionTypeId] || null;
};

/**
 * Get test config
 */
export const getTestConfig = (testTypeId) => {
  return TEST_CONFIGS[testTypeId] || null;
};

/**
 * Get all available test types
 */
export const getAllTestTypes = () => {
  return Object.values(TEST_CONFIGS);
};

/**
 * Get question types grouped by category
 */
export const getQuestionTypesByCategory = () => {
  const categories = {
    common: {
      label: 'Dạng câu hỏi phổ biến',
      types: ['fill', 'abc', 'abcd', 'matching', 'multi-select'],
    },
    ieltsListening: {
      label: 'IELTS Listening',
      types: ['form-completion', 'notes-completion', 'map-labeling', 'flowchart'],
    },
    ieltsReading: {
      label: 'IELTS Reading',
      types: ['true-false-not-given', 'yes-no-not-given', 'matching-headings', 'paragraph-matching', 'cloze-test', 'sentence-completion'],
    },
    cambridge: {
      label: 'Cambridge (KET/PET)',
      types: ['sentence-transformation'],
    },
    youngLearners: {
      label: 'Young Learners',
      types: ['matching-pictures', 'multiple-choice-pictures', 'tick-cross'],
    },
  };

  return Object.entries(categories).map(([key, category]) => ({
    key,
    label: category.label,
    types: category.types.map(typeId => QUESTION_TYPES[typeId]).filter(Boolean),
  }));
};

export default {
  QUESTION_TYPES,
  TEST_CONFIGS,
  getQuestionTypesForTest,
  getDefaultQuestionData,
  getQuestionTypeInfo,
  getTestConfig,
  getAllTestTypes,
  getQuestionTypesByCategory,
};
