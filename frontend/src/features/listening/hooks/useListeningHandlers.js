import { useState, useCallback } from 'react';

/**
 * Custom hook để quản lý Parts, Sections và Questions cho Listening Test
 * Tương tự usePassageHandlers trong Reading
 */
export const useListeningHandlers = (initialParts = []) => {
  const [parts, setParts] = useState(initialParts);
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const [message, setMessage] = useState('');

  // ========== PART HANDLERS ==========
  
  /**
   * Add new Part
   */
  const handleAddPart = useCallback(() => {
    const newPart = createNewPart(parts.length + 1);
    setParts(prev => [...prev, newPart]);
    setSelectedPartIndex(parts.length);
    setSelectedSectionIndex(0);
  }, [parts.length]);

  /**
   * Delete Part
   */
  const handleDeletePart = useCallback((partIndex) => {
    if (parts.length <= 1) {
      setMessage('⚠️ Cần có ít nhất 1 Part');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    setParts(prev => {
      const newParts = prev.filter((_, idx) => idx !== partIndex)
        .map((p, idx) => ({ ...p, title: `Part ${idx + 1}` }));
      return newParts;
    });
    
    if (selectedPartIndex >= partIndex && selectedPartIndex > 0) {
      setSelectedPartIndex(prev => prev - 1);
    }
    setSelectedSectionIndex(null);
  }, [parts.length, selectedPartIndex]);

  /**
   * Update Part field
   */
  const handlePartChange = useCallback((partIndex, field, value) => {
    setParts(prev => {
      const newParts = [...prev];
      newParts[partIndex] = { ...newParts[partIndex], [field]: value };
      return newParts;
    });
  }, []);

  // ========== SECTION HANDLERS ==========
  
  /**
   * Add Section to Part
   */
  const handleAddSection = useCallback((partIndex, sectionTemplate) => {
    // compute new section index inside the updater to avoid race with state
    let newIndex = 0;
    setParts(prev => {
      const newParts = [...prev];
      const part = newParts[partIndex];
      const sectionCount = part.sections?.length || 0;

      const newSection = sectionTemplate
        ? {
            sectionTitle: sectionTemplate.title || sectionTemplate.sectionTitle || `Questions ${(sectionCount - 1) * 5 + 1}-${sectionCount * 5}`,
            sectionInstruction: sectionTemplate.instructions || sectionTemplate.sectionInstruction || '',
            questionType: sectionTemplate.questionType || 'fill',
            startingQuestionNumber: sectionTemplate.startingQuestionNumber || null,
            questions: (sectionTemplate.questions || []).map(q => ({ ...q }))
          }
        : createNewSection(sectionCount + 1);
      
      newParts[partIndex] = {
        ...part,
        sections: [...(part.sections || []), newSection]
      };

      newIndex = sectionCount; // index of newly appended section
      return newParts;
    });

    // select the new section
    setSelectedSectionIndex(newIndex);
  }, []);

  /**
   * Delete Section from Part
   */
  const handleDeleteSection = useCallback((partIndex, sectionIndex) => {
    const part = parts[partIndex];
    if (!part?.sections || part.sections.length <= 1) {
      setMessage('⚠️ Mỗi Part cần có ít nhất 1 Section');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setParts(prev => {
      const newParts = [...prev];
      newParts[partIndex] = {
        ...newParts[partIndex],
        sections: newParts[partIndex].sections.filter((_, idx) => idx !== sectionIndex)
      };
      return newParts;
    });

    if (selectedSectionIndex >= sectionIndex && selectedSectionIndex > 0) {
      setSelectedSectionIndex(prev => prev - 1);
    }
  }, [parts, selectedSectionIndex]);

  /**
   * Update Section field
   */
  const handleSectionChange = useCallback((partIndex, sectionIndex, field, value) => {
    setParts(prev => {
      const newParts = [...prev];
      const sections = [...newParts[partIndex].sections];
      sections[sectionIndex] = { ...sections[sectionIndex], [field]: value };
      newParts[partIndex] = { ...newParts[partIndex], sections };
      return newParts;
    });
  }, []);

  /**
   * Copy Section
   */
  const handleCopySection = useCallback((partIndex, sectionIndex) => {
    setParts(prev => {
      const newParts = [...prev];
      const sectionToCopy = { ...newParts[partIndex].sections[sectionIndex] };
      const copiedSection = {
        ...sectionToCopy,
        sectionTitle: `${sectionToCopy.sectionTitle} (Copy)`,
        questions: sectionToCopy.questions.map(q => ({ ...q }))
      };
      
      newParts[partIndex] = {
        ...newParts[partIndex],
        sections: [...newParts[partIndex].sections, copiedSection]
      };
      return newParts;
    });
    
    setMessage('✅ Đã copy Section');
    setTimeout(() => setMessage(''), 2000);
  }, []);

  // ========== QUESTION HANDLERS ==========
  
  /**
   * Add Question to Section
   */
  const handleAddQuestion = useCallback((partIndex, sectionIndex, questionTypeOrTemplate = 'fill') => {
    setParts(prev => {
      const newParts = [...prev];
      const sections = [...newParts[partIndex].sections];
      const newQuestion = typeof questionTypeOrTemplate === 'object'
        ? { ...questionTypeOrTemplate }
        : createNewQuestion(questionTypeOrTemplate);
      
      sections[sectionIndex] = {
        ...sections[sectionIndex],
        questions: [...(sections[sectionIndex].questions || []), newQuestion]
      };
      newParts[partIndex] = { ...newParts[partIndex], sections };
      return newParts;
    });
  }, []);

  /**
   * Delete Question
   */
  const handleDeleteQuestion = useCallback((partIndex, sectionIndex, questionIndex) => {
    const section = parts[partIndex]?.sections?.[sectionIndex];
    if (!section?.questions || section.questions.length <= 1) {
      setMessage('⚠️ Mỗi Section cần có ít nhất 1 câu hỏi');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setParts(prev => {
      const newParts = [...prev];
      const sections = [...newParts[partIndex].sections];
      sections[sectionIndex] = {
        ...sections[sectionIndex],
        questions: sections[sectionIndex].questions.filter((_, idx) => idx !== questionIndex)
      };
      newParts[partIndex] = { ...newParts[partIndex], sections };
      return newParts;
    });
  }, [parts]);

  /**
   * Update Question field
   */
  const handleQuestionChange = useCallback((partIndex, sectionIndex, questionIndex, field, value) => {
    setParts(prev => {
      const newParts = [...prev];
      const sections = [...newParts[partIndex].sections];
      const questions = [...sections[sectionIndex].questions];
      
      // If field is 'full', the editor passed the entire question object.
      // Replace the whole question object instead of assigning it to a 'full' key.
      questions[questionIndex] = field === 'full' ? value : { ...questions[questionIndex], [field]: value };
      sections[sectionIndex] = { ...sections[sectionIndex], questions };
      newParts[partIndex] = { ...newParts[partIndex], sections };
      return newParts;
    });
  }, []);

  /**
   * Copy Question
   */
  const handleCopyQuestion = useCallback((partIndex, sectionIndex, questionIndex) => {
    setParts(prev => {
      const newParts = [...prev];
      const sections = [...newParts[partIndex].sections];
      const questionToCopy = { ...sections[sectionIndex].questions[questionIndex] };
      const copiedQuestion = {
        ...questionToCopy,
        options: questionToCopy.options ? [...questionToCopy.options] : undefined
      };
      
      sections[sectionIndex] = {
        ...sections[sectionIndex],
        questions: [...sections[sectionIndex].questions, copiedQuestion]
      };
      newParts[partIndex] = { ...newParts[partIndex], sections };
      return newParts;
    });
    
    setMessage('✅ Đã copy câu hỏi');
    setTimeout(() => setMessage(''), 2000);
  }, []);

  /**
   * Bulk add questions
   */
  const handleBulkAddQuestions = useCallback((partIndex, sectionIndex, count, questionType) => {
    setParts(prev => {
      const newParts = [...prev];
      const sections = [...newParts[partIndex].sections];
      const newQuestions = Array(count).fill(null).map(() => createNewQuestion(questionType));
      
      sections[sectionIndex] = {
        ...sections[sectionIndex],
        questions: [...(sections[sectionIndex].questions || []), ...newQuestions]
      };
      newParts[partIndex] = { ...newParts[partIndex], sections };
      return newParts;
    });
    
    setMessage(`✅ Đã thêm ${count} câu hỏi`);
    setTimeout(() => setMessage(''), 2000);
  }, []);

  return {
    parts,
    setParts,
    selectedPartIndex,
    setSelectedPartIndex,
    selectedSectionIndex,
    setSelectedSectionIndex,
    message,
    setMessage,
    
    // Part handlers
    handleAddPart,
    handleDeletePart,
    handlePartChange,
    
    // Section handlers
    handleAddSection,
    handleDeleteSection,
    handleSectionChange,
    handleCopySection,
    
    // Question handlers
    handleAddQuestion,
    handleDeleteQuestion,
    handleQuestionChange,
    handleCopyQuestion,
    handleBulkAddQuestions,
  };
};

// ========== HELPER FUNCTIONS ==========

/**
 * Create a new Part with default structure
 */
export const createNewPart = (partNumber = 1) => ({
  title: `Part ${partNumber}`,
  audioFile: null,
  audioUrl: '',
  transcript: '',
  instruction: '',
  sections: [createNewSection(1)]
});

/**
 * Create a new Section with default structure
 */
export const createNewSection = (sectionNumber = 1) => ({
  sectionTitle: `Questions ${(sectionNumber - 1) * 5 + 1}-${sectionNumber * 5}`,
  sectionInstruction: '',
  questionType: 'fill', // Default type for section
  questions: [createNewQuestion('fill')]
});

/**
 * Create a new Question based on type
 */
export const createNewQuestion = (type = 'fill') => {
  const base = {
    questionType: type,
    questionText: '',
    correctAnswer: '',
  };

  switch (type) {
    case 'abc':
      return { ...base, options: ['A.', 'B.', 'C.'] };
    case 'abcd':
      return { ...base, options: ['A.', 'B.', 'C.', 'D.'] };
    case 'multiple-choice':
      return { ...base, options: ['', '', ''], correctAnswers: [] };
    case 'matching':
      return { ...base, leftTitle: 'Items', rightTitle: 'Options', leftItems: [''], rightItems: ['A.', 'B.', 'C.', 'D.', 'E.'] };
    case 'map-labeling':
      return { 
        ...base, 
        imageUrl: '', 
        items: [{ label: 'A', text: '' }],
        questionRange: '11-15'
      };
    case 'flowchart':
      return {
        ...base,
        steps: [{ text: '', hasBlank: false }],
        options: ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.'],
        questionRange: '26-30'
      };
    case 'fill':
    default:
      return base;
  }
};

/**
 * Đếm số câu hỏi thực tế của một section
 * Tính đến các loại câu hỏi đặc biệt: matching, form-completion, multi-select
 */
const countSectionQuestions = (section) => {
  if (!section?.questions) return 0;
  
  const questionType = section.questionType || 'fill';
  
  // Matching: Số câu = số leftItems
  if (questionType === 'matching') {
    return section.questions[0]?.leftItems?.length || 0;
  }
  
  // Form-completion: Số câu = số ô trống (isBlank)
  if (questionType === 'form-completion') {
    return section.questions[0]?.formRows?.filter(r => r.isBlank)?.length || 0;
  }
  
  const stripHtml = (html) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const countTableCompletionBlanks = (question) => {
    const rowsArr = question?.rows || [];
    const cols = question?.columns || [];
    const BLANK_REGEX = /\[BLANK\]|_{2,}|[\u2026]+/g;
    let blanksCount = 0;

    rowsArr.forEach((row) => {
      const r = Array.isArray(row?.cells)
        ? row
        : {
            cells: [
              row?.vehicle || '',
              row?.cost || '',
              Array.isArray(row?.comments) ? row.comments.join('\n') : row?.comments || '',
            ],
          };

      const cells = Array.isArray(r.cells) ? r.cells : [];
      const maxCols = cols.length ? cols.length : cells.length;
      for (let c = 0; c < maxCols; c++) {
        const text = String(cells[c] || '');
        const matches = text.match(BLANK_REGEX) || [];
        blanksCount += matches.length;
      }
    });

    if (blanksCount === 0) {
      return rowsArr.length || 0;
    }

    return blanksCount;
  };

  // Notes-completion: Số câu = số blanks trong notesText
  if (questionType === 'notes-completion') {
    const notesText = stripHtml(section.questions[0]?.notesText || '');
    const blanks = notesText.match(/\d+\s*[_…]+|[_…]{2,}/g) || [];
    return blanks.length;
  }

  // Table-completion: số câu = số blanks trong table
  if (questionType === 'table-completion') {
    return countTableCompletionBlanks(section.questions[0] || {});
  }

  // Map-labeling: số câu = số items
  if (questionType === 'map-labeling') {
    const items = section.questions[0]?.items || [];
    return items.length;
  }
  
  // Multi-select: Mỗi câu tính theo số đáp án cần chọn (requiredAnswers)
  // VD: "Choose TWO" = 2 câu hỏi, "Choose THREE" = 3 câu hỏi
  if (questionType === 'multi-select') {
    return section.questions.reduce((sum, q) => {
      return sum + (q.requiredAnswers || 2); // Mặc định là 2
    }, 0);
  }
  
  // Các loại khác (fill, abc, abcd): 1 câu = 1 question
  return section.questions.length;
};

/**
 * Calculate total questions across all parts
 * Considers special question types: matching, form-completion, multi-select, notes-completion
 */
export const calculateTotalQuestions = (parts) => {
  return parts.reduce((total, part) => {
    return total + (part.sections || []).reduce((sTotal, section) => {
      return sTotal + countSectionQuestions(section);
    }, 0);
  }, 0);
};

/**
 * Compute starting question numbers for each section across parts (continuous numbering).
 * Returns a 2D array: starts[partIndex][sectionIndex] = startNumber
 */
export const computeQuestionStarts = (parts = []) => {
  const starts = [];
  let runningStart = 1;

  parts.forEach((part, pIdx) => {
    const sections = part?.sections || [];
    starts[pIdx] = [];

    sections.forEach((section, sIdx) => {
      const explicitStart = Number(section?.startingQuestionNumber);
      const hasExplicit = Number.isFinite(explicitStart) && explicitStart > 0;
      const start = hasExplicit ? explicitStart : runningStart;
      const count = countSectionQuestions(section);

      starts[pIdx][sIdx] = start;
      runningStart = start + count;
    });
  });

  return starts;
};

export default useListeningHandlers;
