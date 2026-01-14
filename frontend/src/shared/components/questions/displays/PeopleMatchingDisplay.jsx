import React from 'react';

/**
 * PeopleMatchingDisplay - Display component for people-matching questions (KET Part 2)
 * Shows 5 people descriptions (A-E) and 8 texts to match
 */
const PeopleMatchingDisplay = ({ 
  section, 
  startingNumber, 
  onAnswerChange, 
  answers, 
  submitted 
}) => {
  const { people = [], texts = [] } = section;

  return (
    <div style={styles.container}>
      {/* People Reference (A-E) */}
      <div style={styles.peopleSection}>
        <h4 style={styles.sectionTitle}>People</h4>
        <div style={styles.peopleList}>
          {people.map((person, idx) => (
            <div key={idx} style={styles.personCard}>
              <div style={styles.personLetter}>
                {String.fromCharCode(65 + idx)}
              </div>
              <div style={styles.personName}>{person}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Matching Questions */}
      <div style={styles.questionsSection}>
        <h4 style={styles.sectionTitle}>Match each text to a person</h4>
        <div style={styles.questionsList}>
          {texts.map((text, idx) => {
            const questionNumber = startingNumber + idx;
            const questionKey = `${section.id}-${idx}`;
            const userAnswer = answers[questionKey];
            
            return (
              <div key={idx} style={styles.matchingRow}>
                <div style={styles.questionNumber}>{questionNumber}</div>
                <div style={styles.textContent}>{text}</div>
                <select
                  value={userAnswer || ''}
                  onChange={(e) => onAnswerChange(questionKey, e.target.value)}
                  disabled={submitted}
                  style={styles.dropdown}
                >
                  <option value="">—</option>
                  {people.map((_, pIdx) => (
                    <option key={pIdx} value={String.fromCharCode(65 + pIdx)}>
                      {String.fromCharCode(65 + pIdx)}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  peopleSection: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '12px',
    padding: '16px',
  },
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#0e276f',
  },
  peopleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  personCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
  },
  personLetter: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#0e276f',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 700,
    fontSize: '14px',
    flexShrink: 0,
  },
  personName: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  questionsSection: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
  },
  questionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  matchingRow: {
    display: 'grid',
    gridTemplateColumns: '40px 1fr 80px',
    gap: '16px',
    alignItems: 'center',
    padding: '14px',
    backgroundColor: '#fafafa',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  questionNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#0e276f',
    color: '#fff',
    borderRadius: '50%',
    fontWeight: 600,
    fontSize: '14px',
  },
  textContent: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#1f2937',
  },
  dropdown: {
    padding: '8px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
    textAlign: 'center',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
};

export default PeopleMatchingDisplay;
