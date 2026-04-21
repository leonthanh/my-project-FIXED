import React from 'react';
import QuillEditor from './QuillEditor';
import InlineIcon from './InlineIcon.jsx';

/**
 * IELTS Sentence Completion Question Component
 * Hoàn thành câu (chọn từ danh sách)
 * Dạng hoàn thành câu:
 * - Cho câu chưa hoàn chỉnh
 * - Học sinh chọn từ/cụm từ để hoàn thành
 * - Thường lấy từ trong bài đọc
 */

const SentenceCompletionQuestion = ({ question, onChange }) => {
  if (!question) {
    return <div style={{ color: 'red', padding: '10px' }}>Error: Question object missing</div>;
  }

  const sentenceBlankPattern = /(?:\[BLANK\]|_{3,}|\.{3,}|…+)/g;
  const getOptionLetter = (index) => String.fromCharCode(65 + index);

  const handleChange = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  // Initialize options if empty
  const options = question.options || ['', '', '', ''];

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    handleChange('options', newOptions);
  };

  const addOption = () => {
    handleChange('options', [...options, '']);
  };

  const removeOption = (index) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== index);
    handleChange('options', newOptions);
  };

  const selectCorrectAnswer = (index) => {
    handleChange('correctAnswer', options[index]);
  };

  const selectedOptionIndex = options.findIndex(
    (option) => option !== '' && option === question.correctAnswer
  );
  const selectedOptionLabel =
    selectedOptionIndex >= 0
      ? `${getOptionLetter(selectedOptionIndex)}. ${question.correctAnswer}`
      : question.correctAnswer || '';

  // Theme colors
  const primaryBlue = '#0e276f';
  const accentIndigo = '#6610f2';

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f3e8ff',
      borderRadius: '12px',
      border: `2px solid ${accentIndigo}`,
      marginTop: '15px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: `2px solid ${accentIndigo}`
    },
    headerIcon: {
      fontSize: '28px'
    },
    headerTitle: {
      margin: 0,
      color: accentIndigo,
      fontSize: '18px'
    },
    headerBadge: {
      backgroundColor: accentIndigo,
      color: 'white',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      marginLeft: 'auto'
    },
    section: {
      marginBottom: '20px'
    },
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: '0 0 10px 0',
      color: primaryBlue,
      fontSize: '14px',
      fontWeight: 'bold'
    },
    inputRow: {
      display: 'flex',
      gap: '15px',
      flexWrap: 'wrap'
    },
    inputGroup: {
      flex: 1,
      minWidth: '200px'
    },
    input: {
      width: '100%',
      padding: '12px',
      borderRadius: '8px',
      border: `2px solid ${accentIndigo}`,
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    wordLimitBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 16px',
      backgroundColor: '#fff3cd',
      border: '2px solid #ffc107',
      borderRadius: '8px',
      fontSize: '14px'
    },
    optionGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: '10px'
    },
    optionCard: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px',
      backgroundColor: 'white',
      border: '2px solid #ddd',
      borderRadius: '8px',
      transition: 'all 0.3s'
    },
    optionCardCorrect: {
      backgroundColor: '#d4edda',
      borderColor: '#28a745'
    },
    radio: {
      width: '20px',
      height: '20px',
      cursor: 'pointer'
    },
    optionInput: {
      flex: 1,
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '14px'
    },
    optionLetter: {
      minWidth: '30px',
      height: '30px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '999px',
      backgroundColor: '#ede9fe',
      color: accentIndigo,
      fontWeight: 'bold',
      flexShrink: 0
    },
    removeBtn: {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: '#dc3545',
      color: 'white',
      cursor: 'pointer',
      fontSize: '14px'
    },
    addBtn: {
      gridColumn: '1 / -1',
      padding: '12px',
      border: '2px dashed #6610f2',
      borderRadius: '8px',
      backgroundColor: 'transparent',
      color: '#6610f2',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    preview: {
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#e2d9f3',
      borderRadius: '8px',
      border: '1px solid #d4c4e5'
    },
    previewTitle: {
      margin: '0 0 10px 0',
      color: '#3d1a78',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    previewContent: {
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '6px',
      fontSize: '14px'
    },
    sentenceBox: {
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #ddd',
      fontSize: '15px',
      lineHeight: '1.8',
      marginBottom: '15px'
    },
    blankMarker: {
      display: 'inline-block',
      padding: '2px 20px',
      backgroundColor: '#fff3cd',
      border: '2px dashed #ffc107',
      borderRadius: '4px',
      fontWeight: 'bold'
    },
    tip: {
      marginTop: '15px',
      padding: '12px',
      backgroundColor: '#e2d9f3',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#3d1a78',
      borderLeft: `4px solid ${accentIndigo}`
    }
  };

  // Highlight blank in sentence
  const highlightBlank = (text) => {
    if (!text) return '';
    return text.replace(
      sentenceBlankPattern,
      '<span style="display:inline-block;padding:2px 25px;background:#fff3cd;border:2px dashed #ffc107;border-radius:4px;">______</span>'
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h4 style={styles.headerTitle}>Sentence Completion</h4>
        <span style={styles.headerBadge}>IELTS Reading</span>
      </div>

      {/* Incomplete Sentence */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>Câu chưa hoàn chỉnh (dùng _____ cho chỗ trống):</h5>
        <QuillEditor
          value={question.questionText || ''}
          onChange={(value) => handleChange('questionText', value)}
          placeholder="Ví dụ: The museum was built in _____ and has been renovated twice since then."
          showBlankButton={true}
        />
      </div>

      {/* Word Limit */}
      <div style={styles.section}>
        <div style={styles.inputRow}>
          <div style={styles.inputGroup}>
            <h5 style={styles.sectionTitle}>Giới hạn từ:</h5>
            <div style={styles.wordLimitBox}>
              <span>No more than</span>
              <input
                type="number"
                value={question.maxWords || 3}
                onChange={(e) => handleChange('maxWords', Number(e.target.value) || 1)}
                min="1"
                max="10"
                style={{
                  width: '60px',
                  padding: '8px',
                  border: '2px solid #ffc107',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              />
              <span>words from the passage</span>
            </div>
          </div>
        </div>
      </div>

      {/* Options / Word Bank */}
      <div style={styles.section}>
        <h5 style={styles.sectionTitle}>Danh sách từ/cụm từ (click radio để chọn đáp án đúng):</h5>
        
        <div style={styles.optionGrid}>
          {options.map((option, index) => {
            const isCorrect = question.correctAnswer === option && option !== '';
            
            return (
              <div
                key={index}
                style={{
                  ...styles.optionCard,
                  ...(isCorrect ? styles.optionCardCorrect : {})
                }}
              >
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={isCorrect}
                  onChange={() => selectCorrectAnswer(index)}
                  style={styles.radio}
                  disabled={!option}
                />
                <span
                  style={{
                    ...styles.optionLetter,
                    ...(isCorrect
                      ? {
                          backgroundColor: '#28a745',
                          color: 'white',
                        }
                      : {}),
                  }}
                >
                  {getOptionLetter(index)}
                </span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Lựa chọn ${getOptionLetter(index)}`}
                  style={styles.optionInput}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    style={styles.removeBtn}
                    title="Xóa"
                  >
                    <InlineIcon name="close" size={12} style={{ color: 'currentColor' }} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Option Button */}
          {options.length < 10 && (
            <button type="button" onClick={addOption} style={styles.addBtn}>
              + Thêm lựa chọn
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      {(question.questionText || options.some(o => o)) && (
        <div style={styles.preview}>
          <h5 style={styles.previewTitle}>Xem trước - Học sinh sẽ thấy:</h5>
          <div style={styles.previewContent}>
            {/* The sentence with blank */}
            <div style={styles.sentenceBox}>
              <strong style={{ color: accentIndigo }}>Complete the sentence:</strong>
              <div 
                style={{ marginTop: '10px' }}
                dangerouslySetInnerHTML={{ __html: highlightBlank(question.questionText || '') }}
              />
            </div>

            {/* Word limit notice */}
            {question.maxWords && (
              <p style={{ 
                color: '#856404', 
                backgroundColor: '#fff3cd',
                padding: '8px 12px',
                borderRadius: '4px',
                margin: '10px 0',
                fontSize: '13px'
              }}>
                Choose <strong>NO MORE THAN {question.maxWords} WORDS</strong> from the passage.
              </p>
            )}

            {/* Available options */}
            {options.some(o => o) && (
              <div style={{ marginTop: '15px' }}>
                <strong>Options:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {options.filter(o => o).map((option, index) => (
                    <span
                      key={index}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: option === question.correctAnswer ? '#28a745' : '#f8f9fa',
                        color: option === question.correctAnswer ? 'white' : '#333',
                        borderRadius: '20px',
                        border: option === question.correctAnswer ? 'none' : '1px solid #ddd',
                        fontSize: '13px',
                        fontWeight: option === question.correctAnswer ? 'bold' : 'normal'
                      }}
                    >
                      {`${getOptionLetter(index)}. ${option}`}
                      {option === question.correctAnswer && (
                        <span style={{ marginLeft: '6px', display: 'inline-flex', verticalAlign: 'middle' }}>
                          <InlineIcon name="correct" size={12} style={{ color: 'white' }} />
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Correct Answer Summary */}
            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
              <strong>Đáp án đúng:</strong>{' '}
              {question.correctAnswer ? (
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  borderRadius: '20px',
                  fontWeight: 'bold'
                }}>
                  {selectedOptionLabel}
                </span>
              ) : (
                <span style={{ color: '#999' }}>(Chưa chọn)</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div style={styles.tip}>
        <strong>Hướng dẫn:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Viết câu chưa hoàn chỉnh với chỗ trống <strong>_____</strong></li>
          <li>Thêm các từ/cụm từ có thể điền vào chỗ trống</li>
          <li>Click radio bên cạnh để chọn đáp án đúng</li>
          <li>Các lựa chọn thường được lấy từ bài đọc</li>
        </ul>
      </div>
    </div>
  );
};

export default SentenceCompletionQuestion;
