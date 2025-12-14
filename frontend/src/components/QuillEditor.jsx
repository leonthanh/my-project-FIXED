import React, { useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const QuillEditor = ({ value, onChange, placeholder, showBlankButton = false }) => {
  const quillRef = useRef(null);
  const [showTableInput, setShowTableInput] = useState(false);
  const [tableRows, setTableRows] = useState(2);
  const [tableCols, setTableCols] = useState(3);

  const handleInsertBlank = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const cursorPosition = editor.getSelection()?.index || editor.getLength();
      editor.insertText(cursorPosition, '…………');
      editor.setSelection(cursorPosition + '…………'.length);
    }
  };

  const handleInsertTable = () => {
    if (!quillRef.current) return;
    
    const rows = parseInt(tableRows) || 2;
    const cols = parseInt(tableCols) || 3;
    
    // Create table HTML
    let tableHtml = '<table style="border-collapse: collapse; width: 100%; margin: 10px 0;"><tbody>';
    for (let i = 0; i < rows; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < cols; j++) {
        tableHtml += '<td style="border: 1px solid #000; padding: 10px; text-align: left;"><br></td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table>';
    
    const editor = quillRef.current.getEditor();
    const range = editor.getSelection();
    const index = range ? range.index : editor.getLength();
    
    // Add newline before table
    editor.insertText(index, '\n');
    
    // Use dangerouslyPasteHTML to insert table HTML
    editor.dangerouslyPasteHTML(index + 1, tableHtml);
    
    setShowTableInput(false);
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
    <div style={{ position: 'relative', zIndex: 10 }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {showBlankButton && (
          <button
            type="button"
            onClick={handleInsertBlank}
            style={{
              padding: '8px 16px',
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
        
        <button
          type="button"
          onClick={() => setShowTableInput(!showTableInput)}
          style={{
            padding: '8px 16px',
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
          📋 Tạo bảng
        </button>
      </div>

      {showTableInput && (
        <div style={{
          marginBottom: '10px',
          padding: '10px',
          backgroundColor: '#f0f5ff',
          borderRadius: '4px',
          border: '1px solid #0e276f',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div>
            <label style={{ marginRight: '5px', fontWeight: 'bold' }}>Hàng:</label>
            <input
              type="number"
              min="1"
              max="20"
              value={tableRows}
              onChange={(e) => setTableRows(e.target.value)}
              style={{
                width: '50px',
                padding: '5px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
          <div>
            <label style={{ marginRight: '5px', fontWeight: 'bold' }}>Cột:</label>
            <input
              type="number"
              min="1"
              max="20"
              value={tableCols}
              onChange={(e) => setTableCols(e.target.value)}
              style={{
                width: '50px',
                padding: '5px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleInsertTable}
            style={{
              padding: '5px 15px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px'
            }}
          >
            ✓ Chèn
          </button>
          <button
            type="button"
            onClick={() => setShowTableInput(false)}
            style={{
              padding: '5px 15px',
              backgroundColor: '#e03',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px'
            }}
          >
            ✕ Đóng
          </button>
        </div>
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
