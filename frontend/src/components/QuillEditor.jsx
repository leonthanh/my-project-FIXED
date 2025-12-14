import React, { useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import 'quill-table';
import 'quill-table/dist/quill-table.snow.css';

const QuillEditor = ({ value, onChange, placeholder, showBlankButton = false }) => {
  const quillRef = useRef(null);

  const handleInsertBlank = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const cursorPosition = editor.getSelection()?.index || editor.getLength();
      editor.insertText(cursorPosition, '…………');
      // Move cursor after inserted text
      editor.setSelection(cursorPosition + '…………'.length);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['table'],
      ['clean']
    ]
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'font', 'size',
    'list', 'bullet',
    'align',
    'link', 'image',
    'table'
  ];

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      {showBlankButton && (
        <button
          type="button"
          onClick={handleInsertBlank}
          style={{
            padding: '8px 16px',
            marginBottom: '10px',
            backgroundColor: '#0e276f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: 11
          }}
        >
          ➕ Thêm chỗ trống
        </button>
      )}
      <div style={{ 
        position: 'relative',
        zIndex: 10
      }}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value || ''}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={{ 
            minHeight: '200px',
            marginBottom: '20px'
          }}
        />
      </div>
    </div>
  );
};

export default QuillEditor;
