import React from 'react';
import AudioPlayer from '../../features/listening/components/AudioPlayer';
import { isAnswerCorrect } from '../utils/answerUtils';

const PreviewSection = ({ 
  part, 
  questions, 
  startFromNumber = 1, 
  type,
  audioFiles,  // array of files for multiple audio parts
  audioStartTimes, // object mapping question numbers to start times
  // additional props for teacher preview
  showAnswers = false, // show correct answers
  studentAnswers = null, // object mapping q_1 => 'answer'
  showCorrectness = false, // compute and show correctness
}) => {
  const styles = {
    section: {
      marginBottom: '30px'
    },
    title: {
      fontSize: '1.2em',
      fontWeight: 'bold',
      marginBottom: '15px',
      color: '#0e276f'
    },
    questionBox: {
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    formTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '10px'
    },
    formCell: {
      border: '1px solid #ddd',
      padding: '8px'
    },
    option: {
      marginLeft: '20px',
      marginBottom: '5px'
    },
    blank: {
      display: 'inline-block',
      width: '100px',
      borderBottom: '2px solid #666',
      marginLeft: '5px',
      marginRight: '5px'
    },
    questionNumber: {
      fontWeight: 'bold',
      color: '#0e276f',
      marginRight: '10px'
    }
  };

  const renderFormQuestion = (question, index) => (
    <div style={styles.questionBox} key={index}>
      <div dangerouslySetInnerHTML={{ 
        __html: question.formTemplate?.replace(/___/g, `(${startFromNumber + index})`) 
      }} />
    </div>
  );

  const renderMultipleChoice = (question, index) => (
    <div style={styles.questionBox} key={index}>
      <div>
        <span style={styles.questionNumber}>{startFromNumber + index}</span>
        <span dangerouslySetInnerHTML={{ __html: question.questionText }} />
      </div>
      {question.options.map((option, i) => (
        <div key={i} style={styles.option}>
          {type === 'abcd' ? String.fromCharCode(65 + i) : String(i + 1)}) {' '}
          <span dangerouslySetInnerHTML={{ __html: option }} />
        </div>
      ))}
    </div>
  );

  const renderMultiSelect = (question, index) => (
    <div style={styles.questionBox} key={index}>
      <div style={{ marginBottom: '10px' }}>
        <span style={styles.questionNumber}>
          Questions {startFromNumber + index} and {startFromNumber + index + 1}
        </span>
      </div>
      <div dangerouslySetInnerHTML={{ __html: question.questionText }} />
      <div style={{ color: '#666', marginTop: '5px', marginBottom: '10px' }}>
        Choose TWO letters, A-E.
      </div>
      {question.options.map((option, i) => (
        <div key={i} style={styles.option}>
          {String.fromCharCode(65 + i)} {' '}
          <span dangerouslySetInnerHTML={{ __html: option }} />
        </div>
      ))}
    </div>
  );

  // key helper: question key following app convention (q_1, q_2...)
  const questionKey = (index) => `q_${startFromNumber + index}`;

  return (
    <div style={styles.section}>
      <div style={styles.title}>
        Part {part}
        {part === 1 && ' - Form Completion'}
        {part === 2 && ' - Multiple Choice'}
        {part === 3 && ' - Multiple Selection'}
        {part === 4 && ' - Multiple Choice'}
      </div>

      {/* Audio Player */}
      <div style={{ marginBottom: '20px' }}>
        <AudioPlayer
          audioFiles={audioFiles} // string hoặc array tùy vào part
          startTimes={audioStartTimes} // Map số câu hỏi với thời điểm bắt đầu
        />
      </div>
      
      {type === 'form' && questions.map((q, i) => renderFormQuestion(q, i))}
      {(type === 'abc' || type === 'abcd') && questions.map((q, i) => renderMultipleChoice(q, i))}
      {type === 'select' && questions.map((q, i) => renderMultiSelect(q, i))}

      {/* Show answers / student answers comparison when provided */}
      { (showAnswers || (showCorrectness && studentAnswers)) && (
        <div style={{ marginTop: 18 }}>
          {questions.map((q, i) => {
            const key = questionKey(i);
            const correctRaw = q.correctAnswer || q.answer || q.correct || "";
            const studentRaw = (studentAnswers && (studentAnswers[key] || studentAnswers[String(startFromNumber + i)])) || "";
            // split correct answers into array for display
            const correctParts = (correctRaw || "").toString().split(/\s*\|\s*|\s*,\s*|\s*\/\s*/).filter(Boolean);
            return (
              <div key={`ans-${i}`} style={{ marginBottom: 12 }}>
                <div style={{ background: '#f8f9fa', padding: 10, borderRadius: 6, border: '1px solid #e9ecef' }}>
                  <div style={{ fontWeight: 700, color: '#0e276f' }}>Q{startFromNumber + i}</div>
                  { showAnswers && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ background: '#e6f4ea', padding: 8, borderRadius: 4, color: '#1e6b2a' }}>
                        <strong>Đáp án:</strong> {correctParts.join(' | ') || '—'}
                      </div>
                    </div>
                  )}

                  { studentRaw !== "" && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ background: '#fff3cd', padding: 8, borderRadius: 4, color: '#856404' }}>
                        <strong>Học sinh:</strong> {studentRaw}
                      </div>
                    </div>
                  )}

                  { showCorrectness && studentRaw !== "" && (
                    <div style={{ marginTop: 8 }}>
                      {/* compute correctness using isAnswerCorrect helper */}
                      <small style={{ color: isAnswerCorrect(correctRaw, studentRaw) ? '#155724' : '#721c24', fontWeight: 700 }}>
                        Trạng thái: { isAnswerCorrect(correctRaw, studentRaw) ? '✓ Đúng' : '✕ Sai' }
                      </small>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PreviewSection;
