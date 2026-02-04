import React, { useState } from 'react';

/**
 * PeopleMatchingDisplay - Display component for people-matching questions (KET Part 2)
 * Shows 5 people descriptions (A-E) and 8 texts to match
 */
const PeopleMatchingDisplay = ({ 
  section, 
  startingNumber, 
  onAnswerChange, 
  answers, 
  submitted,
  answerKeyPrefix,
  showPeople = true,
  showTexts = true
}) => {
  const questionData = section?.questions?.[0] || section || {};
  const people = Array.isArray(questionData.people) ? questionData.people : [];
  const texts = Array.isArray(questionData.texts) ? questionData.texts : [];
  const textsTitle = questionData.textsTitle || section?.textsTitle || '';
  const [activeDropIndex, setActiveDropIndex] = useState(null);
  const resolvedKeyPrefix = answerKeyPrefix || section?.id || 'people-matching';

  const getPersonNumber = (idx) => startingNumber + idx;
  const getAnswerKey = (idx) => `${resolvedKeyPrefix}-${idx}`;

  const getPersonName = (person) => {
    if (person && typeof person === 'object') {
      return person.name || '';
    }
    return String(person || '');
  };

  const getPersonNeed = (person) => {
    if (person && typeof person === 'object') {
      return person.need || '';
    }
    return '';
  };

  const getPersonImage = (person) => {
    if (person && typeof person === 'object') {
      return person.imageUrl || '';
    }
    return '';
  };

  const renderTextContent = (text) => {
    if (text && typeof text === 'object') {
      const title = String(text.title || '').trim();
      const content = String(text.content || '').trim();
      return (
        <div style={styles.textBlock}>
          {title && <div style={styles.textTitle}>{title}</div>}
          {content && <div>{content}</div>}
        </div>
      );
    }
    return text;
  };

  const getTextId = (text, idx) => {
    if (text && typeof text === 'object' && text.id) {
      return String(text.id).trim();
    }
    return String.fromCharCode(65 + idx);
  };

  return (
    <div style={showPeople && showTexts ? styles.container : styles.singleColumn}>
      {/* People (Questions) */}
      {showPeople && (
        <div style={styles.peopleSection}>
          <h4 style={styles.sectionTitle}>People</h4>
          <div style={styles.peopleList}>
            {people.map((person, idx) => (
              <div key={idx} style={styles.personCard}>
                <div style={styles.personLetter}>
                  {getPersonNumber(idx)}
                </div>
                {getPersonImage(person) && (
                  <img
                    src={getPersonImage(person)}
                    alt={getPersonName(person) || `Person ${getPersonNumber(idx)}`}
                    style={styles.personImage}
                  />
                )}
                <div style={styles.personDetails}>
                  <div style={styles.personName}>{getPersonName(person)}</div>
                  {getPersonNeed(person) && (
                    <div style={styles.personNeed}>{getPersonNeed(person)}</div>
                  )}
                  <div style={styles.answerRow}>
                    <span style={styles.answerLabel}>Answer:</span>
                    <div
                      id={`question-${getPersonNumber(idx)}`}
                      tabIndex={0}
                      aria-label={`Question ${getPersonNumber(idx)} answer`}
                      style={{
                        ...styles.dropZone,
                        ...(activeDropIndex === idx ? styles.dropZoneActive : null),
                      }}
                      onDragEnter={() => {
                        if (submitted) return;
                        setActiveDropIndex(idx);
                      }}
                      onDragLeave={() => {
                        if (submitted) return;
                        setActiveDropIndex(null);
                      }}
                      onDragOver={(e) => {
                        if (submitted) return;
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        if (submitted) return;
                        e.preventDefault();
                        const picked = e.dataTransfer.getData('text/plain');
                        if (picked) {
                          onAnswerChange(getAnswerKey(idx), picked);
                        }
                        setActiveDropIndex(null);
                      }}
                    >
                      <span style={styles.dropZoneValue}>
                        {answers[getAnswerKey(idx)] || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text options */}
      {showTexts && (
        <div style={styles.questionsSection}>
          <h4 style={styles.sectionTitle}>{textsTitle || 'Texts'}</h4>
          <div style={styles.questionsList}>
            {texts.map((text, idx) => (
              <div key={idx} style={styles.matchingRow}>
                <div style={styles.questionNumber}>{getTextId(text, idx)}</div>
                <div
                  style={styles.textContent}
                  draggable={!submitted}
                  onDragStart={(e) => {
                    if (submitted) return;
                    const id = getTextId(text, idx);
                    e.dataTransfer.setData('text/plain', id);
                  }}
                >
                  {renderTextContent(text)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
  singleColumn: {
    display: 'block',
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
  personImage: {
    width: '10%',
    minWidth: '56px',
    height: '110px',
    borderRadius: '8px',
    objectFit: 'cover',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f8fafc',
    flexShrink: 0,
  },
  personDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
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
    fontSize: '15px',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  personNeed: {
    fontSize: '15px',
    lineHeight: 1.4,
    color: '#4b5563',
  },
  answerRow: {
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  answerLabel: {
    fontSize: '15px',
    color: '#6b7280',
    fontWeight: 600,
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
    gridTemplateColumns: '40px 1fr',
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
    fontSize: '15px',
  },
  textContent: {
    fontSize: '15px',
    lineHeight: 1.6,
    color: '#1f2937',
  },
  textBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  textTitle: {
    fontWeight: 700,
    color: '#0f172a',
    fontSize: '15px',
  },
  dropZone: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    border: '2px dashed #93c5fd',
    borderRadius: '8px',
    minWidth: '90px',
    backgroundColor: '#eff6ff',
  },
  dropZoneActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  dropZoneNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '999px',
    backgroundColor: '#1d4ed8',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneValue: {
    fontWeight: 700,
    color: '#1f2937',
    fontSize: '13px',
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
