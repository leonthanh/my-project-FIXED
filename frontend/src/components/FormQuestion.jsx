import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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

  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      ['link', 'image'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['clean']
    ]
  };

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
      <textarea
        value={question.formTemplate || ''}
        onChange={e => handleChange('formTemplate', e.target.value)}
        rows={5}
        style={styles.input}
        placeholder="Nhập mẫu form (sử dụng ___ để đánh dấu chỗ trống)"
      />

      <label style={styles.label}>✍️ Câu hỏi:</label>
      <ReactQuill
        value={question.question}
        onChange={handleQuestionChange}
        modules={modules}
        formats={formats}
        theme="snow"
      />

      <label style={styles.label}>✅ Đáp án đúng:</label>
      <input
        type="text"
        value={question.correctAnswer}
        onChange={e => handleChange('correctAnswer', e.target.value)}
        style={styles.input}
        placeholder="Nhập đáp án (ONE WORD AND/OR A NUMBER)"
      />

      <div style={{ marginTop: '15px' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>
          💡 Hướng dẫn:
          <ul>
            <li>Sử dụng ___ để đánh dấu chỗ trống trong form</li>
            <li>Mỗi chỗ trống chỉ được điền một từ hoặc một số</li>
            <li>Form sẽ được hiển thị dưới dạng bảng trong đề thi</li>
          </ul>
        </p>
      </div>

      {/* Preview */}
      <div style={{ marginTop: '15px' }}>
        <label style={styles.label}>👁 Preview:</label>
        <table style={styles.table}>
          <tbody>
            {question.formTemplate?.split('\n').map((row, i) => (
              <tr key={i}>
                {row.split('|').map((cell, j) => (
                  <td key={j} style={styles.cell}>
                    {cell.includes('___') ? (
                      <div style={{ color: '#999' }}>_____________</div>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FormQuestion;
