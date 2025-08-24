import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const QuillEditor = ({ value, onChange, placeholder }) => {
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
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
    'link', 'image'
  ];

  return (
    <ReactQuill
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
  );
};

export default QuillEditor;
