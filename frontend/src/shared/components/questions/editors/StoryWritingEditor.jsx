import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const BLANK_PLACEHOLDER = '_____';

/**
 * StoryWritingEditor - Teacher editor for story writing questions
 * Used in: FCE Reading
 */
const StoryWritingEditor = ({ section, onChange }) => {
  const [data, setData] = useState({
    title: '',
    instructions: '',
    story: '',
    questions: [],
    ...section,
  });

  useEffect(() => {
    onChange?.(data);
  }, [data]);

  const handleFieldChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuestionChange = (id, field, value) => {
    setData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === id ? { ...q, [field]: value } : q
      ),
    }));
  };

  const addQuestion = () => {
    setData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: uuidv4(),
          text: '',
          correctAnswer: '',
          wordLimit: '1-3',
          hint: '',
        },
      ],
    }));
  };

  const removeQuestion = (id) => {
    setData((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== id),
    }));
  };

  const insertBlank = () => {
    const textarea = document.getElementById('story-writing-story');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentStory = data.story || '';
    const newStory =
      currentStory.substring(0, start) +
      BLANK_PLACEHOLDER +
      currentStory.substring(end);

    handleFieldChange('story', newStory);

    setTimeout(() => {
      textarea.focus();
      const newCursor = start + BLANK_PLACEHOLDER.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Story Writing Editor</h3>

      {/* Title */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Story Title</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          placeholder="e.g. A Lucky Escape"
          style={styles.input}
        />
      </div>

      {/* Instructions */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Instructions</label>
        <textarea
          value={data.instructions}
          onChange={(e) => handleFieldChange('instructions', e.target.value)}
          placeholder="e.g. Read the story and complete each sentence with ONE word only."
          rows={2}
          style={styles.textarea}
        />
      </div>

      {/* Story text with blank insertion */}
      <div style={styles.fieldGroup}>
        <div style={styles.labelRow}>
          <label style={styles.label}>Story Text</label>
          <button type="button" onClick={insertBlank} style={styles.insertBlankBtn}>
            + Insert Blank (_____)
          </button>
        </div>
        <textarea
          id="story-writing-story"
          value={data.story}
          onChange={(e) => handleFieldChange('story', e.target.value)}
          placeholder="Write the story here. Use the Insert Blank button to create gaps for students to fill."
          rows={10}
          style={styles.textarea}
        />
        <p style={styles.helpText}>
          Use <strong>{BLANK_PLACEHOLDER}</strong> to mark where students should fill in a word.
        </p>
      </div>

      {/* Questions */}
      <div style={styles.questionsSection}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Questions ({data.questions.length})</h4>
          <button type="button" onClick={addQuestion} style={styles.addBtn}>
            + Add Question
          </button>
        </div>

        {data.questions.length === 0 && (
          <p style={styles.emptyText}>No questions yet. Add questions to ask about the story.</p>
        )}

        {data.questions.map((q, idx) => (
          <div key={q.id} style={styles.questionCard}>
            <div style={styles.questionHeader}>
              <span style={styles.questionNumber}>Q{idx + 1}</span>
              <button
                type="button"
                onClick={() => removeQuestion(q.id)}
                style={styles.removeBtn}
              >
                Remove
              </button>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Question Text</label>
              <input
                type="text"
                value={q.text}
                onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
                placeholder="e.g. The main character was feeling ..."
                style={styles.input}
              />
            </div>

            <div style={styles.row}>
              <div style={{ ...styles.fieldGroup, flex: 1 }}>
                <label style={styles.label}>Correct Answer</label>
                <input
                  type="text"
                  value={q.correctAnswer}
                  onChange={(e) => handleQuestionChange(q.id, 'correctAnswer', e.target.value)}
                  placeholder="e.g. happy"
                  style={styles.input}
                />
              </div>
              <div style={{ ...styles.fieldGroup, width: '120px' }}>
                <label style={styles.label}>Word Limit</label>
                <input
                  type="text"
                  value={q.wordLimit}
                  onChange={(e) => handleQuestionChange(q.id, 'wordLimit', e.target.value)}
                  placeholder="1-3"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Hint (optional)</label>
              <input
                type="text"
                value={q.hint}
                onChange={(e) => handleQuestionChange(q.id, 'hint', e.target.value)}
                placeholder="e.g. opposite of sad"
                style={styles.input}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  fieldGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  insertBlankBtn: {
    padding: '6px 12px',
    backgroundColor: '#0ea5e9',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  helpText: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '6px 0 0 0',
  },
  questionsSection: {
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
  },
  addBtn: {
    padding: '8px 14px',
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  questionCard: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '14px',
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  questionNumber: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0ea5e9',
  },
  removeBtn: {
    padding: '6px 12px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  row: {
    display: 'flex',
    gap: '12px',
  },
};

export default StoryWritingEditor;
