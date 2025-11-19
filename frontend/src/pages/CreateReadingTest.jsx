import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import QuillEditor from '../components/QuillEditor';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

const CreateReadingTest = () => {
  const [title, setTitle] = useState('');
  const [passages, setPassages] = useState([
    { passageTitle: '', passageText: '', questions: [{ questionNumber: 1, questionType: 'multiple-choice', questionText: '', options: [''], correctAnswer: '' }] }
  ]);
  const [isReviewing, setIsReviewing] = useState(false); // State for review modal
  const navigate = useNavigate();

  const handleAddPassage = () => {
    setPassages([...passages, { passageTitle: '', passageText: '', questions: [{ questionNumber: 1, questionType: 'multiple-choice', questionText: '', options: [''], correctAnswer: '' }] }]);
  };

  const handlePassageChange = (index, field, value) => {
    const newPassages = [...passages];
    newPassages[index][field] = value;
    setPassages(newPassages);
  };

  const handleAddQuestion = (passageIndex) => {
    const newPassages = [...passages];
    const newQuestionNumber = newPassages[passageIndex].questions.length + 1;
    newPassages[passageIndex].questions.push({ questionNumber: newQuestionNumber, questionType: 'multiple-choice', questionText: '', options: [''], correctAnswer: '' });
    setPassages(newPassages);
  };

  const handleQuestionChange = (passageIndex, questionIndex, field, value) => {
    const newPassages = [...passages];
    newPassages[passageIndex].questions[questionIndex][field] = value;
    setPassages(newPassages);
  };

  const handleOptionChange = (passageIndex, questionIndex, optionIndex, value) => {
    const newPassages = [...passages];
    newPassages[passageIndex].questions[questionIndex].options[optionIndex] = value;
    setPassages(newPassages);
  };

  const handleAddOption = (passageIndex, questionIndex) => {
    const newPassages = [...passages];
    newPassages[passageIndex].questions[questionIndex].options.push('');
    setPassages(newPassages);
  };

  const handleReview = (e) => {
    e.preventDefault();
    setIsReviewing(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      await axios.post('/api/reading-tests', { title, passages });
      alert('Reading test created successfully!');
      setIsReviewing(false);
      navigate('/select-test'); // Redirect to the test list
    } catch (error) {
      console.error('Error creating reading test:', error);
      alert('Failed to create reading test.');
    }
  };

  const modalStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  const modalContentStyles = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    width: '80%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  };

  // Theme colors from the app
  const primaryBlue = '#0e276f';
  const dangerRed = '#e03';
  const modalHeaderStyles = {
    backgroundColor: primaryBlue,
    color: '#fff',
    padding: '12px 16px',
    borderRadius: '6px 6px 0 0',
    margin: '-20px -20px 12px',
  };
  const confirmButtonStyle = {
    backgroundColor: primaryBlue,
    border: 'none',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    boxShadow: '0 2px 6px rgba(14,39,111,0.25)',
    transition: 'filter 120ms ease',
  };
  const backButtonStyle = {
    backgroundColor: dangerRed,
    border: 'none',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    boxShadow: '0 2px 6px rgba(224,3,51,0.25)',
    transition: 'filter 120ms ease',
  };

  return (
    <div>
      <AdminNavbar />
      <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
        <h2>Create IELTS Reading Test</h2>
        <form onSubmit={handleReview}>
          <div className="mb-3">
            <label htmlFor="title" className="form-label">Test Title</label>
            <input
              type="text"
              className="form-control"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {passages.map((passage, passageIndex) => (
            <div key={passageIndex} className="card mb-4">
              <div className="card-header">
                <h3>Passage {passageIndex + 1}</h3>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Passage Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={passage.passageTitle}
                    onChange={(e) => handlePassageChange(passageIndex, 'passageTitle', e.target.value)}
                  />
                </div>
                <div className="mb-3">
                    <label className="form-label">Passage Text</label>
                    <QuillEditor
                        value={passage.passageText}
                        onChange={(value) => handlePassageChange(passageIndex, 'passageText', value)}
                    />
                </div>

                <h4 className="mt-4">Questions for Passage {passageIndex + 1}</h4>
                {passage.questions.map((question, questionIndex) => (
                  <div key={questionIndex} className="border p-3 mb-3">
                    <h5>Question {question.questionNumber}</h5>
                    <div className="mb-3">
                        <label className="form-label">Question Text</label>
                        <input
                            type="text"
                            className="form-control"
                            value={question.questionText}
                            onChange={(e) => handleQuestionChange(passageIndex, questionIndex, 'questionText', e.target.value)}
                        />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Question Type</label>
                      <select
                        className="form-select"
                        value={question.questionType}
                        onChange={(e) => handleQuestionChange(passageIndex, questionIndex, 'questionType', e.target.value)}
                      >
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="fill-in-the-blanks">Fill in the Blanks</option>
                        <option value="matching">Matching</option>
                      </select>
                    </div>
                    
                    {question.questionType === 'multiple-choice' && (
                      <div>
                        <label className="form-label">Options</label>
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="input-group mb-2">
                            <input
                              type="text"
                              className="form-control"
                              value={option}
                              onChange={(e) => handleOptionChange(passageIndex, questionIndex, optionIndex, e.target.value)}
                            />
                          </div>
                        ))}
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleAddOption(passageIndex, questionIndex)}>Add Option</button>
                      </div>
                    )}

                    <div className="mt-3">
                        <label className="form-label">Correct Answer</label>
                        <input
                            type="text"
                            className="form-control"
                            value={question.correctAnswer}
                            onChange={(e) => handleQuestionChange(passageIndex, questionIndex, 'correctAnswer', e.target.value)}
                        />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-primary" onClick={() => handleAddQuestion(passageIndex)}>Add Question</button>
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-info mb-3" onClick={handleAddPassage}>Add Passage</button>
          <br />
          <button type="submit" className="btn btn-success">Review Test</button>
        </form>
      </div>

      {isReviewing && (
        <div style={modalStyles}>
          <div style={modalContentStyles}>
            <div style={modalHeaderStyles}>
              <h2 style={{ margin: 0 }}>Review Your Test</h2>
            </div>
            <div style={{ padding: '8px 0 16px' }}>
              <h3 style={{ marginTop: 8 }}>{title}</h3>
            </div>
            {passages.map((p, pIndex) => (
              <div key={pIndex} className="mb-4">
                <h4>{p.passageTitle || `Passage ${pIndex + 1}`}</h4>
                <div className="p-2 border rounded" dangerouslySetInnerHTML={{ __html: p.passageText }} />
                <h5 className="mt-3">Questions:</h5>
                {p.questions.map((q, qIndex) => (
                  <div key={qIndex} className="pl-3 mb-2">
                    <p><strong>{q.questionNumber}. {q.questionText}</strong> ({q.questionType})</p>
                    {q.questionType === 'multiple-choice' && (
                      <ul>
                        {q.options.map((opt, optIndex) => <li key={optIndex}>{opt}</li>)}
                      </ul>
                    )}
                    <p style={{ color: '#0b8e3a' }}><strong>Answer:</strong> {q.correctAnswer}</p>
                  </div>
                ))}
              </div>
            ))}
            <hr />
            <div className="d-flex justify-content-end">
              <button style={backButtonStyle} className="me-2" onClick={() => setIsReviewing(false)}>Back to Editing</button>
              <button style={confirmButtonStyle} onClick={handleConfirmSubmit}>Confirm & Create Test</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateReadingTest;
