// src/pages/CreateListeningTest.jsx
import React, { useState, useRef } from 'react';
import AdminNavbar from '../components/AdminNavbar';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import FormQuestion from '../components/FormQuestion';
import MultipleChoiceQuestion from '../components/MultipleChoiceQuestion';
import MultiSelectQuestion from '../components/MultiSelectQuestion';
import PreviewSection from '../components/PreviewSection';
import ComboboxQuestion from '../components/ComboboxQuestion';
import DragDropQuestion from '../components/DragDropQuestion';

const CreateListeningTest = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [partTypes, setPartTypes] = useState({
    part1: 'fill',
    part2: 'radio',
    part3: 'mixed',
    part4: 'radio'
  });

  const createDefaultQuestion = (type) => {
    switch(type) {
      case 'fill':
        return {
          questionType: 'fill',
          questionText: '',
          correctAnswer: ''
        };
      case 'radio':
        return {
          questionType: 'radio',
          questionText: '',
          options: ['', '', ''],
          correctAnswer: ''
        };
      case 'checkbox':
        return {
          questionType: 'checkbox',
          questionText: '',
          options: ['', '', '', '', ''],
          correctAnswer: ''
        };
      case 'combobox':
        return {
          questionType: 'combobox',
          questionText: '',
          options: [''],
          correctAnswer: ''
        };
      case 'dragdrop-text':
        return {
          questionType: 'dragdrop-text',
          questionText: '',
          dragItems: [''],
          correctAnswer: ''
        };
      case 'dragdrop-image':
        return {
          questionType: 'dragdrop-image',
          questionText: '',
          dragItems: [''],
          correctAnswer: ''
        };
      default:
        return {
          questionType: type,
          questionText: '',
          options: ['', '', ''],
          correctAnswer: ''
        };
    }
  };

  const [questions, setQuestions] = useState({
    part1: Array(10).fill().map(() => createDefaultQuestion('fill')),
    part2: Array(10).fill().map(() => createDefaultQuestion('radio')),
    part3: Array(10).fill().map(() => createDefaultQuestion('mixed')),
    part4: Array(10).fill().map(() => createDefaultQuestion('radio'))
  });
  const [classCode, setClassCode] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [activeSection, setActiveSection] = useState('instructions'); // 'instructions' or 'questions'
  const [instructions, setInstructions] = useState('');
  const [partAudioFiles, setPartAudioFiles] = useState({
    part1: null,
    part2: null,
    part3: null,
    part4: null
  });

  const instructionsToolbarRef = useRef(null);
  
  const API = process.env.REACT_APP_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!audioFile && !Object.values(partAudioFiles).some(file => file)) {
      setMessage('❌ Vui lòng tải lên ít nhất một file audio cho bài thi.');
      return;
    }

    if (!instructions.trim()) {
      setMessage('❌ Vui lòng nhập hướng dẫn làm bài.');
      return;
    }

    // Kiểm tra từng phần
    const validateQuestions = (part, questions) => {
      return questions.every(q => 
        q.questionText.trim() && 
        q.correctAnswer.trim() &&
        (q.options ? q.options.every(opt => opt.trim()) : true)
      );
    };

    if (!validateQuestions('part1', questions.part1) ||
        !validateQuestions('part2', questions.part2) ||
        !validateQuestions('part3', questions.part3) ||
        !validateQuestions('part4', questions.part4)) {
      setMessage('❌ Vui lòng điền đầy đủ nội dung và đáp án cho tất cả câu hỏi.');
      return;
    }

    const formData = new FormData();
    if (audioFile) {
      formData.append('audioFile', audioFile);
    }
    // Thêm các file audio riêng cho từng phần nếu có
    Object.entries(partAudioFiles).forEach(([part, file]) => {
      if (file) {
        formData.append(`audioFile_${part}`, file);
      }
    });
    
    formData.append('instructions', instructions);
    formData.append('questions', JSON.stringify(questions));
    formData.append('classCode', classCode);
    formData.append('teacherName', teacherName);

    try {
      const res = await fetch(`${API}/api/listening-tests`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      setMessage(data.message || '✅ Đã tạo đề thành công!');

      if (res.ok) {
        setAudioFile(null);
        setInstructions('');
        // Reset về trạng thái ban đầu
        setQuestions({
          part1: Array(10).fill().map(() => ({
            questionType: 'fill',
            questionText: '',
            correctAnswer: ''
          })),
          part2: Array(10).fill().map(() => ({
            questionType: 'radio',
            questionText: '',
            options: ['', '', ''],
            correctAnswer: ''
          })),
          part3: Array(10).fill().map(() => ({
            questionType: 'mixed',
            questionText: '',
            options: ['', '', '', '', ''],
            correctAnswer: ''
          })),
          part4: Array(10).fill().map(() => ({
            questionType: 'radio',
            questionText: '',
            options: ['', '', '', ''],
            correctAnswer: ''
          }))
        });
        setClassCode('');
        setTeacherName('');
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err) {
      console.error('Error:', err);
      setMessage('❌ Lỗi khi tạo đề thi');
    }
  };

  const handleQuestionChange = (part, index, updatedQuestion) => {
    setQuestions(prev => ({
      ...prev,
      [part]: prev[part].map((q, i) => i === index ? updatedQuestion : q)
    }));
  };

  const handlePartTypeChange = (part, newType) => {
    setPartTypes(prev => ({
      ...prev,
      [part]: newType
    }));
    
    // Reset questions for this part with new type
    setQuestions(prev => ({
      ...prev,
      [part]: Array(10).fill().map(() => createDefaultQuestion(newType))
    }));
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    fontSize: '16px',
    borderRadius: '6px',
    border: '1px solid #ccc'
  };

  const tabStyle = (isActive) => ({
    padding: '10px 20px',
    backgroundColor: isActive ? '#0e276f' : '#e0e0e0',
    color: isActive ? 'white' : '#333',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    marginRight: '5px'
  });

  return (
    <>
      <AdminNavbar />
      <div style={{ maxWidth: '1000px', margin: '20px auto' }}>
        <h2>🎧 Thêm đề Listening</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Mã lớp (VD: 317S3)"
            value={classCode}
            onChange={e => setClassCode(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Tên giáo viên ra đề"
            value={teacherName}
            onChange={e => setTeacherName(e.target.value)}
            style={inputStyle}
          />

          <div style={{ marginBottom: '20px' }}>
            <div>
              <label><b>📂 File audio chung (nếu bài nghe dùng 1 file):</b></label><br />
              <input
                type="file"
                accept="audio/*"
                onChange={e => setAudioFile(e.target.files[0])}
                style={{ margin: '10px 0' }}
              />
              {audioFile && (
                <audio controls style={{ width: '100%', marginTop: '10px' }}>
                  <source src={URL.createObjectURL(audioFile)} />
                  Your browser does not support the audio element.
                </audio>
              )}
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <label><b>📂 File audio riêng cho từng phần (nếu bài nghe có nhiều file):</b></label>
              
              {[1,2,3,4].map(part => (
                <div key={part} style={{ marginTop: '10px' }}>
                  <label>Part {part}:</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={e => setPartAudioFiles(prev => ({
                      ...prev,
                      [`part${part}`]: e.target.files[0]
                    }))}
                    style={{ margin: '5px 0' }}
                  />
                  {partAudioFiles[`part${part}`] && (
                    <audio controls style={{ width: '100%', marginTop: '5px' }}>
                      <source src={URL.createObjectURL(partAudioFiles[`part${part}`])} />
                      Your browser does not support the audio element.
                    </audio>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', marginBottom: '10px' }}>
              <button
                type="button"
                style={tabStyle(activeSection === 'instructions')}
                onClick={() => setActiveSection('instructions')}
              >
                📝 Hướng dẫn làm bài
              </button>
              <button
                type="button"
                style={tabStyle(activeSection === 'questions')}
                onClick={() => setActiveSection('questions')}
              >
                ❓ Danh sách câu hỏi
              </button>
            </div>

            {activeSection === 'instructions' ? (
              <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
                <div ref={instructionsToolbarRef}></div>
                <CKEditor
                  editor={DecoupledEditor}
                  data={instructions}
                  onReady={editor => {
                    try {
                      if (instructionsToolbarRef.current && !instructionsToolbarRef.current.children.length) {
                        instructionsToolbarRef.current.appendChild(editor.ui.view.toolbar.element);
                      }
                    } catch (err) {
                      console.error('Error mounting toolbar:', err);
                    }
                  }}
                  onChange={(event, editor) => setInstructions(editor.getData())}
                  config={{
                    toolbar: {
                      shouldNotGroupWhenFull: true
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '20px' }}>
                {/* Part 1 */}
                <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ color: '#0e276f', marginRight: '20px', marginBottom: '0' }}>Part 1:</h3>
                    <select
                      value={partTypes.part1}
                      onChange={(e) => handlePartTypeChange('part1', e.target.value)}
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc'
                      }}
                    >
                      <option value="fill">Điền vào chỗ trống</option>
                      <option value="radio">Chọn 1 đáp án (Radio)</option>
                      <option value="checkbox">Chọn nhiều đáp án (Checkbox)</option>
                      <option value="combobox">Chọn từ danh sách (Combobox)</option>
                      <option value="dragdrop-text">Kéo thả cụm từ</option>
                      <option value="dragdrop-image">Kéo thả hình ảnh</option>
                    </select>
                  </div>
                  {questions.part1.map((question, index) => (
                    <div key={index} style={{
                      marginBottom: '30px',
                      padding: '15px',
                      border: '1px solid #eee',
                      borderRadius: '8px',
                      backgroundColor: '#f9f9f9'
                    }}>
                      <h4 style={{ marginTop: 0 }}>Câu {index + 1}</h4>
                      {partTypes.part1 === 'fill' && (
                        <FormQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part1', index, updatedQuestion)}
                        />
                      )}
                      {partTypes.part1 === 'radio' && (
                        <MultipleChoiceQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part1', index, updatedQuestion)}
                          optionsCount={3}
                        />
                      )}
                      {partTypes.part1 === 'checkbox' && (
                        <MultiSelectQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part1', index, updatedQuestion)}
                        />
                      )}
                      {partTypes.part1 === 'combobox' && (
                        <ComboboxQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part1', index, updatedQuestion)}
                        />
                      )}
                      {partTypes.part1 === 'dragdrop-text' && (
                        <DragDropQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part1', index, updatedQuestion)}
                          type="text"
                        />
                      )}
                      {partTypes.part1 === 'dragdrop-image' && (
                        <DragDropQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part1', index, updatedQuestion)}
                          type="image"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Part 2 */}
                <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ color: '#0e276f', marginRight: '20px', marginBottom: '0' }}>Part 2:</h3>
                    <select
                      value={partTypes.part2}
                      onChange={(e) => handlePartTypeChange('part2', e.target.value)}
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc'
                      }}
                    >
                      <option value="fill">Form Completion</option>
                      <option value="radio">Multiple Choice (A,B,C)</option>
                      <option value="mixed">Multiple Selection</option>
                    </select>
                  </div>
                  {questions.part2.map((question, index) => (
                    <div key={index} style={{
                      marginBottom: '30px',
                      padding: '15px',
                      border: '1px solid #eee',
                      borderRadius: '8px',
                      backgroundColor: '#f9f9f9'
                    }}>
                      <h4 style={{ marginTop: 0 }}>Câu {index + 11}</h4>
                      {partTypes.part2 === 'fill' && (
                        <FormQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part2', index, updatedQuestion)}
                        />
                      )}
                      {partTypes.part2 === 'radio' && (
                        <MultipleChoiceQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part2', index, updatedQuestion)}
                          optionsCount={3}
                        />
                      )}
                      {partTypes.part2 === 'mixed' && (
                        <MultiSelectQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part2', index, updatedQuestion)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Part 3 */}
                <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ color: '#0e276f', marginRight: '20px', marginBottom: '0' }}>Part 3:</h3>
                    <select
                      value={partTypes.part3}
                      onChange={(e) => handlePartTypeChange('part3', e.target.value)}
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc'
                      }}
                    >
                      <option value="fill">Form Completion</option>
                      <option value="radio">Multiple Choice (A,B,C)</option>
                      <option value="mixed">Multiple Selection</option>
                    </select>
                  </div>
                  {questions.part3.map((question, index) => (
                    <div key={index} style={{
                      marginBottom: '30px',
                      padding: '15px',
                      border: '1px solid #eee',
                      borderRadius: '8px',
                      backgroundColor: '#f9f9f9'
                    }}>
                      <h4 style={{ marginTop: 0 }}>Câu {index + 21}</h4>
                      {partTypes.part3 === 'fill' && (
                        <FormQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part3', index, updatedQuestion)}
                        />
                      )}
                      {partTypes.part3 === 'radio' && (
                        <MultipleChoiceQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part3', index, updatedQuestion)}
                          optionsCount={3}
                        />
                      )}
                      {partTypes.part3 === 'mixed' && (
                        <MultiSelectQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part3', index, updatedQuestion)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Part 4 */}
                <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ color: '#0e276f', marginRight: '20px', marginBottom: '0' }}>Part 4:</h3>
                    <select
                      value={partTypes.part4}
                      onChange={(e) => handlePartTypeChange('part4', e.target.value)}
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc'
                      }}
                    >
                      <option value="fill">Form Completion</option>
                      <option value="radio">Multiple Choice (A,B,C)</option>
                      <option value="mixed">Multiple Selection</option>
                    </select>
                  </div>
                  {questions.part4.map((question, index) => (
                    <div key={index} style={{
                      marginBottom: '30px',
                      padding: '15px',
                      border: '1px solid #eee',
                      borderRadius: '8px',
                      backgroundColor: '#f9f9f9'
                    }}>
                      <h4 style={{ marginTop: 0 }}>Câu {index + 31}</h4>
                      {partTypes.part4 === 'fill' && (
                        <FormQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part4', index, updatedQuestion)}
                        />
                      )}
                      {partTypes.part4 === 'radio' && (
                        <MultipleChoiceQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part4', index, updatedQuestion)}
                          optionsCount={4}
                        />
                      )}
                      {partTypes.part4 === 'mixed' && (
                        <MultiSelectQuestion
                          question={question}
                          onChange={(updatedQuestion) => handleQuestionChange('part4', index, updatedQuestion)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#e03',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ➕ Tạo đề
            </button>

            <button
              type="button"
              onClick={() => setShowPreview(true)}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#0e276f',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              👁 Preview
            </button>
          </div>
        </form>

        {message && (
          <p style={{
            marginTop: 10,
            fontWeight: 'bold',
            color: message.includes('❌') ? 'red' : 'green'
          }}>
            {message}
          </p>
        )}

        {/* Modal Preview */}
        {showPreview && (
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0,
              width: '100%', height: '100%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}
            onClick={() => setShowPreview(false)}
          >
            <div
              style={{
                background: 'white',
                padding: '30px',
                borderRadius: '12px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <h3>📄 Xem trước đề thi</h3>

              {audioFile && (
                <div style={{ marginBottom: '15px' }}>
                  <h4>🎧 Audio:</h4>
                  <audio controls style={{ width: '100%' }}>
                    <source src={URL.createObjectURL(audioFile)} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <h4>📝 Hướng dẫn:</h4>
                <div dangerouslySetInnerHTML={{ __html: instructions }} />
              </div>

              <div className="preview-sections">
                {/* Part 1: Form Questions */}
                <PreviewSection 
                  part={1}
                  questions={questions.part1}
                  startFromNumber={1}
                  type="form"
                  audioFiles={partAudioFiles.part1 || audioFile}
                />

                {/* Part 2: Multiple Choice A,B,C */}
                <PreviewSection 
                  part={2}
                  questions={questions.part2}
                  startFromNumber={11}
                  type="abc"
                  audioFiles={partAudioFiles.part2 || audioFile}
                />

                {/* Part 3: Multiple Selection */}
                <PreviewSection 
                  part={3}
                  questions={questions.part3}
                  startFromNumber={21}
                  type="select"
                  audioFiles={partAudioFiles.part3 || audioFile}
                />

                {/* Part 4: Multiple Choice A,B,C,D */}
                <PreviewSection 
                  part={4}
                  questions={questions.part4}
                  startFromNumber={31}
                  type="abcd"
                  audioFiles={partAudioFiles.part4 || audioFile}
                />
              </div>

              <div style={{ textAlign: 'right', marginTop: '20px' }}>
                <button
                  onClick={() => setShowPreview(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#e03',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CreateListeningTest;
