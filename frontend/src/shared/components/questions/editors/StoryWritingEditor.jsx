import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { v4 as uuidv4 } from 'uuid';
import useQuillImageUpload from '../../../hooks/useQuillImageUpload';
import PREPARE_WRITING_RUBRIC from '../../../config/prepareWritingRubric';

const BLANK_PLACEHOLDER = '_____';
const PREPARE_WRITING_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'color',
  'background',
  'list',
  'bullet',
  'align',
  'link',
  'image',
];

/**
 * StoryWritingEditor - Teacher editor for story writing questions
 * Used in: General Reading
 */
const StoryWritingEditor = ({
  question = {},
  onChange = () => {},
  sectionTitle = 'Writing',
}) => {
  const data = question || {};
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const isPrepareWriting = Boolean(data.prepareWritingMode);
  const { quillRef, modules } = useQuillImageUpload();
  const handleFieldChange = (field, value) => onChange(field, value);

  const handleQuestionChange = (id, field, value) => {
    onChange('questions', questions.map((q) =>
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const addQuestion = () => {
    onChange('questions', [
      ...questions,
      {
        id: uuidv4(),
        text: '',
        correctAnswer: '',
        wordLimit: '1-3',
        hint: '',
      },
    ]);
  };

  const removeQuestion = (id) => {
    onChange('questions', questions.filter((q) => q.id !== id));
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
      <h3 style={styles.title}>{isPrepareWriting ? 'Prepare Writing Task (W)' : 'Story Writing Editor'}</h3>

      {/* Title */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>{isPrepareWriting ? 'Task Title (optional)' : 'Story Title'}</label>
        <input
          type="text"
          value={data.title || ''}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          placeholder={isPrepareWriting ? "e.g. Katie's letter" : "e.g. A Lucky Escape"}
          style={styles.input}
        />
      </div>

      {/* Instructions */}
      <div style={styles.fieldGroup}>
        <label style={{ ...styles.label, ...(isPrepareWriting ? styles.prepareInstructionsLabel : {}) }}>
          Instructions
        </label>
        <textarea
          value={data.instructions || ''}
          onChange={(e) => handleFieldChange('instructions', e.target.value)}
          placeholder={isPrepareWriting
            ? 'Enter the writing task instructions shown to students.'
            : 'e.g. Read the story and complete each sentence with ONE word only.'}
          rows={2}
          style={{ ...styles.textarea, ...(isPrepareWriting ? styles.prepareInstructionsInput : {}) }}
        />
      </div>

      {/* Story text with blank insertion */}
      <div style={styles.fieldGroup}>
        <div style={styles.labelRow}>
          <label style={styles.label}>{isPrepareWriting ? 'Letter / Prompt Text' : 'Story Text'}</label>
          {!isPrepareWriting && (
            <button type="button" onClick={insertBlank} style={styles.insertBlankBtn}>
              + Insert Blank (_____)
            </button>
          )}
        </div>
        {isPrepareWriting ? (
          <div className="story-writing-editor__quill">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              aria-label="Letter / Prompt Text editor"
              value={data.story || ''}
              onChange={(content) => handleFieldChange('story', content)}
              placeholder="Enter the letter or prompt that students should read before writing their response."
              modules={modules}
              formats={PREPARE_WRITING_FORMATS}
              style={{ minHeight: '180px', backgroundColor: '#fff' }}
            />
          </div>
        ) : (
          <textarea
            id="story-writing-story"
            value={data.story || ''}
            onChange={(e) => handleFieldChange('story', e.target.value)}
            placeholder="Write the story here. Use the Insert Blank button to create gaps for students to fill."
            rows={10}
            style={styles.textarea}
          />
        )}
        {isPrepareWriting ? (
          <p style={styles.helpText}>
            Students will write their response separately. The Prepare rubric is displayed automatically; do not add it to this prompt.
          </p>
        ) : (
          <p style={styles.helpText}>
            Use <strong>{BLANK_PLACEHOLDER}</strong> to mark where students should fill in a word.
          </p>
        )}
      </div>

      {/* Questions */}
      {!isPrepareWriting && <div style={styles.questionsSection}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Questions ({questions.length})</h4>
          <button type="button" onClick={addQuestion} style={styles.addBtn}>
            + Add Question
          </button>
        </div>

        {questions.length === 0 && (
          <p style={styles.emptyText}>No questions yet. Add questions to ask about the story.</p>
        )}

        {questions.map((q, idx) => (
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
      </div>}
      {isPrepareWriting && (
        <section style={styles.preview}>
          <h4 style={styles.previewTitle}>Xem trước đề học sinh:</h4>
          <div style={styles.previewFrame}>
            <div style={styles.previewHeader}>{sectionTitle || 'Writing'}</div>
            <div data-testid="prepare-writing-preview-columns" style={styles.previewColumns}>
              <div style={styles.previewPrompt}>
                <h5 style={styles.previewTaskHeading}>Writing task:</h5>
                {data.title && <h5 style={styles.previewLetterTitle}>{data.title}</h5>}
                {data.instructions && <p style={styles.previewTextBold}>{data.instructions}</p>}
                {data.story && (
                  <div
                    className="story-writing-editor__previewContent"
                    dangerouslySetInnerHTML={{ __html: data.story }}
                  />
                )}
                <div style={styles.previewRubric}>
                  <strong>Prepare Writing rubric: 10 points</strong>
                  <table style={styles.previewRubricTable}>
                    <tbody>
                      {(Array.isArray(data.writingRubric) && data.writingRubric.length
                        ? data.writingRubric
                        : PREPARE_WRITING_RUBRIC
                      ).map((criterion) => (
                        <tr key={criterion.criterion}>
                          <td style={styles.previewRubricCriterion}>{criterion.criterion}</td>
                          <td style={styles.previewRubricPoints}>{criterion.points}/2.5</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={styles.previewRubricNote}>
                    Teacher-graded separately out of 10; not included in the website score out of 50.
                  </p>
                </div>
              </div>
              <div style={styles.previewAnswer}>
                <h5 style={styles.previewAnswerTitle}>Write your {data.messageType || 'response'}:</h5>
                <p style={styles.previewWordLimit}>
                  Write about {Number(data.wordLimit?.min) || 80} words
                </p>
                <div style={styles.previewTextarea}>
                  Write your response here (about {Number(data.wordLimit?.min) || 80} words)...
                </div>
                <div style={styles.previewWordCount}>
                  Words: <strong style={styles.previewWordCountValue}>0</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
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
  prepareInstructionsLabel: {
    fontWeight: 700,
  },
  prepareInstructionsInput: {
    fontWeight: 700,
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
  preview: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
  },
  previewTitle: {
    margin: '0 0 12px',
    fontSize: '14px',
    color: '#0369a1',
  },
  previewFrame: {
    overflow: 'hidden',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
  },
  previewHeader: {
    padding: '8px 12px',
    backgroundColor: '#0e276f',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
  },
  previewColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
  },
  previewPrompt: {
    flex: '1 1 320px',
    minWidth: 0,
    padding: '20px',
  },
  previewTaskHeading: {
    margin: '0 0 12px',
    color: '#1f2937',
    fontSize: '16px',
    fontWeight: 700,
  },
  previewLetterTitle: {
    margin: '0 0 8px',
    color: '#1f2937',
    fontSize: '15px',
    fontWeight: 600,
  },
  previewText: {
    margin: '0 0 12px',
    color: '#374151',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  previewTextBold: {
    margin: '0 0 12px',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 700,
    lineHeight: 1.6,
  },
  previewStory: {
    margin: 0,
    color: '#374151',
    fontSize: '14px',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  previewRubric: {
    marginTop: '18px',
    padding: '14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    color: '#1f2937',
    fontSize: '13px',
  },
  previewRubricTable: {
    width: '100%',
    marginTop: '8px',
    borderCollapse: 'collapse',
  },
  previewRubricCriterion: {
    padding: '4px 6px',
    borderBottom: '1px solid #e2e8f0',
  },
  previewRubricPoints: {
    padding: '4px 6px',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'right',
  },
  previewRubricNote: {
    margin: '8px 0 0',
    color: '#475569',
    fontSize: '12px',
  },
  previewAnswer: {
    flex: '1 1 280px',
    minWidth: 0,
    padding: '20px',
    borderLeft: '1px solid #e2e8f0',
    backgroundColor: '#f8fbff',
  },
  previewAnswerTitle: {
    margin: '0 0 8px',
    color: '#0c4a6e',
    fontSize: '16px',
    fontWeight: 600,
  },
  previewWordLimit: {
    margin: 0,
    color: '#6b7280',
    fontSize: '13px',
  },
  previewTextarea: {
    minHeight: '220px',
    marginTop: '12px',
    padding: '16px',
    border: '2px solid #0284c7',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#94a3b8',
    fontSize: '15px',
    fontStyle: 'italic',
    lineHeight: 1.6,
  },
  previewWordCount: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '12px',
    color: '#64748b',
    fontSize: '13px',
  },
  previewWordCountValue: {
    color: '#dc2626',
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
