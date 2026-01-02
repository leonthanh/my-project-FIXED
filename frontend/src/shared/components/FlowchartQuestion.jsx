import React from 'react';

/**
 * FlowchartQuestion - Component for IELTS Flowchart Completion questions
 * 
 * For Creating Test: allows defining flowchart steps and answer options
 * For Taking Test: displays flowchart with dropdown/input for answers
 */
const FlowchartQuestion = ({ 
  question, 
  onChange, 
  mode = 'edit', // 'edit' (create test) | 'answer' (take test) | 'review' (view results)
  onAnswerChange,
  studentAnswer,
  showCorrect = false,
  questionNumber = 1
}) => {
  // Handle step change (for edit mode)
  const handleStepChange = (index, field, value) => {
    const newSteps = [...(question.steps || [])];
    if (!newSteps[index]) {
      newSteps[index] = { text: '', blankPosition: 0, correctAnswer: '' };
    }
    newSteps[index] = { ...newSteps[index], [field]: value };
    onChange?.({ ...question, steps: newSteps });
  };

  // Handle options change
  const handleOptionsChange = (value) => {
    const options = value.split('\n').map(o => o.trim()).filter(Boolean);
    onChange?.({ ...question, options });
  };

  // Add new step
  const handleAddStep = () => {
    const currentSteps = question.steps || [];
    onChange?.({
      ...question,
      steps: [...currentSteps, { text: '', blankPosition: 0, correctAnswer: '' }]
    });
  };

  // Remove step
  const handleRemoveStep = (index) => {
    const newSteps = (question.steps || []).filter((_, i) => i !== index);
    onChange?.({ ...question, steps: newSteps });
  };

  // Render step text with blank
  const renderStepWithBlank = (step, qNum, isEdit = false) => {
    const text = step.text || '';
    const blankPos = step.blankPosition || 0;
    
    // Find [____] or similar blank markers in text
    const blankMatch = text.match(/\[[\s_]+\]|\{[\s_]+\}|_{3,}/);
    
    if (blankMatch) {
      const parts = text.split(blankMatch[0]);
      return (
        <>
          {parts[0]}
          <strong style={{ 
            display: 'inline-block',
            minWidth: '80px',
            padding: '4px 8px',
            background: isEdit ? '#fef3c7' : '#e0e7ff',
            borderRadius: '4px',
            textAlign: 'center',
            margin: '0 4px'
          }}>
            {qNum}
          </strong>
          {parts[1] || ''}
        </>
      );
    }
    
    return text;
  };

  // ========== EDIT MODE ==========
  if (mode === 'edit') {
    return (
      <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
        <h4 style={{ margin: '0 0 15px', color: '#0e276f', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📊 Flowchart Completion
        </h4>

        {/* Options list */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            📋 Danh sách lựa chọn (mỗi dòng một lựa chọn):
          </label>
          <textarea
            placeholder="A website&#10;B locations&#10;C designs&#10;D TV advertising&#10;E quality&#10;F values&#10;G software"
            value={(question.options || []).join('\n')}
            onChange={(e) => handleOptionsChange(e.target.value)}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '0.95rem'
            }}
          />
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '5px' }}>
            💡 Định dạng: "A website" hoặc "website" - sẽ tự động gán ký tự A, B, C...
          </p>
        </div>

        {/* Flowchart steps */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            🔄 Các bước trong flowchart:
          </label>
          
          {(question.steps || []).map((step, index) => (
            <div key={index} style={{ 
              marginBottom: '15px',
              position: 'relative'
            }}>
              {/* Arrow connector */}
              {index > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '1.5rem',
                  color: '#3b82f6'
                }}>
                  ⬇️
                </div>
              )}
              
              <div style={{ 
                padding: '15px',
                background: '#fff',
                borderRadius: '8px',
                border: '2px solid #3b82f6',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ 
                    fontWeight: '600', 
                    color: '#0e276f',
                    background: '#e0e7ff',
                    padding: '4px 10px',
                    borderRadius: '4px'
                  }}>
                    Câu {questionNumber + index}
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(index)}
                    style={{
                      marginLeft: 'auto',
                      padding: '4px 10px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    🗑️ Xóa
                  </button>
                </div>

                <textarea
                  placeholder="Nhập nội dung bước (dùng [____] để đánh dấu chỗ trống)&#10;VD: The product [____] led to a wider customer base."
                  value={step.text || ''}
                  onChange={(e) => handleStepChange(index, 'text', e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    marginBottom: '10px'
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontWeight: '500' }}>Đáp án đúng:</label>
                  <select
                    value={step.correctAnswer || ''}
                    onChange={(e) => handleStepChange(index, 'correctAnswer', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      minWidth: '200px'
                    }}
                  >
                    <option value="">Chọn đáp án</option>
                    {(question.options || []).map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddStep}
            style={{
              padding: '10px 20px',
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            ➕ Thêm bước
          </button>
        </div>

        {/* Preview */}
        {(question.steps || []).length > 0 && (
          <div style={{ 
            marginTop: '20px',
            padding: '15px',
            background: '#fff',
            borderRadius: '8px',
            border: '1px dashed #3b82f6'
          }}>
            <h5 style={{ margin: '0 0 15px', color: '#3b82f6' }}>👁️ Xem trước:</h5>
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px'
            }}>
              {(question.steps || []).map((step, index) => (
                <React.Fragment key={index}>
                  <div style={{
                    padding: '12px 20px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    maxWidth: '400px',
                    textAlign: 'center'
                  }}>
                    {renderStepWithBlank(step, questionNumber + index, true)}
                  </div>
                  {index < (question.steps || []).length - 1 && (
                    <div style={{ fontSize: '1.2rem', color: '#3b82f6' }}>↓</div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== ANSWER MODE (Take test) ==========
  if (mode === 'answer') {
    return (
      <div style={{ padding: '15px' }}>
        {/* Options list */}
        <div style={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '20px',
          padding: '15px',
          background: '#f0f9ff',
          borderRadius: '8px'
        }}>
          {(question.options || []).map((opt, i) => (
            <span key={i} style={{
              padding: '6px 12px',
              background: '#fff',
              border: '1px solid #3b82f6',
              borderRadius: '20px',
              fontSize: '0.9rem'
            }}>
              {opt}
            </span>
          ))}
        </div>

        {/* Flowchart */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px'
        }}>
          {(question.steps || []).map((step, index) => {
            const qNum = questionNumber + index;
            return (
              <React.Fragment key={index}>
                <div style={{
                  padding: '15px 20px',
                  background: '#fff',
                  borderRadius: '8px',
                  border: '2px solid #3b82f6',
                  maxWidth: '450px',
                  width: '100%',
                  textAlign: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ marginBottom: '10px', lineHeight: '1.6' }}>
                    {step.text?.split(/\[[\s_]+\]|\{[\s_]+\}|_{3,}/)[0]}
                    <select
                      value={studentAnswer?.[`q_${qNum}`] || ''}
                      onChange={(e) => onAnswerChange?.(qNum, e.target.value)}
                      style={{
                        padding: '6px 12px',
                        border: '2px solid #3b82f6',
                        borderRadius: '6px',
                        fontWeight: '600',
                        margin: '0 5px',
                        minWidth: '120px'
                      }}
                    >
                      <option value="">Câu {qNum}</option>
                      {(question.options || []).map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {step.text?.split(/\[[\s_]+\]|\{[\s_]+\}|_{3,}/)[1] || ''}
                  </div>
                </div>
                {index < (question.steps || []).length - 1 && (
                  <div style={{ fontSize: '1.5rem', color: '#3b82f6' }}>⬇️</div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // ========== REVIEW MODE (View results) ==========
  if (mode === 'review') {
    return (
      <div style={{ padding: '15px' }}>
        {/* Options list */}
        <div style={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '20px',
          padding: '15px',
          background: '#f0f9ff',
          borderRadius: '8px'
        }}>
          {(question.options || []).map((opt, i) => (
            <span key={i} style={{
              padding: '6px 12px',
              background: '#fff',
              border: '1px solid #3b82f6',
              borderRadius: '20px',
              fontSize: '0.9rem'
            }}>
              {opt}
            </span>
          ))}
        </div>

        {/* Flowchart with results */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px'
        }}>
          {(question.steps || []).map((step, index) => {
            const qNum = questionNumber + index;
            const studentAns = studentAnswer?.[`q_${qNum}`] || '';
            const correctAns = step.correctAnswer;
            const isCorrect = studentAns?.toLowerCase() === correctAns?.toLowerCase();

            return (
              <React.Fragment key={index}>
                <div style={{
                  padding: '15px 20px',
                  background: isCorrect ? '#f0fdf4' : '#fef2f2',
                  borderRadius: '8px',
                  border: `2px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                  maxWidth: '500px',
                  width: '100%',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ marginBottom: '10px', lineHeight: '1.6', textAlign: 'center' }}>
                    {step.text?.split(/\[[\s_]+\]|\{[\s_]+\}|_{3,}/)[0]}
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      background: isCorrect ? '#dcfce7' : '#fee2e2',
                      borderRadius: '6px',
                      fontWeight: '600',
                      margin: '0 5px',
                      color: isCorrect ? '#166534' : '#991b1b'
                    }}>
                      {studentAns || '—'} {isCorrect ? '✅' : '❌'}
                    </span>
                    {step.text?.split(/\[[\s_]+\]|\{[\s_]+\}|_{3,}/)[1] || ''}
                  </div>
                  
                  {showCorrect && !isCorrect && (
                    <div style={{ 
                      textAlign: 'center',
                      fontSize: '0.9rem',
                      color: '#166534',
                      marginTop: '8px'
                    }}>
                      ✓ Đáp án đúng: <strong>{correctAns}</strong>
                    </div>
                  )}
                </div>
                {index < (question.steps || []).length - 1 && (
                  <div style={{ fontSize: '1.5rem', color: '#3b82f6' }}>⬇️</div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

export default FlowchartQuestion;
