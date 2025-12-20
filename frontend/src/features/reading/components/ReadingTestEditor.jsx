import React from 'react';
import { AdminNavbar, QuillEditor, QuestionSection } from '../../../shared/components';
import { useColumnLayout } from '../hooks';
import { 
  calculateTotalQuestions, 
  createDefaultQuestionByType 
} from '../utils';
import {
  colors,
  compactInputStyle,
  modalStyles,
  modalContentStyles,
  modalHeaderStyles,
  confirmButtonStyle,
  backButtonStyle,
  columnHeaderStyle,
  itemStyle,
  deleteButtonSmallStyle,
  addButtonStyle,
  resizeDividerStyle,
  compactCSS
} from '../utils/styles';
import 'react-quill/dist/quill.snow.css';

/**
 * ReadingTestEditor - Base component cho Create và Edit Reading Test
 * 
 * @param {Object} props
 * @param {string} props.pageTitle - Tiêu đề trang (VD: "📚 Tạo Đề Reading IELTS")
 * @param {string} props.pageIcon - Icon (mặc định từ pageTitle)
 * @param {string} props.className - CSS class name
 * 
 * @param {string} props.title - Tiêu đề đề thi
 * @param {Function} props.setTitle - Setter cho title
 * @param {string} props.classCode - Mã lớp
 * @param {Function} props.setClassCode - Setter cho classCode
 * @param {string} props.teacherName - Tên giáo viên
 * @param {Function} props.setTeacherName - Setter cho teacherName
 * 
 * @param {Array} props.passages - Mảng passages
 * @param {number} props.selectedPassageIndex - Index passage đang chọn
 * @param {Function} props.setSelectedPassageIndex - Setter
 * @param {number|null} props.selectedSectionIndex - Index section đang chọn
 * @param {Function} props.setSelectedSectionIndex - Setter
 * 
 * @param {Function} props.onPassageChange - Handler thay đổi passage
 * @param {Function} props.onAddPassage - Handler thêm passage
 * @param {Function} props.onDeletePassage - Handler xóa passage
 * @param {Function} props.onSectionChange - Handler thay đổi section
 * @param {Function} props.onAddSection - Handler thêm section
 * @param {Function} props.onDeleteSection - Handler xóa section
 * @param {Function} props.onCopySection - Handler copy section
 * @param {Function} props.onQuestionChange - Handler thay đổi question
 * @param {Function} props.onAddQuestion - Handler thêm question
 * @param {Function} props.onDeleteQuestion - Handler xóa question
 * @param {Function} props.onCopyQuestion - Handler copy question
 * 
 * @param {boolean} props.isReviewing - Đang review?
 * @param {Function} props.setIsReviewing - Setter
 * @param {Function} props.onReview - Handler khi click Review
 * @param {Function} props.onConfirmSubmit - Handler khi confirm submit
 * @param {boolean} props.isSubmitting - Đang submit?
 * @param {string} props.submitButtonText - Text nút submit (VD: "Tạo đề", "Cập nhật")
 * 
 * @param {string} props.message - Thông báo
 * @param {boolean} props.showPreview - Hiển thị preview?
 * @param {Function} props.setShowPreview - Setter
 * 
 * @param {React.ReactNode} props.children - Nội dung bổ sung (loading state, etc.)
 */
const ReadingTestEditor = ({
  // Page info
  pageTitle = '📚 Reading Test Editor',
  className = 'reading-test-editor',
  
  // Form fields
  title,
  setTitle,
  classCode,
  setClassCode,
  teacherName,
  setTeacherName,
  
  // Passages state
  passages,
  selectedPassageIndex,
  setSelectedPassageIndex,
  selectedSectionIndex,
  setSelectedSectionIndex,
  
  // Passage handlers
  onPassageChange,
  onAddPassage,
  onDeletePassage,
  
  // Section handlers
  onSectionChange,
  onAddSection,
  onDeleteSection,
  onCopySection,
  
  // Question handlers
  onQuestionChange,
  onAddQuestion,
  onDeleteQuestion,
  onCopyQuestion,
  
  // Review & Submit
  isReviewing,
  setIsReviewing,
  onReview,
  onConfirmSubmit,
  isSubmitting,
  submitButtonText = 'Xác nhận',
  
  // Messages & Preview
  message,
  showPreview,
  setShowPreview,
  
  // Children for custom content
  children
}) => {
  // Use column layout hook
  const {
    collapsedColumns,
    isResizing,
    toggleColumnCollapse,
    handleMouseDown,
    getColumnWidth
  } = useColumnLayout();

  // Current passage and section
  const currentPassage = passages?.[selectedPassageIndex];
  const currentSection = currentPassage?.sections?.[selectedSectionIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontSize: '13px' }}>
      <style>{compactCSS(className)}</style>
      <AdminNavbar />
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }} className={className}>
        {/* HEADER */}
        <div style={{ padding: '10px 15px', backgroundColor: '#fff', borderBottom: '1px solid #ddd', overflowY: 'auto', flexShrink: 0 }}>
          <h2 style={{ margin: '6px 0 10px 0', fontSize: '18px', textAlign: 'center' }}>{pageTitle}</h2>
          
          {/* Form inputs */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '800px', margin: '0 auto' }}>
            <input
              type="text"
              placeholder="Tiêu đề đề thi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ ...compactInputStyle, flex: '1 1 45%', minWidth: '200px' }}
            />
            
            <input
              type="text"
              placeholder="Mã lớp"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              style={{ ...compactInputStyle, flex: '1 1 20%', minWidth: '120px' }}
            />
            
            <input
              type="text"
              placeholder="Tên giáo viên"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              style={{ ...compactInputStyle, flex: '1 1 25%', minWidth: '150px' }}
            />
          </div>
          
          {/* Message */}
          {message && (
            <div style={{ 
              textAlign: 'center', 
              padding: '8px', 
              marginTop: '8px',
              backgroundColor: message.includes('❌') ? '#ffe6e6' : message.includes('✅') ? '#e6ffe6' : '#fff3cd',
              borderRadius: '4px',
              color: message.includes('❌') ? 'red' : message.includes('✅') ? 'green' : '#856404'
            }}>
              {message}
            </div>
          )}
        </div>

        {/* 4-COLUMN LAYOUT */}
        <form onSubmit={onReview} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '0px', flex: 1, backgroundColor: '#ddd', overflow: 'hidden', position: 'relative' }}>
            
            {/* COLUMN 1: PASSAGES */}
            <div style={{
              width: getColumnWidth('col1'),
              backgroundColor: '#f5f5f5',
              borderRight: '1px solid #ddd',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              transition: isResizing ? 'none' : 'width 0.3s ease'
            }}>
              <div 
                style={columnHeaderStyle(colors.primaryBlue)} 
                onClick={() => toggleColumnCollapse('col1')}
              >
                {!collapsedColumns.col1 && <span>📚 PASSAGES</span>}
                {collapsedColumns.col1 && <span style={{ fontSize: '14px' }}>📚</span>}
                <span style={{ fontSize: '11px' }}>{collapsedColumns.col1 ? '▶' : '◀'}</span>
              </div>
              
              {!collapsedColumns.col1 && (
                <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                  {passages?.map((passage, idx) => (
                    <div
                      key={idx}
                      style={itemStyle(selectedPassageIndex === idx, colors.primaryBlue)}
                    >
                      <div
                        onClick={() => {
                          setSelectedPassageIndex(idx);
                          setSelectedSectionIndex(null);
                        }}
                        style={{ flex: 1, cursor: 'pointer' }}
                      >
                        Passage {idx + 1}
                        <br />
                        <small>{passage.passageTitle || '(Untitled)'}</small>
                      </div>
                      {passages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeletePassage(idx)}
                          style={deleteButtonSmallStyle}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={onAddPassage}
                    style={addButtonStyle(colors.successGreen)}
                  >
                    ➕ Thêm Passage
                  </button>
                </div>
              )}
            </div>

            {/* RESIZE DIVIDER 1 */}
            <div
              onMouseDown={(e) => handleMouseDown(1, e)}
              style={resizeDividerStyle(isResizing === 1)}
            />

            {/* COLUMN 2: PASSAGE CONTENT */}
            <div style={{
              width: getColumnWidth('col2'),
              backgroundColor: '#fafafa',
              borderRight: '1px solid #ddd',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              transition: isResizing ? 'none' : 'width 0.3s ease'
            }}>
              <div 
                style={columnHeaderStyle(colors.successGreen)} 
                onClick={() => toggleColumnCollapse('col2')}
              >
                {!collapsedColumns.col2 && <span>📄 CONTENT</span>}
                {collapsedColumns.col2 && <span style={{ fontSize: '14px' }}>📄</span>}
                <span style={{ fontSize: '11px' }}>{collapsedColumns.col2 ? '▶' : '◀'}</span>
              </div>
              
              {!collapsedColumns.col2 && currentPassage ? (
                <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                  <label style={{ fontWeight: 'bold', color: colors.successGreen }}>📝 Tiêu đề</label>
                  <input
                    type="text"
                    value={currentPassage.passageTitle || ''}
                    onChange={(e) => onPassageChange(selectedPassageIndex, 'passageTitle', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      marginBottom: '15px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                  
                  <label style={{ fontWeight: 'bold', color: colors.successGreen }}>📖 Nội dung</label>
                  <div style={{ marginTop: '10px' }}>
                    <QuillEditor
                      key={`${selectedPassageIndex}-${currentPassage.passageTitle}`}
                      value={currentPassage.passageText || ''}
                      onChange={(value) => onPassageChange(selectedPassageIndex, 'passageText', value)}
                      placeholder="Nhập nội dung passage..."
                    />
                  </div>
                </div>
              ) : (
                !collapsedColumns.col2 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                    ← Chọn một Passage
                  </div>
                )
              )}
            </div>

            {/* RESIZE DIVIDER 2 */}
            <div
              onMouseDown={(e) => handleMouseDown(2, e)}
              style={resizeDividerStyle(isResizing === 2)}
            />

            {/* COLUMN 3: SECTIONS */}
            <div style={{
              width: getColumnWidth('col3'),
              backgroundColor: '#f5f5f5',
              borderRight: '1px solid #ddd',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              transition: isResizing ? 'none' : 'width 0.3s ease'
            }}>
              <div 
                style={columnHeaderStyle(colors.sectionRed)} 
                onClick={() => toggleColumnCollapse('col3')}
              >
                {!collapsedColumns.col3 && <span>📌 SECTIONS</span>}
                {collapsedColumns.col3 && <span style={{ fontSize: '14px' }}>📌</span>}
                <span style={{ fontSize: '11px' }}>{collapsedColumns.col3 ? '▶' : '◀'}</span>
              </div>
              
              {!collapsedColumns.col3 && currentPassage ? (
                <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                  {currentPassage.sections?.map((section, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedSectionIndex(idx)}
                      style={itemStyle(selectedSectionIndex === idx, colors.sectionRed)}
                    >
                      <div style={{ flex: 1 }}>
                        Section {idx + 1}
                        <br />
                        <small>{section.sectionTitle || '(Untitled)'}</small>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => onAddSection(selectedPassageIndex)}
                    style={addButtonStyle(colors.sectionRed)}
                  >
                    ➕ Thêm Section
                  </button>
                </div>
              ) : (
                !collapsedColumns.col3 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                    ← Chọn một Passage
                  </div>
                )
              )}
            </div>

            {/* RESIZE DIVIDER 3 */}
            <div
              onMouseDown={(e) => handleMouseDown(3, e)}
              style={resizeDividerStyle(isResizing === 3)}
            />

            {/* COLUMN 4: QUESTIONS */}
            <div style={{
              width: getColumnWidth('col4'),
              backgroundColor: '#fafafa',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              transition: isResizing ? 'none' : 'width 0.3s ease'
            }}>
              <div 
                style={columnHeaderStyle(colors.warningYellow, colors.black)} 
                onClick={() => toggleColumnCollapse('col4')}
              >
                {!collapsedColumns.col4 && <span>❓ QUESTIONS</span>}
                {collapsedColumns.col4 && <span style={{ fontSize: '14px' }}>❓</span>}
                <span style={{ fontSize: '11px' }}>{collapsedColumns.col4 ? '▶' : '◀'}</span>
              </div>
              
              {!collapsedColumns.col4 && currentSection ? (
                <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                  <QuestionSection
                    passageIndex={selectedPassageIndex}
                    sectionIndex={selectedSectionIndex}
                    section={currentSection}
                    onSectionChange={onSectionChange}
                    onAddQuestion={onAddQuestion}
                    onDeleteQuestion={onDeleteQuestion}
                    onCopyQuestion={onCopyQuestion}
                    onCopySection={onCopySection}
                    onQuestionChange={onQuestionChange}
                    onDeleteSection={onDeleteSection}
                    createDefaultQuestionByType={createDefaultQuestionByType}
                  />
                </div>
              ) : (
                !collapsedColumns.col4 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                    ← Chọn một Section để xem câu hỏi
                  </div>
                )
              )}
            </div>
          </div>
        </form>

        {/* FIXED BUTTONS & STATS */}
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          padding: '12px 20px',
          backgroundColor: '#fff',
          borderTop: '1px solid #ddd',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 999,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#666' }}>
            <span>📚 Passages: {passages?.length || 0}</span>
            <span>📌 Sections: {passages?.reduce((sum, p) => sum + (p.sections?.length || 0), 0) || 0}</span>
            <span>❓ Questions: {calculateTotalQuestions(passages)}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            {setShowPreview && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  backgroundColor: colors.gray,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
              >
                👁 Preview
              </button>
            )}

            <button
              type="button"
              onClick={onReview}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor: colors.dangerRed,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
            >
              ✅ Review & {submitButtonText}
            </button>
          </div>
        </div>

        {/* REVIEW MODAL */}
        {isReviewing && (
          <div style={modalStyles}>
            <div style={modalContentStyles}>
              <div style={modalHeaderStyles}>
                <h3 style={{ margin: 0 }}>📋 Xác nhận {submitButtonText}</h3>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <h4>📝 Thông tin đề thi:</h4>
                <p><strong>Tiêu đề:</strong> {title}</p>
                <p><strong>Mã lớp:</strong> {classCode || '(Không có)'}</p>
                <p><strong>Giáo viên:</strong> {teacherName || '(Không có)'}</p>
                <p><strong>Số passages:</strong> {passages?.length || 0}</p>
                <p><strong>Tổng câu hỏi:</strong> {calculateTotalQuestions(passages)}</p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsReviewing(false)}
                  style={backButtonStyle}
                  disabled={isSubmitting}
                >
                  ← Quay lại
                </button>
                <button
                  type="button"
                  onClick={onConfirmSubmit}
                  style={confirmButtonStyle}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '⏳ Đang xử lý...' : `✅ ${submitButtonText}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom children (loading state, etc.) */}
        {children}
      </div>
    </div>
  );
};

export default ReadingTestEditor;
