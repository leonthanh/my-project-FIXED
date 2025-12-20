import React, { useState } from 'react';
import { Container, Form, Button, Row, Col } from 'react-bootstrap';
import QuillEditor from './QuillEditor';

const CreateListeningTest = () => {
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    questions: [{
      question: '',
      options: ['', '', ''],
      correctAnswer: '',
      audio: null
    }]
  });

  const handleQuestionChange = (index, content) => {
    const newQuestions = [...testData.questions];
    newQuestions[index] = {
      ...newQuestions[index],
      question: content
    };
    setTestData({
      ...testData,
      questions: newQuestions
    });
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const newQuestions = [...testData.questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setTestData({
      ...testData,
      questions: newQuestions
    });
  };

  const handleCorrectAnswerChange = (questionIndex, value) => {
    const newQuestions = [...testData.questions];
    newQuestions[questionIndex].correctAnswer = value;
    setTestData({
      ...testData,
      questions: newQuestions  
    });
  };

  const handleAudioChange = (questionIndex, file) => {
    const newQuestions = [...testData.questions];
    newQuestions[questionIndex].audio = file;
    setTestData({
      ...testData,
      questions: newQuestions
    });
  };

  const addQuestion = () => {
    setTestData({
      ...testData,
      questions: [
        ...testData.questions,
        {
          question: '',
          options: ['', '', ''],
          correctAnswer: '',
          audio: null
        }
      ]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Create FormData object to handle file uploads
    const formData = new FormData();
    formData.append('title', testData.title);
    formData.append('description', testData.description);
    
    // Append each question and its associated data
    testData.questions.forEach((question, index) => {
      formData.append(`questions[${index}][question]`, question.question);
      question.options.forEach((option, optIndex) => {
        formData.append(`questions[${index}][options][${optIndex}]`, option);
      });
      formData.append(`questions[${index}][correctAnswer]`, question.correctAnswer);
      if (question.audio) {
        formData.append(`questions[${index}][audio]`, question.audio);
      }
    });

    try {
      const response = await fetch('/api/listening-tests', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Test created successfully!');
        // Reset form or redirect
      } else {
        throw new Error('Failed to create test');
      }
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Error creating test');
    }
  };

  return (
    <Container>
      <h2>Create Listening Test</h2>
      <Form onSubmit={handleSubmit}>
        <Form.Group>
          <Form.Label>Test Title</Form.Label>
          <Form.Control
            type="text"
            value={testData.title}
            onChange={(e) => setTestData({...testData, title: e.target.value})}
            required
          />
        </Form.Group>

        <Form.Group>
          <Form.Label>Test Description</Form.Label>
          <QuillEditor
            value={testData.description}
            onChange={(content) => setTestData({...testData, description: content})}
            placeholder="Enter test description..."
          />
        </Form.Group>

        {testData.questions.map((question, qIndex) => (
          <div key={qIndex} className="question-container mb-4 p-3 border rounded">
            <h4>Question {qIndex + 1}</h4>
            
            <Form.Group>
              <Form.Label>Question Text</Form.Label>
              <QuillEditor
                value={question.question}
                onChange={(content) => handleQuestionChange(qIndex, content)}
                placeholder="Enter question text..."
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Audio File</Form.Label>
              <Form.Control
                type="file"
                accept="audio/*"
                onChange={(e) => handleAudioChange(qIndex, e.target.files[0])}
              />
            </Form.Group>

            <Row>
              {question.options.map((option, oIndex) => (
                <Col md={4} key={oIndex}>
                  <Form.Group>
                    <Form.Label>Option {oIndex + 1}</Form.Label>
                    <Form.Control
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
              ))}
            </Row>

            <Form.Group>
              <Form.Label>Correct Answer</Form.Label>
              <Form.Control
                as="select"
                value={question.correctAnswer}
                onChange={(e) => handleCorrectAnswerChange(qIndex, e.target.value)}
                required
              >
                <option value="">Select correct answer</option>
                {question.options.map((_, index) => (
                  <option key={index} value={index}>
                    Option {index + 1}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
          </div>
        ))}

        <Button variant="secondary" onClick={addQuestion} className="mb-3">
          Add Question
        </Button>

        <div>
          <Button type="submit" variant="primary">
            Create Test
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default CreateListeningTest;
