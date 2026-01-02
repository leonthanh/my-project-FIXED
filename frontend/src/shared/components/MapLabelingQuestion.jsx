import React, { useState, useRef } from 'react';

/**
 * MapLabelingQuestion - Component for IELTS Map/Plan Labeling questions
 * 
 * For Creating Test: allows uploading map image and setting correct answers
 * For Taking Test: displays map with dropdowns/inputs for answers
 */
const MapLabelingQuestion = ({ 
  question, 
  onChange, 
  mode = 'edit', // 'edit' (create test) | 'answer' (take test) | 'review' (view results)
  onAnswerChange,
  studentAnswer,
  showCorrect = false,
  questionNumber = 1
}) => {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(question?.mapImageUrl || '');

  // Labels for map positions (A-H or customizable)
  const defaultLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        onChange?.({
          ...question,
          mapImageUrl: reader.result,
          mapImageFile: file
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle URL input for map image
  const handleImageUrlChange = (url) => {
    setPreviewUrl(url);
    onChange?.({
      ...question,
      mapImageUrl: url
    });
  };

  // Handle item change (for edit mode)
  const handleItemChange = (index, field, value) => {
    const newItems = [...(question.items || [])];
    if (!newItems[index]) {
      newItems[index] = { label: '', correctAnswer: '' };
    }
    newItems[index] = { ...newItems[index], [field]: value };
    onChange?.({ ...question, items: newItems });
  };

  // Add new item
  const handleAddItem = () => {
    const currentItems = question.items || [];
    onChange?.({
      ...question,
      items: [...currentItems, { label: '', correctAnswer: '' }]
    });
  };

  // Remove item
  const handleRemoveItem = (index) => {
    const newItems = (question.items || []).filter((_, i) => i !== index);
    onChange?.({ ...question, items: newItems });
  };

  // Available labels for dropdown (exclude already used ones)
  const getAvailableLabels = (currentIndex) => {
    const usedLabels = (question.items || [])
      .filter((_, i) => i !== currentIndex)
      .map(item => item.correctAnswer)
      .filter(Boolean);
    return defaultLabels.filter(l => !usedLabels.includes(l));
  };

  // ========== EDIT MODE ==========
  if (mode === 'edit') {
    return (
      <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
        <h4 style={{ margin: '0 0 15px', color: '#0e276f', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🗺️ Map/Plan Labeling
        </h4>

        {/* Map Image Upload */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            📷 Hình ảnh bản đồ/sơ đồ:
          </label>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              📁 Tải lên hình
            </button>
            <span style={{ color: '#64748b' }}>hoặc</span>
            <input
              type="text"
              placeholder="Nhập URL hình ảnh..."
              value={question.mapImageUrl || ''}
              onChange={(e) => handleImageUrlChange(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>

          {/* Preview */}
          {previewUrl && (
            <div style={{ 
              maxWidth: '600px', 
              border: '2px solid #e2e8f0', 
              borderRadius: '8px', 
              overflow: 'hidden',
              background: '#fff'
            }}>
              <img 
                src={previewUrl} 
                alt="Map preview" 
                style={{ width: '100%', display: 'block' }}
              />
            </div>
          )}
        </div>

        {/* Items to label */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            📍 Các địa điểm cần gắn nhãn:
          </label>
          
          {(question.items || []).map((item, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              gap: '10px', 
              alignItems: 'center',
              marginBottom: '10px',
              padding: '10px',
              background: '#fff',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <span style={{ 
                fontWeight: '600', 
                color: '#0e276f',
                minWidth: '30px'
              }}>
                {questionNumber + index}.
              </span>
              
              <input
                type="text"
                placeholder="Tên địa điểm (VD: Supermarket)"
                value={item.label || ''}
                onChange={(e) => handleItemChange(index, 'label', e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
              
              <select
                value={item.correctAnswer || ''}
                onChange={(e) => handleItemChange(index, 'correctAnswer', e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  minWidth: '80px'
                }}
              >
                <option value="">Chọn đáp án</option>
                {getAvailableLabels(index).map(label => (
                  <option key={label} value={label}>{label}</option>
                ))}
                {item.correctAnswer && !getAvailableLabels(index).includes(item.correctAnswer) && (
                  <option value={item.correctAnswer}>{item.correctAnswer}</option>
                )}
              </select>

              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                style={{
                  padding: '6px 12px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🗑️
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
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
            ➕ Thêm địa điểm
          </button>
        </div>

        {/* Labels info */}
        <div style={{ 
          padding: '10px', 
          background: '#fef3c7', 
          borderRadius: '6px',
          fontSize: '0.9rem',
          color: '#92400e'
        }}>
          💡 <strong>Hướng dẫn:</strong> Hình ảnh bản đồ cần có các vị trí đánh dấu A-H (hoặc số). 
          Học sinh sẽ chọn đúng vị trí cho mỗi địa điểm.
        </div>
      </div>
    );
  }

  // ========== ANSWER MODE (Take test) ==========
  if (mode === 'answer') {
    return (
      <div style={{ padding: '15px' }}>
        {/* Map Image */}
        {question.mapImageUrl && (
          <div style={{ 
            maxWidth: '700px', 
            margin: '0 auto 20px',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <img 
              src={question.mapImageUrl} 
              alt="Map" 
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        )}

        {/* Answer inputs */}
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          {(question.items || []).map((item, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '15px',
              marginBottom: '12px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '8px'
            }}>
              <span style={{ 
                fontWeight: '700', 
                color: '#0e276f',
                minWidth: '35px'
              }}>
                {questionNumber + index}.
              </span>
              
              <span style={{ flex: 1 }}>{item.label}</span>

              <select
                value={studentAnswer?.[`q_${questionNumber + index}`] || ''}
                onChange={(e) => onAnswerChange?.(questionNumber + index, e.target.value)}
                style={{
                  padding: '8px 16px',
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  minWidth: '70px'
                }}
              >
                <option value="">--</option>
                {defaultLabels.slice(0, 8).map(label => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========== REVIEW MODE (View results) ==========
  if (mode === 'review') {
    return (
      <div style={{ padding: '15px' }}>
        {/* Map Image */}
        {question.mapImageUrl && (
          <div style={{ 
            maxWidth: '700px', 
            margin: '0 auto 20px',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <img 
              src={question.mapImageUrl} 
              alt="Map" 
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        )}

        {/* Results */}
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          {(question.items || []).map((item, index) => {
            const qNum = questionNumber + index;
            const studentAns = studentAnswer?.[`q_${qNum}`] || '';
            const correctAns = item.correctAnswer;
            const isCorrect = studentAns.toUpperCase() === correctAns?.toUpperCase();

            return (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '15px',
                marginBottom: '12px',
                padding: '12px',
                background: isCorrect ? '#f0fdf4' : '#fef2f2',
                borderRadius: '8px',
                border: `1px solid ${isCorrect ? '#22c55e' : '#ef4444'}`
              }}>
                <span style={{ 
                  fontWeight: '700', 
                  color: '#0e276f',
                  minWidth: '35px'
                }}>
                  {qNum}.
                </span>
                
                <span style={{ flex: 1 }}>{item.label}</span>

                <span style={{ 
                  fontWeight: '600',
                  color: isCorrect ? '#22c55e' : '#ef4444'
                }}>
                  {studentAns || '—'}
                </span>

                {showCorrect && !isCorrect && (
                  <span style={{ 
                    fontWeight: '600',
                    color: '#22c55e',
                    marginLeft: '10px'
                  }}>
                    ✓ {correctAns}
                  </span>
                )}

                <span style={{ fontSize: '1.2rem' }}>
                  {isCorrect ? '✅' : '❌'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

export default MapLabelingQuestion;
