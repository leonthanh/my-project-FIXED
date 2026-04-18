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
    iconName: 'writing',
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
    iconName: 'choice',
    description: '3 lựa chọn A, B, C',
    editor: 'MultipleChoiceEditor',
    editorProps: { optionLabels: ['A', 'B', 'C'] },
    defaultData: {
      questionText: '',
      options: ['A. ', 'B. ', 'C. '],
      correctAnswer: '',
    },
    supportedTests: ['ielts-listening', 'ielts-reading', 'ket-listening', 'ket-reading', 'pet-listening', 'pet-reading', 'flyers', 'movers'],
  },

  'abcd': {
    id: 'abcd',
    label: 'Multiple Choice (A/B/C/D)',
    labelVi: 'Trắc nghiệm 4 lựa chọn',
    iconName: 'choice',
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
    iconName: 'matching',
    description: 'Nối items với options A-H',
    editor: 'MatchingEditor',
    defaultData: {
      questionText: '',
      leftTitle: 'Items',
      rightTitle: 'Options',
      leftItems: [''],
      rightItems: ['A. ', 'B. ', 'C. '],
      answers: {},
      correctAnswer: '',
    },
    supportedTests: ['ielts-listening', 'ielts-reading', 'ket-listening', 'ket-reading', 'pet-listening', 'pet-reading'],
  },

  'gap-match': {
    id: 'gap-match',
    label: 'Gap Match (Drag & Drop)',
    labelVi: 'Kéo chữ vào ô',
    iconName: 'matching',
    description: 'Kéo lựa chọn vào các ô trống theo hàng (Part 5 Listening)',
    editor: 'GapMatchEditor',
    defaultData: {
      questionText: '',
      leftTitle: 'People',
      rightTitle: 'Food',
      studentTitle: '',
      exampleText: '',
      exampleAnswer: '',
      leftItems: ['Barbara', 'Simon', 'Anita', 'Peter', 'Michael'],
      options: ['bread', 'cheese', 'chicken', 'fish', 'fruit', 'ice cream', 'salad'],
      correctAnswers: [],
    },
    supportedTests: ['ket-listening'],
  },

  'multi-select': {
    id: 'multi-select',
    label: 'Multi Select',
    labelVi: 'Chọn nhiều đáp án',
    iconName: 'multi-select',
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
    iconName: 'form',
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
    iconName: 'writing',
    description: 'Paste notes có ___ tự tách câu hỏi',
    editor: 'NotesCompletionEditor',
    defaultData: {
      notesTitle: '',
      notesText: '',
      wordLimit: 'ONE WORD ONLY',
      answers: {},
    },
    supportedTests: ['ielts-listening', 'ielts-reading'],
  },

  'table-completion': {
    id: 'table-completion',
    label: 'Table Completion',
    labelVi: 'Hoàn thành bảng/Ghi chú',
    iconName: 'table',
    description: 'Bảng 3 cột (Vehicles / Cost / Comments) với blanks đánh số',
    editor: 'TableCompletionEditor',
    defaultData: {
      title: '',
      instruction: 'Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
      columns: ['Vehicles', 'Cost', 'Comments'],
      rows: [
        { vehicle: 'Motor scooter', cost: '1 $ ______ per day', comments: ['- fun to ride', '- they provide helmets and ______'] },
        { vehicle: 'Economy car', cost: '$87.80 per day', comments: ['- four doors, five passengers', '- can drive on all the roads and to ______ for a swim'] },
      ],
      startingQuestionNumber: 1,
      maxWords: 2,
    },
    supportedTests: ['ielts-listening'],
  },

  'map-labeling': {
    id: 'map-labeling',
    label: 'Map/Plan Labeling',
    labelVi: 'Gắn nhãn bản đồ',
    iconName: 'map',
    description: 'Gắn nhãn vị trí trên bản đồ A-H',
    editor: 'MapLabelingEditor',
    defaultData: {
      questionText: '',
      imageUrl: '',
      questionRange: '',
      items: [{ label: 'A', text: '' }],
      correctAnswer: '',
    },
    supportedTests: ['ielts-listening', 'ielts-reading'],
  },

  'flowchart': {
    id: 'flowchart',
    label: 'Flowchart Completion',
    labelVi: 'Hoàn thành sơ đồ',
    iconName: 'flowchart',
    description: 'Hoàn thành các bước trong sơ đồ',
    editor: 'FlowchartEditor',
    defaultData: {
      questionText: '',
      questionRange: '',
      steps: [{ text: '', hasBlank: false }],
      options: ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.'],
      correctAnswer: '',
    },
    supportedTests: ['ielts-listening', 'ielts-reading'],
  },

  // =========== IELTS READING SPECIFIC ===========
  'true-false-not-given': {
    id: 'true-false-not-given',
    label: 'True/False/Not Given',
    labelVi: 'Đúng/Sai/Không đề cập',
    iconName: 'correct',
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
    iconName: 'correct',
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
    iconName: 'document',
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
    iconName: 'search',
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
    label: 'Open Cloze',
    labelVi: 'Điền chỗ trống',
    iconName: 'document',
    description: 'Điền từ vào các chỗ trống trong đoạn văn',
    editor: 'ClozeTestEditor', // Will create later
    defaultData: {
      passageText: '',
      blanks: [],
      answers: {},
    },
    supportedTests: ['ielts-listening', 'ielts-reading', 'ket-reading', 'pet-reading'],
  },

  'summary-completion': {
    id: 'summary-completion',
    label: 'Summary Completion (A-L)',
    labelVi: 'Hoàn thành đoạn (A-L)',
    iconName: 'selector',
    description: 'Hoàn thành đoạn bằng cách ghi chữ cái A-L tương ứng với danh sách từ cho sẵn',
    editor: 'SummaryCompletionEditor',
    defaultData: {
      questionText: '',
      options: [],
      blanks: [],
    },
    supportedTests: ['ielts-reading', 'ket-reading'],
  },

  'sentence-completion': {
    id: 'sentence-completion',
    label: 'Sentence Completion',
    labelVi: 'Hoàn thành câu',
    iconName: 'writing',
    description: 'Hoàn thành câu từ word list',
    editor: 'SentenceCompletionEditor', // Will create later
    defaultData: {
      sentences: [],
      wordList: [],
      answers: {},
    },
    supportedTests: ['ielts-reading', 'ket-reading'],
  },

  // =========== KET SPECIFIC PARTS ===========
  'sign-message': {
    id: 'sign-message',
    label: 'Signs & Messages',
    labelVi: 'Biển báo & Thông báo',
    iconName: 'tag',
    description: 'KET Part 1: Đọc biển báo + chọn ý nghĩa đúng (A/B/C)',
    editor: 'SignMessageEditor',
    defaultData: {
      imageUrl: '',
      imageAlt: '',
      signText: '',
      options: ['A. ', 'B. ', 'C. '],
      correctAnswer: '',
    },
    supportedTests: ['ket-reading'],
  },

  'people-matching': {
    id: 'people-matching',
    label: 'People Matching',
    labelVi: 'Nối người với văn bản',
    iconName: 'user',
    description: 'KET Part 2: 5 người + 8 texts, nối cặp phù hợp',
    editor: 'PeopleMatchingEditor',
    defaultData: {
      description: '',
      people: [
        { id: 'A', name: '', need: '' },
        { id: 'B', name: '', need: '' },
        { id: 'C', name: '', need: '' },
        { id: 'D', name: '', need: '' },
        { id: 'E', name: '', need: '' },
      ],
      texts: [
        { id: 'A', title: '', content: '' },
        { id: 'B', title: '', content: '' },
        { id: 'C', title: '', content: '' },
        { id: 'D', title: '', content: '' },
        { id: 'E', title: '', content: '' },
        { id: 'F', title: '', content: '' },
        { id: 'G', title: '', content: '' },
        { id: 'H', title: '', content: '' },
      ],
      answers: {},
    },
    supportedTests: ['ket-reading', 'ket-listening'],
  },

  'long-text-mc': {
    id: 'long-text-mc',
    label: 'Long Text + Multiple Choice',
    labelVi: 'Đoạn văn dài + Trắc nghiệm',
    iconName: 'reading',
    description: 'KET Part 3: 1 đoạn văn dài + 5 câu MC',
    editor: 'LongTextMCEditor',
    defaultData: {
      passageTitle: '',
      passage: '',
      passageType: 'conversation',
      questions: [
        { questionText: '', options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
        { questionText: '', options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
        { questionText: '', options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
        { questionText: '', options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
        { questionText: '', options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
      ],
    },
    supportedTests: ['ket-reading', 'pet-reading'],
  },

  'cloze-mc': {
    id: 'cloze-mc',
    label: 'Multiple Choice Cloze',
    labelVi: 'Cloze trắc nghiệm',
    iconName: 'form',
    description: 'KET Part 4: Đoạn văn + chọn từ A/B/C cho mỗi blank',
    editor: 'ClozeMCEditor',
    defaultData: {
      passageTitle: '',
      passage: '',
      blanks: [
        { number: 16, options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
        { number: 17, options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
        { number: 18, options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
        { number: 19, options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
        { number: 20, options: ['A. ', 'B. ', 'C. '], correctAnswer: '' },
      ],
    },
    supportedTests: ['ket-reading', 'pet-reading'],
  },

  'inline-choice': {
    id: 'inline-choice',
    label: 'Inline Choice (PET Part 5)',
    labelVi: 'Chon dap an trong doan van',
    iconName: 'chevron-down',
    description: 'PET Part 5: Chon dap an A-D ngay trong doan van',
    editor: 'InlineChoiceEditor',
    defaultData: {
      passageTitle: '',
      passage: '',
      blanks: [
        { number: 21, options: ['temperature', 'condition', 'climate', 'weather'], correctAnswer: '' },
        { number: 22, options: ['temperature', 'condition', 'climate', 'weather'], correctAnswer: '' },
        { number: 23, options: ['temperature', 'condition', 'climate', 'weather'], correctAnswer: '' },
        { number: 24, options: ['temperature', 'condition', 'climate', 'weather'], correctAnswer: '' },
        { number: 25, options: ['temperature', 'condition', 'climate', 'weather'], correctAnswer: '' },
        { number: 26, options: ['temperature', 'condition', 'climate', 'weather'], correctAnswer: '' },
      ],
    },
    supportedTests: ['pet-reading'],
  },

  'word-form': {
    id: 'word-form',
    label: 'Word Formation',
    labelVi: 'Biến đổi từ',
    iconName: 'edit',
    description: 'KET Part 6: Cho từ gốc, biến đổi điền vào chỗ trống',
    editor: 'WordFormEditor',
    defaultData: {
      sentences: [
        { sentence: '', rootWord: '', correctAnswer: '' },
        { sentence: '', rootWord: '', correctAnswer: '' },
        { sentence: '', rootWord: '', correctAnswer: '' },
        { sentence: '', rootWord: '', correctAnswer: '' },
        { sentence: '', rootWord: '', correctAnswer: '' },
        { sentence: '', rootWord: '', correctAnswer: '' },
      ],
    },
    supportedTests: ['ket-reading', 'pet-reading'],
  },

  'sentence-transformation': {
    id: 'sentence-transformation',
    label: 'Sentence Transformation',
    labelVi: 'Biến đổi câu',
    iconName: 'retry',
    description: 'Viết lại câu giữ nguyên nghĩa',
    editor: 'SentenceTransformationEditor',
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
    iconName: 'mail',
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
    iconName: 'reading',
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
    iconName: 'image',
    description: 'Nối từ/câu với hình ảnh',
    editor: 'MatchingPicturesEditor',
    defaultData: {
      description: '',
      examplePrompt: '',
      exampleAnswer: '',
      choices: [
        { id: 'A', label: '', imageUrl: '' },
        { id: 'B', label: '', imageUrl: '' },
        { id: 'C', label: '', imageUrl: '' },
        { id: 'D', label: '', imageUrl: '' },
        { id: 'E', label: '', imageUrl: '' },
        { id: 'F', label: '', imageUrl: '' },
      ],
      prompts: [
        { number: 1, text: '', correctAnswer: '' },
        { number: 2, text: '', correctAnswer: '' },
        { number: 3, text: '', correctAnswer: '' },
        { number: 4, text: '', correctAnswer: '' },
        { number: 5, text: '', correctAnswer: '' },
      ],
    },
    supportedTests: ['flyers', 'movers', 'starters'],
  },

  'image-cloze': {
    id: 'image-cloze',
    label: 'Image Cloze (Drag & Drop)',
    labelVi: 'Điền ảnh vào đoạn văn',
    iconName: 'image',
    description: 'Kéo ảnh vào ô trống trong đoạn văn (Movers Part 3)',
    editor: 'ImageClozeEditor',
    defaultData: {
      passageTitle: '',
      passageText: '',
      imageBank: [],
      answers: {},
      titleQuestion: {
        enabled: false,
        text: 'Now choose the best name for the story. Tick one box.',
        options: ['', '', ''],
        correctAnswer: '',
      },
    },
    supportedTests: ['movers'],
  },

  'word-drag-cloze': {
    id: 'word-drag-cloze',
    label: 'Word Drag & Drop Cloze',
    labelVi: 'Kéo từ vào chỗ trống',
    iconName: 'edit',
    description: 'Movers Part 4: Đọc đoạn văn, kéo thả từ đúng vào chỗ trống (3 lựa chọn/blank)',
    editor: 'WordDragClozeEditor',
    defaultData: {
      passageTitle: '',
      passageImage: '',
      passageText: '',
      exampleAnswer: 'one',
      blanks: [
        { number: 1, options: ['', '', ''], correctAnswer: '' },
      ],
    },
    supportedTests: ['movers'],
  },

  'story-completion': {
    id: 'story-completion',
    label: 'Story Completion',
    labelVi: 'Hoàn thành câu chuyện',
    iconName: 'reading',
    description: 'Movers Part 5: Đọc câu chuyện + điền từ vào chỗ trống (gõ từng chữ cái)',
    editor: 'StoryCompletionEditor',
    defaultData: {
      storyTitle: '',
      storyImages: ['', ''],
      storyText: '',
      examples: [
        { sentence: '', answer: '' },
        { sentence: '', answer: '' },
      ],
      items: [
        { sentence: '', answer: '' },
        { sentence: '', answer: '' },
        { sentence: '', answer: '' },
        { sentence: '', answer: '' },
        { sentence: '', answer: '' },
        { sentence: '', answer: '' },
        { sentence: '', answer: '' },
      ],
    },
    supportedTests: ['movers'],
  },

  'look-read-write': {
    id: 'look-read-write',
    label: 'Look, Read & Write',
    labelVi: 'Nhìn tranh và viết',
    iconName: 'image',
    description: 'Movers Part 6: Nhìn tranh + complete sentences + answer questions + write sentences',
    editor: 'LookReadWriteEditor',
    defaultData: {
      examples: [
        { sentence: '', answer: '' },
        { sentence: '', answer: '' },
      ],
      groups: [
        {
          instruction: 'Complete the sentences.',
          type: 'complete',
          items: [
            { sentence: '', answer: '' },
            { sentence: '', answer: '' },
          ],
        },
        {
          instruction: 'Answer the questions.',
          type: 'answer',
          items: [
            { sentence: '', answer: '' },
            { sentence: '', answer: '' },
          ],
        },
        {
          instruction: 'Now write two sentences about the picture.',
          type: 'write',
          items: [
            { sentence: '', answer: '' },
            { sentence: '', answer: '' },
          ],
        },
      ],
    },
    supportedTests: ['movers'],
  },

  'multiple-choice-pictures': {
    id: 'multiple-choice-pictures',
    label: 'Multiple Choice with Pictures',
    labelVi: 'Trắc nghiệm có hình',
    iconName: 'image',
    description: 'Chọn đáp án từ các hình ảnh',
    editor: 'MultipleChoicePicturesEditor', // Will create later
    defaultData: {
      questionText: '',
      imageOptions: [
        { imageUrl: '', text: '' },
        { imageUrl: '', text: '' },
        { imageUrl: '', text: '' },
      ],
      correctAnswer: '',
    },
    supportedTests: ['ket-listening', 'flyers', 'movers', 'starters'],
  },

  'tick-cross': {
    id: 'tick-cross',
    label: 'Tick or Cross',
    labelVi: 'Đánh dấu đúng hoặc sai',
    iconName: 'correct',
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

// Keep KET Listening + KET Reading builder question types in sync
const KET_UNIFIED_QUESTION_TYPES = [
  // KET Reading & Writing (Part-specific)
  'sign-message',
  'people-matching',
  'long-text-mc',
  'cloze-mc',
  'cloze-test',
  'word-form',
  'short-message',

  // KET Listening (common types)
  'abc',
  'multiple-choice-pictures',
  'fill',
  'matching',
  'gap-match',
];

const PET_READING_QUESTION_TYPES = KET_UNIFIED_QUESTION_TYPES.concat('inline-choice');

export const TEST_CONFIGS = {
  // IELTS Tests
  'ielts-listening': {
    id: 'ielts-listening',
    name: 'IX Listening',
    nameVi: 'IX Listening',
    totalQuestions: 40,
    parts: 4,
    duration: 30, // minutes (+ 10 min transfer time)
    questionTypes: [
      'fill',
      'form-completion',
      'table-completion',
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
    name: 'IX Reading',
    nameVi: 'IX Reading',
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
    totalQuestions: 32,
    parts: 7,
    duration: 60, // minutes
    questionTypes: KET_UNIFIED_QUESTION_TYPES,
    partStructure: [
      { part: 1, questions: '1-6', questionType: 'sign-message', description: 'Signs & Messages - Hình biển báo + chọn A/B/C' },
      { part: 2, questions: '7-13', questionType: 'people-matching', description: 'Matching - 5 người nối với 8 texts' },
      { part: 3, questions: '14-18', questionType: 'long-text-mc', description: 'Long Text - Đoạn văn dài + 5 câu MC' },
      { part: 4, questions: '19-24', questionType: 'cloze-mc', description: 'Cloze MC - Chọn từ A/B/C cho mỗi blank' },
      { part: 5, questions: '25-30', questionType: 'cloze-test', description: 'Open Cloze - Điền từ vào chỗ trống' },
      { part: 6, questions: '31-36', questionType: 'word-form', description: 'Word Formation - Biến đổi từ' },
      { part: 7, questions: 'Writing', questionType: 'short-message', description: 'Writing Task - Short Message (25-35 words)' },
    ],
  },

  'ket-listening': {
    id: 'ket-listening',
    name: 'KET Listening',
    nameVi: 'KET Listening',
    totalQuestions: 25,
    parts: 5,
    duration: 30, // minutes
    questionTypes: KET_UNIFIED_QUESTION_TYPES,
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
    parts: 7,
    duration: 45, // minutes
    questionTypes: PET_READING_QUESTION_TYPES,
    partStructure: [
      { part: 1, questions: '1-6', questionType: 'sign-message', description: 'Signs & Messages - Hình biển báo + chọn A/B/C' },
      { part: 2, questions: '7-13', questionType: 'people-matching', description: 'Matching - 5 người nối với 8 texts' },
      { part: 3, questions: '14-18', questionType: 'long-text-mc', description: 'Long Text - Đoạn văn dài + 5 câu MC' },
      { part: 4, questions: '19-24', questionType: 'cloze-mc', description: 'Cloze MC - Chọn từ A/B/C cho mỗi blank' },
      { part: 5, questions: '25-30', questionType: 'inline-choice', description: 'Inline Choice - Chọn từ trong đoạn văn' },
      { part: 6, questions: '31-36', questionType: 'word-form', description: 'Word Formation / Open Cloze - Biến đổi từ hoặc điền từ' },
      { part: 7, questions: 'Writing', questionType: 'short-message', description: 'Writing Task - Short Message (25-35 words)' },
    ],
  },

  'pet-listening': {
    id: 'pet-listening',
    name: 'PET Listening',
    nameVi: 'PET Listening',
    totalQuestions: 25,
    parts: 5,
    duration: 30, // minutes
    questionTypes: KET_UNIFIED_QUESTION_TYPES,
    partStructure: [
      { part: 1, questions: '1-5', description: 'Short Conversations - 3-option Multiple Choice' },
      { part: 2, questions: '6-10', description: 'Longer Conversation - Gap Fill' },
      { part: 3, questions: '11-15', description: 'Longer Conversation - 3-option Multiple Choice' },
      { part: 4, questions: '16-20', description: 'Longer Conversation - Gap Fill' },
      { part: 5, questions: '21-25', description: 'Longer Monologue - Matching' },
    ],
  },

  'pet-writing': {
    id: 'pet-writing',
    name: 'PET Writing',
    nameVi: 'PET Writing',
    totalQuestions: 2,
    parts: 2,
    duration: 45, // minutes
    questionTypes: [],
    partStructure: [
      { part: 1, questions: '1', description: 'Email writing (about 100 words)' },
      { part: 2, questions: '2-3', description: 'Answer one of two questions (about 100 words)' },
    ],
  },

  // Young Learners
  'flyers': {
    id: 'flyers',
    name: 'Orange Flyers',
    nameVi: 'Orange Flyers (A2)',
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
    name: 'Orange Movers',
    nameVi: 'Orange Movers (A1)',
    totalQuestions: 35,
    parts: 6,
    duration: 30, // minutes (reading & writing)
    questionTypes: [
      'matching-pictures',
      'image-cloze',
      'word-drag-cloze',
      'story-completion',
      'look-read-write',
      'multiple-choice-pictures',
      'abc',
      'fill',
      'tick-cross',
      'cloze-mc',
      'word-form',
      'short-message',
    ],
    partStructure: [
      { part: 1, questions: '1-5', description: 'Word and definition matching' },
      { part: 2, questions: '6-10', description: 'Short dialogues - choose A/B/C' },
      { part: 3, questions: '11-15', description: 'Story gap fill - choose A/B/C' },
      { part: 4, questions: '16-22', description: 'Cloze with options' },
      { part: 5, questions: '23-29', description: 'Story short answers (1-3 words)' },
      { part: 6, questions: '30-35', description: 'Picture-based sentences and writing' },
    ],
  },

  'movers-listening': {
    id: 'movers-listening',
    name: 'Orange Movers Listening',
    nameVi: 'Orange Movers Listening (A1)',
    totalQuestions: 25,
    parts: 5,
    duration: 25, // minutes
    questionTypes: [
      'fill',
      'matching',
      'multiple-choice-pictures',
      'abc',
    ],
    partStructure: [
      { part: 1, questions: '1-5',   description: 'Listen and draw lines (nối tên với vị trí/nhân vật trong tranh)' },
      { part: 2, questions: '6-10',  description: 'Listen and write (điền từ/tên vào ô trống)' },
      { part: 3, questions: '11-15', description: 'Listen and tick the box – 3 picture choices (A/B/C)' },
      { part: 4, questions: '16-20', description: 'Listen and write (điền thông tin ngắn)' },
      { part: 5, questions: '21-25', description: 'Listen and colour/write – choose or complete' },
    ],
  },

  'starters': {
    id: 'starters',
    name: 'Orange Starters',
    nameVi: 'Orange Starters (Pre-A1)',
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

  // IMPORTANT:
  // `defaultData` contains nested arrays/objects (e.g., long-text-mc.questions).
  // A shallow spread would share nested references across parts/sections.
  // That can cause editing one part to accidentally change another.
  let cloned;
  try {
    cloned = typeof structuredClone === 'function'
      ? structuredClone(questionType.defaultData)
      : JSON.parse(JSON.stringify(questionType.defaultData));
  } catch (e) {
    cloned = JSON.parse(JSON.stringify(questionType.defaultData));
  }

  return { ...cloned, questionType: questionTypeId };
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
      label: 'IX Listening',
      types: ['form-completion', 'notes-completion', 'map-labeling', 'flowchart'],
    },
    ieltsReading: {
      label: 'IX Reading',
      types: ['true-false-not-given', 'yes-no-not-given', 'matching-headings', 'paragraph-matching', 'cloze-test', 'sentence-completion'],
    },
    cambridge: {
      label: 'Orange (KET/PET)',
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

// Default export removed in favor of named exports (QUESTION_TYPES, TEST_CONFIGS, and helpers).

