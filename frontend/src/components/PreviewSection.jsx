import React from 'react';
import AudioPlayer from './AudioPlayer';

const PreviewSection = ({ 
  part, 
  questions, 
  startFromNumber = 1, 
  type,
  audioFiles,  // array of files for multiple audio parts
  audioStartTimes // object mapping question numbers to start times 
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
          onTimeUpdate={(time) => console.log(`Current time: ${time}`)}
        />
      </div>
      
      {type === 'form' && questions.map((q, i) => renderFormQuestion(q, i))}
      {(type === 'abc' || type === 'abcd') && questions.map((q, i) => renderMultipleChoice(q, i))}
      {type === 'select' && questions.map((q, i) => renderMultiSelect(q, i))}
    </div>
  );
};

export default PreviewSection;
