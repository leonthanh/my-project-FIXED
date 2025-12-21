
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../../../shared/components';
import '../styles/do-reading-test.css';
// Utility: Remove unwanted <span ...> tags from HTML
function stripUnwantedHtml(html) {
  if (!html) return '';
  return html.replace(/<span[^>]*>|<\/span>/gi, '');
}

/**
 * DoReadingTest - Trang học sinh làm bài Reading IELTS
 * 
 * Features:
 * - Support all IELTS question types (T/F/NG, Matching Headings, etc.)
 * - Auto-save answers to localStorage
 * - Interactive question navigation with click-to-jump
 * - Enhanced timer with warnings (5 min, 1 min)
 * - Paragraph highlighting
 * - Beautiful animations & hover effects
 * - Progress tracking
 */

const DoReadingTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API = process.env.REACT_APP_API_URL;

  // Refs
  const questionRefs = useRef({});
  const passageRef = useRef(null);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  // State
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [highlightedParagraph, setHighlightedParagraph] = useState(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerWarning, setTimerWarning] = useState(false);
  const [timerCritical, setTimerCritical] = useState(false);

  // Load saved answers from localStorage
  useEffect(() => {
    const savedAnswers = localStorage.getItem(`reading_test_${id}_answers`);
    if (savedAnswers) {
      try {
        setAnswers(JSON.parse(savedAnswers));
      } catch (e) {
        console.error('Error loading saved answers:', e);
      }
    }
  }, [id]);

  // Auto-save answers to localStorage
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(`reading_test_${id}_answers`, JSON.stringify(answers));
    }
  }, [answers, id]);

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await fetch(`${API}/api/reading-tests/${id}`);
        if (!res.ok) throw new Error('Failed to fetch test');
        const data = await res.json();
        setTest(data);
        setTimeRemaining((data.durationMinutes || 60) * 60);
      } catch (err) {
        console.error('Error fetching reading test:', err);
      }
    };
    fetchTest();
  }, [id, API]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || submitted) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeUp(true);
          setShowConfirm(true);
          return 0;
        }
        
        // Warning at 5 minutes
        if (prev <= 300 && !timerWarning) {
          setTimerWarning(true);
        }
        
        // Critical at 1 minute
        if (prev <= 60 && !timerCritical) {
          setTimerCritical(true);
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, submitted, timerWarning, timerCritical]);

  // Format time
  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle answer change
  const handleAnswerChange = useCallback((qKey, value) => {
    setAnswers(prev => ({ ...prev, [qKey]: value }));
  }, []);

  // Handle multi-select change
  const handleMultiSelectChange = useCallback((qKey, value, isChecked) => {
    setAnswers(prev => {
      const current = prev[qKey] ? prev[qKey].split(',').filter(Boolean) : [];
      if (isChecked) {
        return { ...prev, [qKey]: [...current, value].sort().join(',') };
      } else {
        return { ...prev, [qKey]: current.filter(v => v !== value).join(',') };
      }
    });
  }, []);

  // Handle matching headings change
  const handleMatchingHeadingsChange = useCallback((qKey, paragraphId, headingIndex) => {
    setAnswers(prev => {
      const current = prev[qKey] ? JSON.parse(prev[qKey]) : {};
      return { ...prev, [qKey]: JSON.stringify({ ...current, [paragraphId]: headingIndex }) };
    });
  }, []);

  // Calculate statistics
  const getStatistics = useCallback(() => {
    if (!test) return { total: 0, answered: 0, unanswered: [] };
    
    let total = 0;
    let answered = 0;
    const unanswered = [];
    
    test.passages.forEach((p) => {
      const sections = p.sections || [{ questions: p.questions }];
      sections.forEach((section) => {
        (section.questions || []).forEach((q) => {
          const qType = q.type || q.questionType || 'multiple-choice';
          
          // For matching headings, count each paragraph as a question
          if (qType === 'ielts-matching-headings') {
            const paragraphs = q.paragraphs || q.answers || [];
            const key = `q_${total + 1}`;
            let answerObj = {};
            try {
              answerObj = answers[key] ? JSON.parse(answers[key]) : {};
            } catch (e) {
              answerObj = {};
            }
            
            paragraphs.forEach((para) => {
              total++;
              const paragraphId = typeof para === 'object' ? (para.id || para.paragraphId) : para;
              if (answerObj[paragraphId] !== undefined && answerObj[paragraphId] !== '') {
                answered++;
              } else {
                unanswered.push(total);
              }
            });
          } 
          // For cloze test, count each blank as a question
          else if (qType === 'cloze-test' || qType === 'summary-completion') {
            const clozeText = q.paragraphText || q.passageText || q.text || q.paragraph || 
              (q.questionText && q.questionText.includes('[BLANK]') ? q.questionText : null);
            
            if (clozeText) {
              const blankMatches = clozeText.match(/\[BLANK\]/gi) || [];
              const baseKey = `q_${total + 1}`;
              
              blankMatches.forEach((_, bi) => {
                total++;
                const answerKey = `${baseKey}_${bi}`;
                if (answers[answerKey] && answers[answerKey].toString().trim() !== '') {
                  answered++;
                } else {
                  unanswered.push(total);
                }
              });
            } else {
              total++;
              const key = `q_${total}`;
              if (answers[key] && answers[key].toString().trim() !== '') {
                answered++;
              } else {
                unanswered.push(total);
              }
            }
          } else {
            total++;
            const key = `q_${total}`;
            if (answers[key] && answers[key].toString().trim() !== '') {
              answered++;
            } else {
              unanswered.push(total);
            }
          }
        });
      });
    });
    
    return { total, answered, unanswered };
  }, [test, answers]);

  // Navigate to question
  const scrollToQuestion = useCallback((questionNumber) => {
    if (!test) return;
    
    // Find which passage contains this question
    let counter = 0;
    let targetPassageIndex = 0;
    
    for (let i = 0; i < test.passages.length; i++) {
      const passage = test.passages[i];
      const sections = passage.sections || [{ questions: passage.questions }];
      let passageQuestionCount = 0;
      sections.forEach(s => passageQuestionCount += (s.questions || []).length);
      
      if (counter + passageQuestionCount >= questionNumber) {
        targetPassageIndex = i;
        break;
      }
      counter += passageQuestionCount;
    }
    
    // Change passage if needed
    if (targetPassageIndex !== currentPartIndex) {
      setCurrentPartIndex(targetPassageIndex);
    }
    
    // Scroll to question
    setActiveQuestion(questionNumber);
    setTimeout(() => {
      const element = questionRefs.current[`q_${questionNumber}`];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }, [test, currentPartIndex]);

  // Highlight paragraph in passage
  const handleParagraphHighlight = useCallback((paragraphId) => {
    setHighlightedParagraph(paragraphId);
  }, []);

  const handleParagraphUnhighlight = useCallback(() => {
    setHighlightedParagraph(null);
  }, []);

  // Process passage text to add paragraph markers and data attributes
  const processPassageText = useCallback((htmlText) => {
    if (!htmlText) return '';
    
    // Add data-paragraph attributes to paragraphs if they don't exist
    // Look for paragraphs that start with letters like A, B, C, etc.
    let processed = htmlText;
    
    // Pattern: Find <p> tags or paragraph markers
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    letters.forEach(letter => {
      // Look for paragraphs starting with bold letter markers like <strong>A</strong> or <b>A</b>
      // Support multiple formats including with/without space
      const patterns = [
        // <p><strong>A</strong> or <p> <strong>A</strong>
        new RegExp(`(<p[^>]*>)\\s*<strong>\\s*${letter}\\s*</strong>`, 'gi'),
        // <p><b>A</b>
        new RegExp(`(<p[^>]*>)\\s*<b>\\s*${letter}\\s*</b>`, 'gi'),
        // <p><span>A</span>
        new RegExp(`(<p[^>]*>)\\s*<span[^>]*>\\s*${letter}\\s*</span>`, 'gi'),
        // <p>A (letter followed by space or non-letter)
        new RegExp(`(<p[^>]*>)\\s*${letter}(?=\\s|[^A-Za-z])`, 'gi'),
        // <p><em>A</em>
        new RegExp(`(<p[^>]*>)\\s*<em>\\s*${letter}\\s*</em>`, 'gi'),
        // Already has class but need to add marker - <p class="...">A
        new RegExp(`(<p\\s+class="[^"]*">)\\s*${letter}(?=\\s|[^A-Za-z])`, 'gi'),
      ];
      
      patterns.forEach(pattern => {
        processed = processed.replace(pattern, (match, pTag) => {
          // Skip if already processed
          if (match.includes('data-paragraph')) return match;
          if (match.includes('paragraph-marker')) return match;
          
          const highlighted = highlightedParagraph === letter ? ' highlighted' : '';
          return `<p data-paragraph="${letter}" class="paragraph-block${highlighted}"><span class="paragraph-marker">${letter}</span> `;
        });
      });
    });
    
    return processed;
  }, [highlightedParagraph]);

  // Resizable panel handlers
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current) return;
    
    // Use requestAnimationFrame for smooth performance
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Limit between 25% and 75%
      if (newLeftWidth >= 25 && newLeftWidth <= 75) {
        setLeftPanelWidth(newLeftWidth);
      }
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Add/remove global mouse listeners for resize
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Validate and submit
  const handleSubmit = () => {
    const stats = getStatistics();
    if (stats.unanswered.length > 0 && !timeUp) {
      const confirmSubmit = window.confirm(
        `Bạn chưa trả lời ${stats.unanswered.length} câu: ${stats.unanswered.slice(0, 10).join(', ')}${stats.unanswered.length > 10 ? '...' : ''}\n\nBạn có muốn nộp bài không?`
      );
      if (!confirmSubmit) return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    try {
      const res = await fetch(`${API}/api/reading-tests/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      if (!res.ok) throw new Error('Failed to submit');
      const data = await res.json();
      setSubmitted(true);
      
      // Clear saved answers
      localStorage.removeItem(`reading_test_${id}_answers`);
      
      navigate(`/reading-results/${id}`, { state: { result: data } });
    } catch (err) {
      console.error('Error submitting reading test:', err);
      alert('Có lỗi khi nộp bài. Vui lòng thử lại.');
    } finally {
      setShowConfirm(false);
    }
  };

  // Loading state
  if (!test) {
    return (
      <div className="reading-test-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải đề thi...</p>
      </div>
    );
  }

  const currentPassage = test.passages[currentPartIndex];
  const stats = getStatistics();
  
  // Helper function to count questions (matching headings & cloze test count as multiple questions)
  const countQuestionsInSection = (questions) => {
    return (questions || []).reduce((total, q) => {
      const qType = q.type || q.questionType || 'multiple-choice';
      if (qType === 'ielts-matching-headings') {
        return total + (q.paragraphs || q.answers || []).length || 1;
      }
      if (qType === 'cloze-test' || qType === 'summary-completion') {
        // Count blanks in cloze test
        const clozeText = q.paragraphText || q.passageText || q.text || q.paragraph || 
          (q.questionText && q.questionText.includes('[BLANK]') ? q.questionText : null);
        if (clozeText) {
          const blankMatches = clozeText.match(/\[BLANK\]/gi);
          return total + (blankMatches ? blankMatches.length : 1);
        }
      }
      return total + 1;
    }, 0);
  };
  
  // Calculate question range for current passage
  let startQuestionNumber = 1;
  for (let i = 0; i < currentPartIndex; i++) {
    const p = test.passages[i];
    const sections = p.sections || [{ questions: p.questions }];
    sections.forEach(s => startQuestionNumber += countQuestionsInSection(s.questions));
  }

  // Get sections for current passage
  const currentSections = currentPassage.sections || [{ questions: currentPassage.questions }];
  let currentQuestionNumber = startQuestionNumber;
  
  // Total questions in current passage
  let totalQuestionsInPassage = 0;
  currentSections.forEach(s => totalQuestionsInPassage += countQuestionsInSection(s.questions));

  // Render question based on type
  const renderQuestion = (question, questionNumber) => {
    const key = `q_${questionNumber}`;
    const qType = question.type || question.questionType || 'multiple-choice';
    const isAnswered = answers[key] && answers[key].toString().trim() !== '';
    const isActive = activeQuestion === questionNumber;
    
    // For matching headings, each paragraph is a separate question
    const isMatchingHeadings = qType === 'ielts-matching-headings';
    const paragraphCount = isMatchingHeadings ? (question.paragraphs || question.answers || []).length : 0;
    
    // For cloze test, count blanks
    const isClozeTest = qType === 'cloze-test' || qType === 'summary-completion';
    const clozeText = question.paragraphText || question.passageText || question.text || question.paragraph || 
      (question.questionText && question.questionText.includes('[BLANK]') ? question.questionText : null);
    const blankCount = isClozeTest && clozeText ? (clozeText.match(/\[BLANK\]/gi) || []).length : 0;
    
    // Check if short answer has inline dots
    const isShortAnswerInline = (qType === 'fill-in-blank' || qType === 'short-answer' || qType === 'fill-in-the-blanks') && 
      question.questionText && (question.questionText.includes('…') || question.questionText.includes('....'));
    
    // Should hide single question number for multi-question blocks
    const isMultiQuestionBlock = isMatchingHeadings || (isClozeTest && blankCount > 0);
    
    return (
      <div 
        key={key}
        ref={el => questionRefs.current[key] = el}
        className={`question-item ${isAnswered ? 'answered' : ''} ${isActive ? 'active' : ''} ${isMultiQuestionBlock ? 'matching-headings-block' : ''}`}
        onClick={() => setActiveQuestion(questionNumber)}
      >
        {/* Hide single question number for multi-question blocks - show range instead */}
        {!isMultiQuestionBlock && (
          <div className={`question-number ${isAnswered ? 'answered' : ''}`}>
            {questionNumber}
          </div>
        )}
        
        <div className={`question-content ${isMultiQuestionBlock ? 'full-width' : ''}`}>
          {/* Hide questionText for inline short answer (it's shown in inline) and cloze test (shown in passage) */}
          {question.questionText && !isShortAnswerInline && !(isClozeTest && clozeText) && (
            <div 
              className="question-text"
              dangerouslySetInnerHTML={{ __html: question.questionText }}
            />
          )}
          
          {/* Multiple Choice */}
          {qType === 'multiple-choice' && (
            <div className="question-options">
              {(question.options || []).map((opt, oi) => {
                // Handle both string and object options {id, label, text}
                const optText = typeof opt === 'object' ? (opt.text || opt.label || '') : opt;
                const optValue = typeof opt === 'object' ? (opt.id || opt.label || optText) : opt;
                
                return (
                  <label 
                    key={oi} 
                    className={`option-label ${answers[key] === optValue ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={key}
                      value={optValue}
                      checked={answers[key] === optValue}
                      onChange={(e) => handleAnswerChange(key, e.target.value)}
                      className="option-input"
                    />
                    <span className="option-letter">{String.fromCharCode(65 + oi)}</span>
                    <span className="option-text" dangerouslySetInnerHTML={{ __html: optText }} />
                  </label>
                );
              })}
            </div>
          )}

          {/* True/False/Not Given */}
          {qType === 'true-false-notgiven' && (
            <div className="question-options tfng-options">
              {['TRUE', 'FALSE', 'NOT GIVEN'].map((option) => (
                <label 
                  key={option}
                  className={`option-label tfng-label ${answers[key] === option ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name={key}
                    value={option}
                    checked={answers[key] === option}
                    onChange={(e) => handleAnswerChange(key, e.target.value)}
                    className="option-input"
                  />
                  <span className={`tfng-badge ${option.toLowerCase().replace(' ', '-')}`}>
                    {option === 'TRUE' && '✓'}
                    {option === 'FALSE' && '✗'}
                    {option === 'NOT GIVEN' && '?'}
                  </span>
                  <span className="option-text">{option}</span>
                </label>
              ))}
            </div>
          )}

          {/* Yes/No/Not Given */}
          {qType === 'yes-no-notgiven' && (
            <div className="question-options tfng-options">
              {['YES', 'NO', 'NOT GIVEN'].map((option) => (
                <label 
                  key={option}
                  className={`option-label tfng-label ${answers[key] === option ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name={key}
                    value={option}
                    checked={answers[key] === option}
                    onChange={(e) => handleAnswerChange(key, e.target.value)}
                    className="option-input"
                  />
                  <span className={`tfng-badge ${option.toLowerCase().replace(' ', '-')}`}>
                    {option === 'YES' && '✓'}
                    {option === 'NO' && '✗'}
                    {option === 'NOT GIVEN' && '?'}
                  </span>
                  <span className="option-text">{option}</span>
                </label>
              ))}
            </div>
          )}

          {/* Fill in Blank / Short Answer - Inline style */}
          {(qType === 'fill-in-blank' || qType === 'short-answer' || qType === 'fill-in-the-blanks') && (
            <div className="question-fill-inline">
              {/* If questionText contains blanks (.....), replace with input */}
              {isShortAnswerInline ? (
                <div className="inline-fill-text">
                  {(() => {
                    // Strip <p> tags and clean up HTML for inline display
                    const cleanText = question.questionText
                      .replace(/<p[^>]*>/gi, '')
                      .replace(/<\/p>/gi, ' ')
                      .replace(/<br\s*\/?>/gi, ' ')
                      .trim();
                    
                    return cleanText.split(/(\.{3,}|…+)/).map((part, idx) => {
                      if (part.match(/\.{3,}|…+/)) {
                        return (
                          <input
                            key={idx}
                            type="text"
                            className={`inline-fill-input ${answers[key] ? 'answered' : ''}`}
                            value={answers[key] || ''}
                            onChange={(e) => handleAnswerChange(key, e.target.value)}
                            placeholder={question.maxWords ? `≤${question.maxWords} words` : ''}
                          />
                        );
                      }
                      // Skip empty parts
                      if (!part.trim()) return null;
                      return <span key={idx}>{part}</span>;
                    });
                  })()}
                </div>
              ) : (
                <input
                  type="text"
                  className={`fill-input ${isAnswered ? 'answered' : ''}`}
                  value={answers[key] || ''}
                  onChange={(e) => handleAnswerChange(key, e.target.value)}
                  placeholder={question.maxWords ? `No more than ${question.maxWords} words` : 'Type your answer...'}
                />
              )}
              {question.maxWords && (
                <p className="fill-hint">
                  <span className="hint-icon">ℹ️</span>
                  Maximum {question.maxWords} word(s)
                </p>
              )}
            </div>
          )}

          {/* Multi-Select */}
          {qType === 'multi-select' && (
            <div className="question-options">
              <p className="multi-select-hint">
                Choose {question.maxSelection || 2} letters
              </p>
              {(question.options || []).map((opt, oi) => {
                // Handle both string and object options
                const optText = typeof opt === 'object' ? (opt.text || opt.label || '') : opt;
                const optValue = typeof opt === 'object' ? (opt.id || opt.label || optText) : opt;
                const currentAnswers = answers[key] ? answers[key].split(',').filter(Boolean) : [];
                const isChecked = currentAnswers.includes(optValue);
                return (
                  <label 
                    key={oi} 
                    className={`option-label ${isChecked ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleMultiSelectChange(key, optValue, e.target.checked)}
                      className="option-input"
                    />
                    <span className="option-letter">{String.fromCharCode(65 + oi)}</span>
                    <span className="option-text" dangerouslySetInnerHTML={{ __html: optText }} />
                  </label>
                );
              })}
            </div>
          )}

          {/* Matching */}
          {qType === 'matching' && (
            <div className="question-matching">
              <div className="matching-items">
                {(question.leftItems || question.matchingPairs || []).map((item, idx) => {
                  const leftText = typeof item === 'string' ? item : (item.left || item.paragraph || '');
                  const currentValues = answers[key] ? answers[key].split(',') : [];
                  
                  return (
                    <div key={idx} className="matching-row">
                      <span className="matching-letter">{String.fromCharCode(65 + idx)}</span>
                      <span className="matching-left">{leftText}</span>
                      <span className="matching-arrow">→</span>
                      <select
                        className={`matching-select ${currentValues[idx] ? 'answered' : ''}`}
                        value={currentValues[idx] || ''}
                        onChange={(e) => {
                          const newValues = [...currentValues];
                          while (newValues.length <= idx) newValues.push('');
                          newValues[idx] = e.target.value;
                          handleAnswerChange(key, newValues.join(','));
                        }}
                      >
                        <option value="">Choose...</option>
                        {(question.rightItems || question.matchingOptions || []).map((opt, ri) => (
                          <option key={ri} value={ri + 1}>
                            {ri + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
              
              {question.rightItems && (
                <div className="matching-options-list">
                  <p className="matching-options-title">Options:</p>
                  {question.rightItems.map((item, idx) => {
                    const itemText = typeof item === 'object' ? (item.text || item.label || '') : item;
                    return (
                      <div key={idx} className="matching-option">
                        <span className="matching-option-number">{idx + 1}.</span>
                        <span>{itemText}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* IELTS Matching Headings */}
          {qType === 'ielts-matching-headings' && (
            <div className="question-matching-headings">
              {/* Question range header */}
              <div className="matching-headings-header">
                <span className="matching-range-badge">
                  Questions {question.startQuestion || questionNumber}–{(question.startQuestion || questionNumber) + paragraphCount - 1}
                </span>
              </div>
              
              {/* List of headings */}
              <div className="headings-list">
                <p className="headings-title">📋 List of Headings</p>
                {(question.headings || []).map((heading, hi) => {
                  const headingText = typeof heading === 'object' ? (heading.text || heading.label || '') : heading;
                  return (
                    <div key={hi} className="heading-item">
                      <span className="heading-number">{['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'][hi] || hi + 1}.</span>
                      <span className="heading-text">{headingText}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Paragraphs to match - with question numbers */}
              <div className="paragraphs-match">
                {(question.paragraphs || question.answers || []).map((para, pi) => {
                  const paragraphId = typeof para === 'object' ? (para.id || para.paragraphId) : para;
                  let currentAnswerObj = {};
                  try {
                    currentAnswerObj = answers[key] ? JSON.parse(answers[key]) : {};
                  } catch (e) {
                    currentAnswerObj = {};
                  }
                  const selectedHeading = currentAnswerObj[paragraphId];
                  // Use startQuestion from question data, or fall back to questionNumber
                  const baseQuestion = question.startQuestion || questionNumber;
                  const actualQuestionNum = baseQuestion + pi;
                  
                  return (
                    <div 
                      key={pi} 
                      className={`paragraph-match-row ${selectedHeading !== undefined && selectedHeading !== '' ? 'answered' : ''}`}
                      onMouseEnter={() => handleParagraphHighlight(paragraphId)}
                      onMouseLeave={handleParagraphUnhighlight}
                    >
                      <span className="paragraph-question-number">{actualQuestionNum}</span>
                      <span className="paragraph-label">Paragraph {paragraphId}</span>
                      <select
                        className={`heading-select ${selectedHeading !== undefined && selectedHeading !== '' ? 'answered' : ''}`}
                        value={selectedHeading !== undefined ? selectedHeading : ''}
                        onChange={(e) => handleMatchingHeadingsChange(key, paragraphId, e.target.value)}
                      >
                        <option value="">Choose a heading...</option>
                        {(question.headings || []).map((heading, hi) => {
                          const headingText = typeof heading === 'object' ? (heading.text || heading.label || '') : heading;
                          const romanNum = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'][hi] || hi + 1;
                          return (
                            <option key={hi} value={hi}>
                              {romanNum}. {headingText}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cloze Test / Summary Completion */}
          {(qType === 'cloze-test' || qType === 'summary-completion') && (
            <div className="question-cloze">
              {/* Question range header for cloze test */}
              {blankCount > 0 && (
                <div className="cloze-header">
                  <span className="cloze-range-badge">
                    Questions {question.startQuestion || questionNumber}–{(question.startQuestion || questionNumber) + blankCount - 1}
                  </span>
                  {question.maxWords && (
                    <span className="cloze-max-words">
                      ℹ️ No more than {question.maxWords} word(s) for each answer
                    </span>
                  )}
                </div>
              )}
              
              {question.wordBank && question.wordBank.length > 0 && (
                <div className="word-bank">
                  <p className="word-bank-title">📝 Word Bank:</p>
                  <div className="word-bank-items">
                    {question.wordBank.map((word, wi) => {
                      const wordText = typeof word === 'object' ? (word.text || word.label || '') : word;
                      return (
                        <span key={wi} className="word-bank-item">{wordText}</span>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* If passage text exists with [BLANK], render inline */}
              {(() => {
                if (clozeText && clozeText.includes('[BLANK]')) {
                  return (
                    <div className="cloze-passage">
                      {(() => {
                        let blankIndex = 0;
                        const baseQuestionNum = question.startQuestion || questionNumber;
                        return clozeText.split(/\[BLANK\]/gi).map((part, idx, arr) => {
                          if (idx === arr.length - 1) {
                            return <span key={idx} dangerouslySetInnerHTML={{ __html: stripUnwantedHtml(part) }} />;
                          }
                          const currentBlankIdx = blankIndex++;
                          const blankNum = baseQuestionNum + currentBlankIdx;
                          return (
                            <span key={idx}>
                              <span dangerouslySetInnerHTML={{ __html: stripUnwantedHtml(part) }} />
                              <span className="cloze-inline-wrapper">
                                <span className="cloze-inline-number">{blankNum}</span>
                                <input
                                  type="text"
                                  className={`cloze-inline-input ${answers[`${key}_${currentBlankIdx}`] ? 'answered' : ''}`}
                                  value={answers[`${key}_${currentBlankIdx}`] || ''}
                                  onChange={(e) => handleAnswerChange(`${key}_${currentBlankIdx}`, e.target.value)}
                                  placeholder=""
                                />
                              </span>
                            </span>
                          );
                        });
                      })()}
                    </div>
                  );
                } else {
                  // Fallback to blank rows if no passage text
                  return (question.blanks || []).map((blank, bi) => (
                    <div key={bi} className="cloze-blank-row">
                      <span className="cloze-blank-number">{blank.id || questionNumber + bi}.</span>
                      <input
                        type="text"
                        className={`cloze-input ${answers[`${key}_${bi}`] ? 'answered' : ''}`}
                        value={answers[`${key}_${bi}`] || ''}
                        onChange={(e) => handleAnswerChange(`${key}_${bi}`, e.target.value)}
                        placeholder="Type answer..."
                      />
                    </div>
                  ));
                }
              })()}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="reading-test-container">
      {/* Enhanced Header */}
      <header className="reading-test-header">
        <div className="header-left">
          <div className="test-badge">IELTS</div>
          <div className="test-info">
            <h1>{test.title || 'Reading Test'}</h1>
            <p className="test-meta">
              {test.passages.length} Passage{test.passages.length > 1 ? 's' : ''} • {stats.total} Questions
            </p>
          </div>
        </div>
        
        <div className="header-right">
          {/* Enhanced Timer */}
          <div className={`timer-container ${timerWarning ? 'warning' : ''} ${timerCritical ? 'critical' : ''}`}>
            <div className="timer-icon">⏱️</div>
            <div className="timer-display">
              <span className="timer-value">{formatTime(timeRemaining)}</span>
              <span className="timer-label">remaining</span>
            </div>
            {timerCritical && (
              <div className="timer-critical-badge pulse">🔥 Last minute!</div>
            )}
          </div>
          
          {/* Progress indicator */}
          <div className="progress-container">
            <div className="progress-ring">
              <svg viewBox="0 0 36 36">
                <path
                  className="progress-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="progress-bar"
                  strokeDasharray={`${stats.total > 0 ? (stats.answered / stats.total) * 100 : 0}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="progress-text">
                <span className="progress-value">{stats.answered}</span>
                <span className="progress-total">/{stats.total}</span>
              </div>
            </div>
          </div>

          {/* Auto-save indicator */}
          <div className="auto-save-indicator">
            <span className="save-icon">💾</span>
            <span className="save-text">Auto-saved</span>
          </div>

          {/* Submit button */}
          <button 
            onClick={handleSubmit} 
            disabled={submitted}
            className="submit-button"
          >
            {submitted ? (
              <>✓ Đã nộp bài</>
            ) : (
              <>
                <span className="submit-icon">📤</span>
                <span className="submit-text">Nộp bài</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="reading-test-main" ref={containerRef}>
        {/* Left: Passage */}
        <div 
          className="reading-passage-column"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="passage-header">
            <div className="passage-part">PASSAGE {currentPartIndex + 1}</div>
            {currentPassage.passageTitle && (
              <h2 className="passage-title">{currentPassage.passageTitle}</h2>
            )}
          </div>
          
          <div 
            ref={passageRef}
            className="passage-content"
          >
            <div 
              className="passage-text"
              dangerouslySetInnerHTML={{ __html: processPassageText(currentPassage.passageText || '') }}
            />
          </div>
          
          {/* Part Navigation */}
          <div className="part-navigation">
            <button 
              className="nav-btn prev"
              disabled={currentPartIndex === 0}
              onClick={() => setCurrentPartIndex(p => p - 1)}
            >
              <span className="nav-icon">←</span>
              <span className="nav-text">Previous</span>
            </button>
            
            <div className="part-indicators">
              {test.passages.map((_, idx) => (
                <button
                  key={idx}
                  className={`part-dot ${idx === currentPartIndex ? 'active' : ''}`}
                  onClick={() => setCurrentPartIndex(idx)}
                  title={`Passage ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            
            <button 
              className="nav-btn next"
              disabled={currentPartIndex === test.passages.length - 1}
              onClick={() => setCurrentPartIndex(p => p + 1)}
            >
              <span className="nav-text">Next</span>
              <span className="nav-icon">→</span>
            </button>
          </div>
        </div>

        {/* Resizable Divider */}
        <div 
          className="resizable-divider"
          onMouseDown={handleMouseDown}
        >
          <div className="divider-handle">
            <span className="divider-dots">⋮⋮</span>
          </div>
        </div>

        {/* Right: Questions */}
        <div 
          className="reading-questions-column"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <div className="questions-header">
            <h3>Questions</h3>
            <span className="questions-range">
              {startQuestionNumber}–{startQuestionNumber + totalQuestionsInPassage - 1}
            </span>
          </div>
          
          <div className="questions-list">
            {currentSections.map((section, sectionIdx) => {
              const sectionQuestions = section.questions || [];
              
              return (
                <div key={sectionIdx} className="question-section">
                  {/* Section header */}
                  {(section.sectionTitle || section.sectionInstruction) && (
                    <div className="section-header">
                      {section.sectionTitle && (
                        <h4 className="section-title">{section.sectionTitle}</h4>
                      )}
                      {section.sectionInstruction && (
                        <p className="section-instruction" dangerouslySetInnerHTML={{ __html: section.sectionInstruction }} />
                      )}
                      {section.sectionImage && (
                        <img 
                          src={section.sectionImage.startsWith('http') ? section.sectionImage : `${API}${section.sectionImage}`}
                          alt="Section diagram" 
                          className="section-image"
                        />
                      )}
                    </div>
                  )}
                  
                  {/* Questions */}
                  {sectionQuestions.map((q) => {
                    const qNum = currentQuestionNumber;
                    const qType = q.type || q.questionType || 'multiple-choice';
                    
                    // For matching headings, count each paragraph as a question
                    if (qType === 'ielts-matching-headings') {
                      const paragraphCount = (q.paragraphs || q.answers || []).length;
                      currentQuestionNumber += paragraphCount || 1;
                    } 
                    // For cloze test, count each blank as a question
                    else if (qType === 'cloze-test' || qType === 'summary-completion') {
                      const clozeText = q.paragraphText || q.passageText || q.text || q.paragraph || 
                        (q.questionText && q.questionText.includes('[BLANK]') ? q.questionText : null);
                      if (clozeText) {
                        const blankMatches = clozeText.match(/\[BLANK\]/gi);
                        currentQuestionNumber += blankMatches ? blankMatches.length : 1;
                      } else {
                        currentQuestionNumber++;
                      }
                    } else {
                      currentQuestionNumber++;
                    }
                    return renderQuestion(q, qNum);
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Question Navigation Grid */}
      <div className="question-nav-panel">
        <div className="nav-panel-header">
          <span className="nav-panel-title">📊 Question Navigator</span>
          <span className="nav-panel-stats">
            <span className="stat-answered">✓ {stats.answered}</span>
            <span className="stat-divider">|</span>
            <span className="stat-remaining">○ {stats.total - stats.answered}</span>
          </span>
        </div>
        <div className="question-nav-grid">
          {Array.from({ length: stats.total }, (_, i) => {
            const qNum = i + 1;
            const key = `q_${qNum}`;
            const isAnswered = answers[key] && answers[key].toString().trim() !== '';
            const isActive = activeQuestion === qNum;
            
            return (
              <button
                key={qNum}
                className={`nav-question-btn ${isAnswered ? 'answered' : ''} ${isActive ? 'active' : ''}`}
                onClick={() => scrollToQuestion(qNum)}
                title={isAnswered ? `Question ${qNum} ✓` : `Question ${qNum}`}
              >
                {qNum}
              </button>
            );
          })}
        </div>
      </div>



      {/* Confirm Modal */}
      <ConfirmModal 
        isOpen={showConfirm} 
        onClose={() => !timeUp && setShowConfirm(false)} 
        onConfirm={confirmSubmit}
        title={timeUp ? '⏰ Hết giờ!' : '📝 Xác nhận nộp bài?'}
        message={timeUp 
          ? 'Thời gian đã hết. Bài làm sẽ được nộp tự động.'
          : `Bạn đã trả lời ${stats.answered}/${stats.total} câu. Bạn có chắc muốn nộp bài?`
        }
        type={timeUp ? 'warning' : 'info'} 
        confirmText={timeUp ? 'Nộp ngay' : 'Xác nhận nộp'} 
      />
    </div>
  );
};

export default DoReadingTest;
