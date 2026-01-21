import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import useQuillImageUpload from '../hooks/useQuillImageUpload';

const FormQuestion = ({ question, onChange }) => {
  const handleChange = (field, value) => {
    onChange({
      ...question,
      [field]: value
    });
  };

  const handleQuestionChange = (value) => {
    handleChange('question', value);
  };

  const questionToolbar = useMemo(() => [
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline'],
    ['link', 'image'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean']
  ], []);

  const formToolbar = useMemo(() => [
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'image'],
    ['clean']
  ], []);

  const { quillRef: formQuillRef, modules: formModules } = useQuillImageUpload({ toolbar: formToolbar });
  const { quillRef: questionQuillRef, modules: questionModules } = useQuillImageUpload({ toolbar: questionToolbar });

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'link',
    'image',
    'list',
    'bullet'
  ];

  const styles = {
    container: {
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '15px'
    },
    label: {
      fontWeight: 'bold',
      marginBottom: '5px',
      display: 'block'
    },
    input: {
      width: '100%',
      padding: '8px',
      marginBottom: '8px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      fontSize: '14px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '10px'
    },
    cell: {
      border: '1px solid #ddd',
      padding: '8px'
    }
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>📝 Form Template:</label>
      <ReactQuill
        ref={formQuillRef}
        value={question.formTemplate || ''}
        onChange={(content) => handleChange('formTemplate', content)}
        modules={formModules}
        formats={[
          'header',
          'bold', 'italic', 'underline', 'strike',
          'color', 'background',
          'list', 'bullet', 'align',
          'link', 'image'
        ]}
        theme="snow"
        placeholder="Nhập mẫu form (sử dụng ___ để đánh dấu chỗ trống)"
        style={{ marginBottom: '20px' }}
      />

      <label style={styles.label}>✍️ Câu hỏi:</label>
      <ReactQuill
        ref={questionQuillRef}
        value={question.question}
        onChange={handleQuestionChange}
        modules={questionModules}
        formats={formats}
        theme="snow"
      />

      <label style={styles.label}>✅ Đáp án đúng:</label>
      <input
        type="text"
        value={question.correctAnswer}
        onChange={e => {
          // Loại bỏ khoảng trắng ở đầu và cuối
          const value = e.target.value.trim();
          // Cho phép chữ cái, số và khoảng trắng ở giữa
          if (!value || /^[a-zA-Z0-9]+$|^[a-zA-Z]+(\s[a-zA-Z]+)*$/.test(value)) {
            handleChange('correctAnswer', value);
          }
        }}
        style={styles.input}
        placeholder="Nhập đáp án (một từ hoặc chuỗi số liền nhau)"
      />

      <div style={{ marginTop: '15px' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>
          💡 Hướng dẫn:
          <ul>
            <li>Sử dụng ___ để đánh dấu chỗ trống trong form</li>
            <li>Mỗi chỗ trống có thể điền một từ hoặc một chuỗi số (vd: số điện thoại)</li>
            <li>Form sẽ được hiển thị dưới dạng bảng trong đề thi</li>
          </ul>
        </p>
      </div>

      {/* Preview */}
      <div style={{ marginTop: '15px' }}>
        <label style={styles.label}>👁 Preview:</label>
        <div 
          style={{ 
            padding: '15px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#fff'
          }}
          dangerouslySetInnerHTML={{ 
            __html: question.formTemplate?.replace(/___/g, '<span style="color: #999; text-decoration: underline;">_______</span>')
          }} 
        />
      </div>
    </div>
  );
};

export default FormQuestion;
