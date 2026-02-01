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
  // Accept either mapImageUrl (legacy) or imageUrl (editor uses this key)
  const initialUrl = question?.mapImageUrl || question?.imageUrl || '';
  const [previewUrl, setPreviewUrl] = useState(initialUrl);

  // Labels for map positions (A-H or customizable)
  const defaultLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  // Helper to call onChange in either (field, value) or (updatedQuestion) form
  const safeOnChange = (field, value) => {
    if (!onChange) return;
    // If parent handler expects 2+ args, call (field, value). Otherwise pass full updated question object.
    if (typeof onChange === 'function' && (onChange.length >= 2)) {
      onChange(field, value);
    } else {
      onChange({ ...(question || {}), [field]: value });
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        safeOnChange('mapImageUrl', reader.result);
        safeOnChange('imageUrl', reader.result);
        // also pass file objects (some parents may not persist files but keep them transient)
        safeOnChange('mapImageFile', file);
        safeOnChange('imageFile', file);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle URL input for map image
  const handleImageUrlChange = (url) => {
    setPreviewUrl(url);
    safeOnChange('mapImageUrl', url);
    safeOnChange('imageUrl', url);
  };

  // Handle item change (for edit mode)
  const handleItemChange = (index, field, value) => {
    const newItems = [...(question.items || [])];
    if (!newItems[index]) {
      newItems[index] = { label: '', correctAnswer: '', position: null };
    }
    newItems[index] = { ...newItems[index], [field]: value };
    safeOnChange('items', newItems);
  };

  // Add new item
  const handleAddItem = () => {
    const currentItems = question.items || [];
    const items = [...currentItems, { label: '', correctAnswer: '', position: null }];
    if (onChange) onChange('items', items);
  };

  // Remove item
  const handleRemoveItem = (index) => {
    const newItems = (question.items || []).filter((_, i) => i !== index);
    safeOnChange('items', newItems);
  };

  // Available labels for dropdown (exclude already used ones)
  const getAvailableLabels = (currentIndex) => {
    const usedLabels = (question.items || [])
      .filter((_, i) => i !== currentIndex)
      .map(item => item.correctAnswer)
      .filter(Boolean);
    return defaultLabels.filter(l => !usedLabels.includes(l));
  };

  // Helper refs: container and the actual <img> element
  const imgContainerRef = useRef(null);
  const imgRef = useRef(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const draggingRef = useRef({ index: null, offsetX: 0, offsetY: 0 });

  // Compute position relative to the *image element* bounding rect (more accurate across layouts)
  const setItemPosition = (index, clientX, clientY) => {
    const imgEl = imgRef.current;
    // Fallback to container if imgRef not available
    const container = imgEl || imgContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // Calculate pixel offset relative to image and snap to nearest pixel to avoid subpixel drift
    const pxX = Math.round(Math.max(0, Math.min(rect.width, clientX - rect.left)));
    const pxY = Math.round(Math.max(0, Math.min(rect.height, clientY - rect.top)));

    const x = Math.max(0, Math.min(100, (pxX / rect.width) * 100));
    const y = Math.max(0, Math.min(100, (pxY / rect.height) * 100));

    const newItems = [...(question.items || [])];
    newItems[index] = { ...(newItems[index] || {}), position: { x, y } };
    safeOnChange('items', newItems);
  };

  // Clicking image places currently selected item
  const handleMapClickPlace = (e) => {
    if (mode !== 'edit') return;
    if (selectedItemIndex == null) return;
    setItemPosition(selectedItemIndex, e.clientX, e.clientY);
  };

  // Dragging marker
  const startDrag = (index, e) => {
    e.stopPropagation();
    draggingRef.current = { index, offsetX: 0, offsetY: 0 };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', stopDrag);
  };

  const onDragMove = (e) => {
    const d = draggingRef.current;
    if (d.index == null) return;
    setItemPosition(d.index, e.clientX, e.clientY);
  };

  const stopDrag = () => {
    draggingRef.current = { index: null, offsetX: 0, offsetY: 0 };
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', stopDrag);
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
          {(previewUrl || question.imageUrl) && (
            <div
              ref={imgContainerRef}
              onClick={handleMapClickPlace}
              style={{ 
                position: 'relative',
                maxWidth: '600px', 
                border: '2px solid #e2e8f0', 
                borderRadius: '8px', 
                overflow: 'hidden',
                background: '#fff'
              }}>

              {selectedItemIndex != null && (
                <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 60, background: 'rgba(255,255,255,0.98)', padding: '6px 10px', borderRadius: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.08)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <strong style={{ fontSize: 12, color: '#0e276f' }}>Đang chọn:</strong>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{question.items?.[selectedItemIndex]?.label || '(chưa đặt tên)'}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedItemIndex(null); }} style={{ padding: '4px 8px', marginLeft: 6, border: 'none', background: '#ef4444', color: 'white', borderRadius: 6 }}>Huỷ</button>
                </div>
              )}

              <img 
                ref={imgRef}
                src={previewUrl || question.imageUrl} 
                alt="Map preview" 
                style={{ width: '100%', display: 'block' }}
                onClick={handleMapClickPlace}
              />

              {/* Markers overlay (edit mode) */}
              {(question.items || []).map((item, idx) => {
                const pos = item.position || null;
                if (!pos) return null;

                // When image dimensions are known, snap marker to integer pixels for crisp display
                let leftStyle = `${pos.x}%`;
                let topStyle = `${pos.y}%`;
                const imgEl = imgRef.current;
                if (imgEl) {
                  const w = imgEl.clientWidth;
                  const h = imgEl.clientHeight;
                  leftStyle = `${Math.round((pos.x / 100) * w)}px`;
                  topStyle = `${Math.round((pos.y / 100) * h)}px`;
                }

                return (
                  <div
                    key={`marker-${idx}`}
                    onMouseDown={(e) => startDrag(idx, e)}
                    onClick={(e) => { e.stopPropagation(); setSelectedItemIndex(idx); }}
                    title={`Item ${idx + 1}: ${item.label || ''}`}
                    style={{
                      position: 'absolute',
                      left: leftStyle,
                      top: topStyle,
                      transform: 'translate(-50%, -50%)',
                      zIndex: selectedItemIndex === idx ? 40 : 30,
                      cursor: 'grab',
                      willChange: 'transform'
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      background: '#ef4444',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      boxShadow: selectedItemIndex === idx ? '0 0 0 4px rgba(59,130,246,0.12)' : undefined
                    }}>{item.correctAnswer || '?'}</div>
                  </div>
                );
              })}

              {/* Helper for placing marker */}
              <div style={{ padding: 8, fontSize: 12, color: '#334155' }}>
                💡 Chọn một mục bên trái, sau đó click vào bản đồ để đặt nhãn (hoặc kéo thả marker).
              </div>
            </div>
          )}
        </div>

        {/* Items to label */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            📍 Các địa điểm cần gắn nhãn:
          </label>
          
          {(question.items || []).map((item, index) => {
            const selected = selectedItemIndex === index;
            return (
              <div key={index} style={{ 
                display: 'flex', 
                gap: '10px', 
                alignItems: 'center',
                marginBottom: '10px',
                padding: '10px',
                background: selected ? '#eff6ff' : '#fff',
                borderRadius: '6px',
                border: selected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                position: 'relative'
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
                  onClick={() => setSelectedItemIndex(index)}
                  style={{
                    padding: '6px 12px',
                    background: selected ? '#3b82f6' : '#f3f4f6',
                    color: selected ? 'white' : '#0e276f',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {selected ? 'Đang chọn' : 'Chọn'}
                </button>

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
            );
          })}

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
