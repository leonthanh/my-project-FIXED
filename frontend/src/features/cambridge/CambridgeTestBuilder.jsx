import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNavbar } from "../../shared/components";
import { 
  QuestionTypeSelector, 
  QuestionEditorFactory,
} from "../../shared/components/questions";
import { 
  getQuestionTypesForTest,
  getDefaultQuestionData,
  getTestConfig,
  TEST_CONFIGS,
} from "../../shared/config/questionTypes";
import { apiPath } from "../../shared/utils/api";

/**
 * CambridgeTestBuilder - Component cho việc tạo đề Cambridge tests
 * Có thể dùng cho: KET, PET, FLYERS, MOVERS, STARTERS
 */
const CambridgeTestBuilder = ({ testType = 'ket-listening', editId = null, initialData = null }) => {
  const navigate = useNavigate();
  const testConfig = getTestConfig(testType);
  const availableTypes = getQuestionTypesForTest(testType);

  // Form fields
  const [title, setTitle] = useState('');
  const [classCode, setClassCode] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Support edit mode via props
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setClassCode(initialData.classCode || '');
      setTeacherName(initialData.teacherName || '');

      // parts may be stored as string in older records -> parse safely
      let partsData = initialData.parts;
      if (typeof partsData === 'string') {
        try {
          partsData = JSON.parse(partsData);
        } catch (err) {
          console.warn('Could not parse parts JSON - falling back to default:', err);
          partsData = null;
        }
      }

      if (Array.isArray(partsData)) {
        setParts(partsData);
      }
    }
  }, [initialData]);

  // State
  const [parts, setParts] = useState([
    {
      partNumber: 1,
      title: 'Part 1',
      instruction: '',
      audioUrl: '', // For listening tests
      sections: [
        {
          sectionTitle: '',
          questionType: availableTypes[0]?.id || 'fill',
          questions: [getDefaultQuestionData(availableTypes[0]?.id || 'fill')],
        }
      ]
    }
  ]);
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);

  const currentPart = parts[selectedPartIndex];
  const currentSection = currentPart?.sections?.[selectedSectionIndex];

  // Handlers
  const handleQuestionTypeChange = (newType) => {
    const newParts = [...parts];
    newParts[selectedPartIndex].sections[selectedSectionIndex].questionType = newType;
    // Reset questions with default data for new type
    newParts[selectedPartIndex].sections[selectedSectionIndex].questions = [
      getDefaultQuestionData(newType)
    ];
    setParts(newParts);
  };

  const handleQuestionChange = (field, value) => {
    const newParts = [...parts];
    newParts[selectedPartIndex].sections[selectedSectionIndex].questions[0] = {
      ...newParts[selectedPartIndex].sections[selectedSectionIndex].questions[0],
      [field]: value,
    };
    setParts(newParts);
  };

  const handleAddPart = () => {
    setParts([
      ...parts,
      {
        partNumber: parts.length + 1,
        title: `Part ${parts.length + 1}`,
        instruction: '',
        audioUrl: '',
        sections: [
          {
            sectionTitle: '',
            questionType: availableTypes[0]?.id || 'fill',
            questions: [getDefaultQuestionData(availableTypes[0]?.id || 'fill')],
          }
        ]
      }
    ]);
    setSelectedPartIndex(parts.length);
    setSelectedSectionIndex(0);
  };

  const handleAddSection = () => {
    const newParts = [...parts];
    newParts[selectedPartIndex].sections.push({
      sectionTitle: '',
      questionType: availableTypes[0]?.id || 'fill',
      questions: [getDefaultQuestionData(availableTypes[0]?.id || 'fill')],
    });
    setParts(newParts);
    setSelectedSectionIndex(newParts[selectedPartIndex].sections.length - 1);
  };

  const handleAddQuestion = () => {
    const newParts = [...parts];
    const currentType = currentSection.questionType;
    newParts[selectedPartIndex].sections[selectedSectionIndex].questions.push(
      getDefaultQuestionData(currentType)
    );
    setParts(newParts);
  };

  const handleDeleteQuestion = (qIndex) => {
    const newParts = [...parts];
    newParts[selectedPartIndex].sections[selectedSectionIndex].questions.splice(qIndex, 1);
    setParts(newParts);
  };

  // Calculate starting question number
  const calculateStartingNumber = (partIdx, sectionIdx, questionIdx) => {
    let count = 1;
    for (let p = 0; p < partIdx; p++) {
      for (const section of parts[p].sections) {
        count += section.questions.length;
      }
    }
    for (let s = 0; s < sectionIdx; s++) {
      count += parts[partIdx].sections[s].questions.length;
    }
    return count + questionIdx;
  };

  // Save handler
  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      setMessage({ type: 'error', text: '❌ Vui lòng nhập tiêu đề đề thi!' });
      return;
    }
    if (!classCode.trim()) {
      setMessage({ type: 'error', text: '❌ Vui lòng nhập mã lớp!' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        title,
        classCode,
        teacherName,
        testType,
        parts,
        totalQuestions: parts.reduce((sum, part) => 
          sum + part.sections.reduce((sSum, sec) => sSum + sec.questions.length, 0), 0
        ),
      };

      // Determine API endpoint based on test type
      const isListening = testType.includes('listening');
      const endpoint = isListening ? 'cambridge/listening-tests' : 'cambridge/reading-tests';

      // If editId is provided, update instead of create
      if (editId) {
        const res = await fetch(apiPath(`${endpoint}/${editId}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Lỗi khi cập nhật đề');
        }
        setMessage({ type: 'success', text: '✅ Cập nhật đề thành công!' });
      } else {
        const response = await fetch(apiPath(endpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Lỗi khi lưu đề thi');
        }

        const result = await response.json();
        setMessage({ type: 'success', text: '✅ Tạo đề thành công!' });
      }

      // Redirect after success
      setTimeout(() => {
        navigate('/select-test');
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: '❌ Lỗi: ' + error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!testConfig) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>❌ Test type không hợp lệ: {testType}</h2>
        <p>Các test types hỗ trợ:</p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {Object.keys(TEST_CONFIGS).map(key => (
            <li key={key} style={{ padding: '4px' }}>
              <code>{key}</code> - {TEST_CONFIGS[key].name}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* AdminNavbar */}
      <AdminNavbar />

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '280px 1fr', 
        minHeight: 'calc(100vh - 60px)',
      }}>
      {/* Sidebar */}
      <div style={{
        backgroundColor: '#1e293b',
        color: 'white',
        padding: '20px',
      }}>
        {/* Test Info */}
        <div style={{
          padding: '16px',
          backgroundColor: '#334155',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>
            🎓 {testConfig.name}
          </h3>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            <p style={{ margin: '4px 0' }}>📊 {testConfig.totalQuestions} câu hỏi</p>
            <p style={{ margin: '4px 0' }}>📖 {testConfig.parts} parts</p>
            <p style={{ margin: '4px 0' }}>⏱️ {testConfig.duration} phút</p>
          </div>
        </div>

        {/* Parts Navigation */}
        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#94a3b8' }}>
          📋 Parts
        </h4>
        {parts.map((part, idx) => (
          <div
            key={idx}
            onClick={() => {
              setSelectedPartIndex(idx);
              setSelectedSectionIndex(0);
            }}
            style={{
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: selectedPartIndex === idx ? '#3b82f6' : '#475569',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <strong>{part.title}</strong>
            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
              {part.sections.length} section(s)
            </div>
          </div>
        ))}

        <button
          onClick={handleAddPart}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            marginTop: '12px',
          }}
        >
          ➕ Thêm Part
        </button>

        {/* Sections in current Part */}
        {currentPart && currentPart.sections.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#94a3b8' }}>
              📑 Sections trong Part {selectedPartIndex + 1}
            </h4>
            {currentPart.sections.map((sec, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedSectionIndex(idx)}
                style={{
                  padding: '10px',
                  marginBottom: '6px',
                  backgroundColor: selectedSectionIndex === idx ? '#6366f1' : '#475569',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Section {idx + 1}: {sec.questionType}
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                  {sec.questions.length} câu hỏi
                </div>
              </div>
            ))}
            <button
              onClick={handleAddSection}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                marginTop: '8px',
                fontSize: '13px',
              }}
            >
              ➕ Thêm Section
            </button>
          </div>
        )}

        {/* Available Question Types */}
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#94a3b8' }}>
            📝 Loại câu hỏi hỗ trợ
          </h4>
          <div style={{ fontSize: '12px' }}>
            {availableTypes.map(qt => (
              <div key={qt.id} style={{
                padding: '6px 10px',
                backgroundColor: '#475569',
                borderRadius: '4px',
                marginBottom: '4px',
              }}>
                {qt.icon} {qt.labelVi || qt.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '24px' }}>
        {/* Header with Title and Save */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>
            🎓 Tạo Đề {testConfig.name}
          </h1>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            style={{
              padding: '12px 24px',
              backgroundColor: isSubmitting ? '#94a3b8' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {isSubmitting ? '⏳ Đang lưu...' : '💾 Lưu đề'}
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            color: message.type === 'error' ? '#dc2626' : '#16a34a',
          }}>
            {message.text}
          </div>
        )}

        {/* Test Info Form */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 16px', color: '#374151' }}>📝 Thông tin đề thi</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontWeight: 600, 
                color: '#374151',
                fontSize: '14px',
              }}>
                Tiêu đề đề thi *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: KET Listening Test 1"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontWeight: 600, 
                color: '#374151',
                fontSize: '14px',
              }}>
                Mã lớp *
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                placeholder="VD: KET-2024-A"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontWeight: 600, 
                color: '#374151',
                fontSize: '14px',
              }}>
                Tên giáo viên
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="VD: Cô Lan"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>

        {/* Current Part Editor */}
        {currentPart && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ margin: '0 0 20px', color: '#0e276f' }}>
              📌 {currentPart.title}
            </h2>

            {/* Part Instruction */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 600,
                color: '#374151',
              }}>
                Hướng dẫn Part:
              </label>
              <textarea
                value={currentPart.instruction}
                onChange={(e) => {
                  const newParts = [...parts];
                  newParts[selectedPartIndex].instruction = e.target.value;
                  setParts(newParts);
                }}
                placeholder="Nhập hướng dẫn cho part này..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  minHeight: '80px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Section */}
            {currentSection && (
              <div style={{
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                backgroundColor: '#f8fafc',
              }}>
                <h3 style={{ margin: '0 0 16px', color: '#374151' }}>
                  📝 Section {selectedSectionIndex + 1}
                </h3>

                {/* Question Type Selector */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 600,
                    color: '#374151',
                  }}>
                    Loại câu hỏi:
                  </label>
                  <QuestionTypeSelector
                    testType={testType}
                    value={currentSection.questionType}
                    onChange={handleQuestionTypeChange}
                    style={{ maxWidth: '400px' }}
                  />
                </div>

                {/* Question Editor */}
                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}>
                  {currentSection.questions.map((question, qIdx) => (
                    <div key={qIdx} style={{
                      marginBottom: '20px',
                      paddingBottom: '20px',
                      borderBottom: qIdx < currentSection.questions.length - 1 ? '2px dashed #e5e7eb' : 'none',
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}>
                        <span style={{ 
                          fontWeight: 600, 
                          color: '#6366f1',
                          fontSize: '14px',
                        }}>
                          Câu hỏi #{calculateStartingNumber(selectedPartIndex, selectedSectionIndex, qIdx)}
                        </span>
                        {currentSection.questions.length > 1 && (
                          <button
                            onClick={() => handleDeleteQuestion(qIdx)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            🗑️ Xóa
                          </button>
                        )}
                      </div>
                      <QuestionEditorFactory
                        questionType={currentSection.questionType}
                        question={question}
                        onChange={(field, value) => {
                          const newParts = [...parts];
                          newParts[selectedPartIndex].sections[selectedSectionIndex].questions[qIdx] = {
                            ...question,
                            [field]: value,
                          };
                          setParts(newParts);
                        }}
                        questionIndex={qIdx}
                        startingNumber={calculateStartingNumber(selectedPartIndex, selectedSectionIndex, qIdx)}
                      />
                    </div>
                  ))}
                  
                  <button
                    onClick={handleAddQuestion}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                    }}
                  >
                    ➕ Thêm câu hỏi
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Part Structure Reference */}
        <div style={{
          marginTop: '24px',
          padding: '20px',
          backgroundColor: '#f0f9ff',
          borderRadius: '12px',
          border: '1px solid #bae6fd',
        }}>
          <h3 style={{ margin: '0 0 16px', color: '#0369a1' }}>
            📖 Cấu trúc đề chuẩn {testConfig.name}
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#e0f2fe' }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #7dd3fc' }}>Part</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #7dd3fc' }}>Questions</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #7dd3fc' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {testConfig.partStructure?.map((ps, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f0f9ff' }}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Part {ps.part}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>{ps.questions}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>{ps.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* End grid */}
    </div>
    </div>
  );
};

export default CambridgeTestBuilder;
