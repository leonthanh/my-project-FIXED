import React from 'react';

const ComboboxQuestion = ({ question, onChange }) => {
  const handleChange = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  const handleLeftItemChange = (index, value) => {
    const newLeftItems = [...(question.leftItems || [])];
    newLeftItems[index] = value;
    handleChange('leftItems', newLeftItems);
  };

  const handleRightItemChange = (index, value) => {
    const newRightItems = [...(question.rightItems || [])];
    newRightItems[index] = value;
    handleChange('rightItems', newRightItems);
  };

  const handleMatchChange = (index, value) => {
    const newMatches = [...(question.matches || [])];
    newMatches[index] = value;
    handleChange('matches', newMatches);
  };

  const handleAddLeftItem = () => {
    const newLeftItems = [...(question.leftItems || []), ''];
    handleChange('leftItems', newLeftItems);
  };

  const handleRemoveLeftItem = (index) => {
    const newLeftItems = (question.leftItems || []).filter((_, i) => i !== index);
    handleChange('leftItems', newLeftItems);
  };

  const handleAddRightItem = () => {
    const newRightItems = [...(question.rightItems || []), ''];
    handleChange('rightItems', newRightItems);
  };

  const handleRemoveRightItem = (index) => {
    const newRightItems = (question.rightItems || []).filter((_, i) => i !== index);
    handleChange('rightItems', newRightItems);
  };

  const styles = {
    container: {
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '15px'
    },
    label: {
      fontWeight: 'bold',
      marginBottom: '8px',
      display: 'block',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '8px',
      marginBottom: '8px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      fontSize: '14px'
    },
    twoColumnContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      marginTop: '12px'
    },
    column: {
      display: 'flex',
      flexDirection: 'column'
    },
    columnTitle: {
      fontWeight: 'bold',
      marginBottom: '10px',
      color: '#0e276f',
      fontSize: '13px'
    },
    itemRow: {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px',
      alignItems: 'center'
    },
    itemInput: {
      flex: 1,
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      fontSize: '13px'
    },
    buttonSmall: {
      padding: '6px 10px',
      fontSize: '12px',
      borderRadius: '3px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '600'
    },
    addButton: {
      backgroundColor: '#0e276f',
      color: 'white'
    },
    removeButton: {
      backgroundColor: '#e03',
      color: 'white'
    },
    matchingLabel: {
      display: 'block',
      marginBottom: '12px',
      padding: '10px',
      backgroundColor: 'white',
      borderRadius: '4px',
      fontSize: '13px'
    },
    matchSelect: {
      padding: '6px',
      borderRadius: '3px',
      border: '1px solid #ccc',
      fontSize: '12px',
      marginLeft: '8px',
      minWidth: '100px'
    },
    previewContainer: {
      marginTop: '15px',
      padding: '12px',
      backgroundColor: 'white',
      borderRadius: '4px'
    },
    previewTitle: {
      fontWeight: 'bold',
      marginBottom: '12px',
      color: '#0e276f'
    },
    previewContent: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px'
    }
  };

  const leftItems = question.leftItems || [];
  const rightItems = question.rightItems || [];
  const matches = question.matches || [];

  return (
    <div style={styles.container}>
      <label style={styles.label}>❓ Câu hỏi:</label>
      <textarea
        value={question.questionText || ''}
        onChange={e => handleChange('questionText', e.target.value)}
        rows={2}
        style={styles.input}
        placeholder="Nhập hướng dẫn cho câu matching (ví dụ: Match the headings to the paragraphs)"
      />

      <div style={styles.twoColumnContainer}>
        {/* Left Column */}
        <div style={styles.column}>
          <div style={styles.columnTitle}>Left Items (A, B, C...)</div>
          {leftItems.map((item, index) => (
            <div key={index} style={styles.itemRow}>
              <span style={{ fontWeight: 'bold', minWidth: '20px' }}>
                {String.fromCharCode(65 + index)}.
              </span>
              <input
                type="text"
                value={item}
                onChange={e => handleLeftItemChange(index, e.target.value)}
                style={styles.itemInput}
                placeholder={`Item ${String.fromCharCode(65 + index)}`}
              />
              {leftItems.length > 1 && (
                <button
                  type="button"
                  style={{ ...styles.buttonSmall, ...styles.removeButton }}
                  onClick={() => handleRemoveLeftItem(index)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            style={{ ...styles.buttonSmall, ...styles.addButton, alignSelf: 'flex-start', marginTop: '8px' }}
            onClick={handleAddLeftItem}
          >
            + Add Left Item
          </button>
        </div>

        {/* Right Column */}
        <div style={styles.column}>
          <div style={styles.columnTitle}>Right Items (1, 2, 3...)</div>
          {rightItems.map((item, index) => (
            <div key={index} style={styles.itemRow}>
              <span style={{ fontWeight: 'bold', minWidth: '20px' }}>
                {index + 1}.
              </span>
              <input
                type="text"
                value={item}
                onChange={e => handleRightItemChange(index, e.target.value)}
                style={styles.itemInput}
                placeholder={`Item ${index + 1}`}
              />
              {rightItems.length > 1 && (
                <button
                  type="button"
                  style={{ ...styles.buttonSmall, ...styles.removeButton }}
                  onClick={() => handleRemoveRightItem(index)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            style={{ ...styles.buttonSmall, ...styles.addButton, alignSelf: 'flex-start', marginTop: '8px' }}
            onClick={handleAddRightItem}
          >
            + Add Right Item
          </button>
        </div>
      </div>

      {/* Matching Answers */}
      <div style={{ marginTop: '20px' }}>
        <label style={styles.label}>✅ Match Left Items to Right Items:</label>
        {leftItems.map((leftItem, index) => (
          <label key={index} style={styles.matchingLabel}>
            <span style={{ fontWeight: 'bold' }}>{String.fromCharCode(65 + index)}.</span> {leftItem}
            <select
              value={matches[index] || ''}
              onChange={e => handleMatchChange(index, e.target.value)}
              style={styles.matchSelect}
            >
              <option value="">Select...</option>
              {rightItems.map((_, ri) => (
                <option key={ri} value={String(ri + 1)}>
                  {ri + 1}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {/* Preview */}
      <div style={styles.previewContainer}>
        <div style={styles.previewTitle}>👁 Preview:</div>
        <p style={{ marginBottom: '12px', color: '#333', fontSize: '13px' }}>
          {question.questionText || 'Matching question preview'}
        </p>
        <div style={styles.previewContent}>
          <div>
            <strong style={{ color: '#0e276f' }}>Left Items:</strong>
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              {leftItems.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '4px', fontSize: '13px' }}>
                  {String.fromCharCode(65 + idx)}. {item || `Item ${String.fromCharCode(65 + idx)}`}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <strong style={{ color: '#0e276f' }}>Answers:</strong>
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              {leftItems.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '4px', fontSize: '13px', color: 'green' }}>
                  {String.fromCharCode(65 + idx)} → {matches[idx] || '?'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComboboxQuestion;
