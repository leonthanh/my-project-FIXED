import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminNavbar } from "../../../shared/components";
import { 
  QuestionTypeSelector, 
  QuestionEditorFactory,
} from "../../../shared/components/questions";
import { 
  getQuestionTypesForTest,
  getDefaultQuestionData,
  getTestConfig,
} from "../../../shared/config/questionTypes";
import { apiPath } from "../../../shared/utils/api";
import CambridgeTestBuilder from "../CambridgeTestBuilder";

/**
 * EditCambridgeReadingTest - Trang sửa đề Cambridge Reading
 */
const EditCambridgeReadingTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const testType = 'ket-reading';
  const testConfig = getTestConfig(testType);
  // Memoize available types so the array identity doesn't change each render
  const availableTypes = useMemo(() => getQuestionTypesForTest(testType), [testType]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form fields
  const [title, setTitle] = useState('');
  const [classCode, setClassCode] = useState('');
  const [teacherName, setTeacherName] = useState('');

  // State
  const [parts, setParts] = useState([]);
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);

  // Fetch test data on mount
  const [fetchedData, setFetchedData] = useState(null);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const res = await fetch(apiPath(`cambridge/reading-tests/${id}`));
        if (!res.ok) throw new Error('Không thể tải đề thi');

        const data = await res.json();

        // Ensure parts is parsed if string
        if (typeof data.parts === 'string') {
          try {
            data.parts = JSON.parse(data.parts);
          } catch (err) {
            console.warn('Could not parse parts JSON from DB:', err);
            data.parts = null;
          }
        }

        setFetchedData(data);
      } catch (err) {
        console.error('❌ Lỗi khi tải đề:', err);
        setMessage({ type: 'error', text: 'Không thể tải đề thi. ' + err.message });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchTest();
  }, [id]);

  if (loading) {
    return (
      <>
        <AdminNavbar />
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <p>⏳ Đang tải đề thi...</p>
        </div>
      </>
    );
  }

  // Render the creator with initial data for identical UI
  return <CambridgeTestBuilder testType={testType} editId={id} initialData={fetchedData} />;

  const currentPart = parts[selectedPartIndex];
  const currentSection = currentPart?.sections?.[selectedSectionIndex];

  // Handlers
  const handleQuestionTypeChange = (newType) => {
    const newParts = [...parts];
    newParts[selectedPartIndex].sections[selectedSectionIndex].questionType = newType;
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
        sections: [{
          sectionTitle: '',
          questionType: availableTypes[0]?.id || 'fill',
          questions: [getDefaultQuestionData(availableTypes[0]?.id || 'fill')],
        }]
      }
    ]);
    setSelectedPartIndex(parts.length);
    setSelectedSectionIndex(0);
  };

  const handleRemovePart = (index) => {
    if (parts.length <= 1) return;
    const newParts = parts.filter((_, i) => i !== index);
    newParts.forEach((p, i) => {
      p.partNumber = i + 1;
      p.title = `Part ${i + 1}`;
    });
    setParts(newParts);
    if (selectedPartIndex >= newParts.length) {
      setSelectedPartIndex(newParts.length - 1);
    }
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

  const handleRemoveSection = (sectionIndex) => {
    const newParts = [...parts];
    if (newParts[selectedPartIndex].sections.length <= 1) return;
    newParts[selectedPartIndex].sections.splice(sectionIndex, 1);
    setParts(newParts);
    if (selectedSectionIndex >= newParts[selectedPartIndex].sections.length) {
      setSelectedSectionIndex(newParts[selectedPartIndex].sections.length - 1);
    }
  };

  const handlePartInstructionChange = (value) => {
    const newParts = [...parts];
    newParts[selectedPartIndex].instruction = value;
    setParts(newParts);
  };

  const handleSectionTitleChange = (value) => {
    const newParts = [...parts];
    newParts[selectedPartIndex].sections[selectedSectionIndex].sectionTitle = value;
    setParts(newParts);
  };

  // Count total questions
  const getTotalQuestions = () => {
    let total = 0;

    parts.forEach(part => {
      part.sections?.forEach(section => {
        (section.questions || []).forEach(question => {
          if (section.questionType === "long-text-mc" && Array.isArray(question.questions)) {
            total += question.questions.length;
            return;
          }

          if (["cloze-mc", "cloze-test"].includes(section.questionType) && Array.isArray(question.blanks)) {
            total += question.blanks.length > 0 ? question.blanks.length : 1;
            return;
          }

          total += 1;
        });
      });
    });

    return total;
  };

  // Submit handler - UPDATE instead of CREATE
  const handleSubmit = async () => {
    if (!title.trim() || !classCode.trim() || !teacherName.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin đề thi!' });
      return;
    }

    if (parts.length === 0) {
      setMessage({ type: 'error', text: 'Vui lòng thêm ít nhất 1 phần!' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        title,
        classCode,
        teacherName,
        testType: testType.split('-')[0], // 'ket' or 'pet'
        parts,
        totalQuestions: getTotalQuestions(),
        status: 'published',
      };

      const res = await fetch(apiPath(`cambridge/reading-tests/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lỗi khi cập nhật đề');
      }

      setMessage({ type: 'success', text: '✅ Cập nhật đề thành công!' });
      
      setTimeout(() => {
        navigate('/select-test');
      }, 1500);
    } catch (err) {
      console.error('❌ Lỗi:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <AdminNavbar />
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <p>⏳ Đang tải đề thi...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminNavbar />
      <div style={{ 
        padding: '20px', 
        maxWidth: '1400px', 
        margin: '0 auto',
        fontFamily: 'sans-serif' 
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <div>
            <h1 style={{ margin: 0, color: '#333' }}>
              ✏️ Sửa đề {testConfig?.nameVi || 'Cambridge'}
            </h1>
            <p style={{ margin: '5px 0 0', color: '#666' }}>
              ID: {id} | Tổng câu hỏi: {getTotalQuestions()}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate('/select-test')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              ← Quay lại
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '12px 24px',
                backgroundColor: isSubmitting ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {isSubmitting ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
            </button>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            padding: '15px',
            marginBottom: '20px',
            borderRadius: '8px',
            backgroundColor: message.type === 'error' ? '#fee' : '#efe',
            color: message.type === 'error' ? '#c00' : '#080',
            border: `1px solid ${message.type === 'error' ? '#fcc' : '#cfc'}`,
          }}>
            {message.text}
          </div>
        )}

        {/* Main Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
          {/* Left Sidebar - Test Info & Parts Navigation */}
          <div>
            {/* Test Info */}
            <div style={{
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              <h3 style={{ marginTop: 0, color: '#333' }}>📋 Thông tin đề</h3>
              
              <label style={{ display: 'block', marginBottom: '10px' }}>
                <span style={{ color: '#555', fontSize: '14px' }}>Tiêu đề *</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: KET Reading Test 1"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    marginTop: '5px',
                    boxSizing: 'border-box',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '10px' }}>
                <span style={{ color: '#555', fontSize: '14px' }}>Mã lớp *</span>
                <input
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="VD: CS3"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    marginTop: '5px',
                    boxSizing: 'border-box',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '0' }}>
                <span style={{ color: '#555', fontSize: '14px' }}>Tên giáo viên *</span>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="VD: Ms. Thanh"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    marginTop: '5px',
                    boxSizing: 'border-box',
                  }}
                />
              </label>
            </div>

            {/* Parts Navigation */}
            <div style={{
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '15px' 
              }}>
                <h3 style={{ margin: 0, color: '#333' }}>📑 Các phần</h3>
                <button
                  onClick={handleAddPart}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  + Thêm
                </button>
              </div>

              {parts.map((part, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setSelectedPartIndex(index);
                    setSelectedSectionIndex(0);
                  }}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: selectedPartIndex === index ? '#e3f2fd' : '#f5f5f5',
                    border: selectedPartIndex === index ? '2px solid #2196f3' : '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: selectedPartIndex === index ? 'bold' : 'normal' }}>
                    {part.title}
                  </span>
                  {parts.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePart(index);
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right - Question Editor */}
          <div style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            {currentPart && (
              <>
                {/* Part Header */}
                <div style={{ 
                  borderBottom: '2px solid #eee', 
                  paddingBottom: '15px', 
                  marginBottom: '20px' 
                }}>
                  <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>
                    📝 {currentPart.title}
                  </h2>
                  
                  <label style={{ display: 'block' }}>
                    <span style={{ color: '#555', fontSize: '14px' }}>Hướng dẫn (instruction)</span>
                    <textarea
                      value={currentPart.instruction || ''}
                      onChange={(e) => handlePartInstructionChange(e.target.value)}
                      placeholder="VD: Read the texts below and answer the questions..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        marginTop: '5px',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                  </label>
                </div>

                {/* Sections */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ 
                    display: 'flex', 
                    gap: '10px', 
                    marginBottom: '15px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#555', fontWeight: 'bold' }}>Sections:</span>
                    {currentPart.sections?.map((section, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSectionIndex(idx)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: selectedSectionIndex === idx ? '#2196f3' : '#e0e0e0',
                          color: selectedSectionIndex === idx ? 'white' : '#333',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Section {idx + 1}
                        {currentPart.sections.length > 1 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSection(idx);
                            }}
                            style={{ marginLeft: '8px', color: selectedSectionIndex === idx ? '#ffcdd2' : '#999' }}
                          >
                            ✕
                          </span>
                        )}
                      </button>
                    ))}
                    <button
                      onClick={handleAddSection}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      + Section
                    </button>
                  </div>
                </div>

                {/* Current Section Editor */}
                {currentSection && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '15px' }}>
                      <span style={{ color: '#555', fontSize: '14px' }}>Tiêu đề Section</span>
                      <input
                        type="text"
                        value={currentSection.sectionTitle || ''}
                        onChange={(e) => handleSectionTitleChange(e.target.value)}
                        placeholder="VD: Questions 1-5"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          marginTop: '5px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </label>

                    {/* Question Type Selector */}
                    <div style={{ marginBottom: '20px' }}>
                      <QuestionTypeSelector
                        testType={testType}
                        selectedType={currentSection.questionType}
                        onTypeChange={handleQuestionTypeChange}
                        availableTypes={availableTypes}
                      />
                    </div>

                    {/* Question Editor */}
                    <QuestionEditorFactory
                      questionType={currentSection.questionType}
                      questionData={currentSection.questions?.[0] || {}}
                      onQuestionChange={handleQuestionChange}
                      testType={testType}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EditCambridgeReadingTest;
