import React, { useState } from "react";
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

/**
 * CambridgeTestBuilder - Example component cho việc tạo đề Cambridge tests
 * Có thể dùng cho: KET, PET, FLYERS, MOVERS, STARTERS
 * 
 * Đây là template/example để tham khảo cách sử dụng các shared components
 */
const CambridgeTestBuilder = ({ testType = 'ket-listening' }) => {
  const testConfig = getTestConfig(testType);
  const availableTypes = getQuestionTypesForTest(testType);

  // State
  const [parts, setParts] = useState([
    {
      partNumber: 1,
      title: 'Part 1',
      instruction: '',
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
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '250px 1fr', 
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
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
        {/* Header */}
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
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            💾 Lưu đề
          </button>
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
                  <QuestionEditorFactory
                    questionType={currentSection.questionType}
                    question={currentSection.questions[0] || {}}
                    onChange={handleQuestionChange}
                    questionIndex={0}
                    startingNumber={1}
                  />
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
    </div>
  );
};

export default CambridgeTestBuilder;
