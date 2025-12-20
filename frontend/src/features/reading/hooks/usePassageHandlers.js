import { useState, useCallback } from 'react';
import { createNewPassage, createNewSection, createNewQuestion, createDefaultQuestionByType } from '../utils';

/**
 * Custom hook để quản lý CRUD cho passages, sections, questions
 * @param {Array} initialPassages - Dữ liệu passages ban đầu
 * @returns {Object} State và handlers
 */
export const usePassageHandlers = (initialPassages = [createNewPassage()]) => {
  const [passages, setPassages] = useState(initialPassages);
  const [selectedPassageIndex, setSelectedPassageIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const [message, setMessage] = useState('');

  // ===== PASSAGE HANDLERS =====
  
  /**
   * Thêm passage mới
   */
  const handleAddPassage = useCallback(() => {
    const newPassages = [...passages, createNewPassage()];
    setPassages(newPassages);
    setSelectedPassageIndex(newPassages.length - 1);
    setSelectedSectionIndex(null);
  }, [passages]);

  /**
   * Xóa passage
   */
  const handleDeletePassage = useCallback((passageIndex) => {
    if (passages.length <= 1) {
      setMessage('⚠️ Phải có ít nhất 1 passage');
      return;
    }
    const newPassages = passages.filter((_, idx) => idx !== passageIndex);
    setPassages(newPassages);
    
    if (selectedPassageIndex >= newPassages.length) {
      setSelectedPassageIndex(Math.max(0, newPassages.length - 1));
    }
    setSelectedSectionIndex(null);
  }, [passages, selectedPassageIndex]);

  /**
   * Cập nhật field của passage
   */
  const handlePassageChange = useCallback((index, field, value) => {
    const newPassages = [...passages];
    if (newPassages[index]) {
      newPassages[index][field] = value;
      setPassages(newPassages);
    }
  }, [passages]);

  // ===== SECTION HANDLERS =====
  
  /**
   * Thêm section mới vào passage
   */
  const handleAddSection = useCallback((passageIndex) => {
    const newPassages = [...passages];
    if (!newPassages[passageIndex]) return;
    
    if (!newPassages[passageIndex].sections) {
      newPassages[passageIndex].sections = [];
    }
    
    const sectionNumber = newPassages[passageIndex].sections.length + 1;
    newPassages[passageIndex].sections.push(createNewSection(sectionNumber));
    setPassages(newPassages);
  }, [passages]);

  /**
   * Xóa section
   */
  const handleDeleteSection = useCallback((passageIndex, sectionIndex) => {
    const newPassages = [...passages];
    if (!newPassages[passageIndex]?.sections) return;
    
    if (newPassages[passageIndex].sections.length <= 1) {
      setMessage('⚠️ Phải có ít nhất 1 section');
      return;
    }
    
    newPassages[passageIndex].sections.splice(sectionIndex, 1);
    setPassages(newPassages);
    
    // Update selected section index
    if (selectedSectionIndex === sectionIndex) {
      const newIndex = sectionIndex > 0 ? sectionIndex - 1 : null;
      setSelectedSectionIndex(newIndex);
    } else if (selectedSectionIndex > sectionIndex) {
      setSelectedSectionIndex(selectedSectionIndex - 1);
    }
  }, [passages, selectedSectionIndex]);

  /**
   * Cập nhật field của section
   */
  const handleSectionChange = useCallback((passageIndex, sectionIndex, field, value) => {
    const newPassages = [...passages];
    if (newPassages[passageIndex]?.sections?.[sectionIndex]) {
      newPassages[passageIndex].sections[sectionIndex][field] = value;
      setPassages(newPassages);
    }
  }, [passages]);

  /**
   * Sao chép section
   */
  const handleCopySection = useCallback((passageIndex, sectionIndex) => {
    const newPassages = [...passages];
    const passage = newPassages[passageIndex];
    const originalSection = passage?.sections?.[sectionIndex];
    
    if (!passage || !originalSection) {
      setMessage('❌ Lỗi: Không tìm thấy section để sao chép');
      return;
    }
    
    const copiedSection = JSON.parse(JSON.stringify(originalSection));
    passage.sections.splice(sectionIndex + 1, 0, copiedSection);
    setPassages(newPassages);
    setSelectedSectionIndex(sectionIndex + 1);
  }, [passages]);

  // ===== QUESTION HANDLERS =====
  
  /**
   * Thêm câu hỏi mới
   */
  const handleAddQuestion = useCallback((passageIndex, sectionIndex) => {
    const newPassages = [...passages];
    const section = newPassages[passageIndex]?.sections?.[sectionIndex];
    
    if (!section) {
      setMessage('❌ Lỗi: Không tìm thấy section');
      return;
    }
    
    if (!section.questions) {
      section.questions = [];
    }
    
    const questionNumber = section.questions.length + 1;
    section.questions.push(createNewQuestion(questionNumber));
    setPassages(newPassages);
  }, [passages]);

  /**
   * Xóa câu hỏi
   */
  const handleDeleteQuestion = useCallback((passageIndex, sectionIndex, questionIndex) => {
    const newPassages = [...passages];
    const section = newPassages[passageIndex]?.sections?.[sectionIndex];
    
    if (!section?.questions) {
      setMessage('❌ Lỗi: Không tìm thấy section hoặc questions');
      return;
    }
    
    section.questions.splice(questionIndex, 1);
    setPassages(newPassages);
  }, [passages]);

  /**
   * Sao chép câu hỏi
   */
  const handleCopyQuestion = useCallback((passageIndex, sectionIndex, questionIndex) => {
    const newPassages = [...passages];
    const section = newPassages[passageIndex]?.sections?.[sectionIndex];
    
    if (!section?.questions?.[questionIndex]) {
      setMessage('❌ Lỗi: Không tìm thấy câu hỏi');
      return;
    }
    
    const copiedQuestion = JSON.parse(JSON.stringify(section.questions[questionIndex]));
    section.questions.splice(questionIndex + 1, 0, copiedQuestion);
    setPassages(newPassages);
  }, [passages]);

  /**
   * Cập nhật câu hỏi
   */
  const handleQuestionChange = useCallback((passageIndex, sectionIndex, questionIndex, field, value) => {
    const newPassages = [...passages];
    const questions = newPassages[passageIndex]?.sections?.[sectionIndex]?.questions;
    
    if (!questions?.[questionIndex]) return;
    
    if (field === 'full') {
      questions[questionIndex] = value;
    } else {
      questions[questionIndex][field] = value;
    }
    
    setPassages(newPassages);
  }, [passages]);

  /**
   * Xóa message sau một khoảng thời gian
   */
  const clearMessage = useCallback(() => {
    setMessage('');
  }, []);

  return {
    // State
    passages,
    setPassages,
    selectedPassageIndex,
    setSelectedPassageIndex,
    selectedSectionIndex,
    setSelectedSectionIndex,
    message,
    setMessage,
    clearMessage,
    
    // Passage handlers
    handleAddPassage,
    handleDeletePassage,
    handlePassageChange,
    
    // Section handlers
    handleAddSection,
    handleDeleteSection,
    handleSectionChange,
    handleCopySection,
    
    // Question handlers
    handleAddQuestion,
    handleDeleteQuestion,
    handleCopyQuestion,
    handleQuestionChange,
    
    // Utils
    createDefaultQuestionByType
  };
};

export default usePassageHandlers;
