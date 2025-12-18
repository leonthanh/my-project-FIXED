import React, { useRef, useState, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Register custom size class
const Size = Quill.import('formats/size');
Size.whitelist = ['small', 'normal', 'large', 'huge'];
Quill.register(Size, true);

// Register align format
const Align = Quill.import('formats/align');
Align.whitelist = ['', 'center', 'right', 'justify'];
Quill.register(Align, true);

const QuillEditor = ({ value, onChange, placeholder, showBlankButton = false }) => {
  const quillRef = useRef(null);
  const [internalValue, setInternalValue] = useState(value || '');

  // Helper: Clean up HTML by removing empty paragraphs and unnecessary tags
  const cleanupHTML = (html) => {
    if (!html) return '';
    
    // Remove empty <p><br></p> tags
    let cleaned = html.replace(/<p><br><\/p>/g, '');
    
    // Remove multiple consecutive empty paragraphs
    cleaned = cleaned.replace(/<p><\/p>/g, '');
    
    // Remove excessive whitespace-only paragraphs
    cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
    
    // Replace multiple <br> with single <br>
    cleaned = cleaned.replace(/<br>\s*<br>/g, '<br>');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  };

  // Update internal value when prop changes
  useEffect(() => {
    console.log(`📝 QuillEditor: value prop changed to: ${(value || '').substring(0, 50)}...`);
    const cleanedValue = cleanupHTML(value || '');
    setInternalValue(cleanedValue);
    
    // Force update Quill content if editor exists
    if (quillRef.current && quillRef.current.getEditor) {
      const editor = quillRef.current.getEditor();
      if (editor) {
        const currentContent = editor.root.innerHTML;
        if (currentContent !== cleanedValue) {
          editor.root.innerHTML = cleanedValue || '';
        }
      }
    }
  }, [value]);

  const handleInsertBlank = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const cursorPosition = editor.getSelection()?.index || editor.getLength();
      editor.insertText(cursorPosition, '…………');
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
      ['clean']
    ]
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'font', 'size',
    'list', 'bullet',
    'align', 'direction',
    'link', 'image'
  ];

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <style>{`
        /* Fix Quill Heading spacing */
        .ql-editor h1, .ql-editor h2, .ql-editor h3 {
          margin: 0.5em 0 !important;
          padding: 0 !important;
        }
        .ql-editor h3 {
          font-size: 1.17em !important;
        }
        
        /* Fix paragraph spacing */
        .ql-editor p {
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Preserve line breaks */
        .ql-editor br {
          margin: 0 !important;
        }
        
        /* Fix list spacing */
        .ql-editor ul, .ql-editor ol {
          margin: 0.5em 0 !important;
          padding-left: 1.5em !important;
        }
        
        /* Size formats */
        .ql-editor .ql-size-small {
          font-size: 0.75em;
        }
        .ql-editor .ql-size-large {
          font-size: 1.5em;
        }
        .ql-editor .ql-size-huge {
          font-size: 2.5em;
        }
        
        /* Align formats */
        .ql-editor [style*="text-align: center"] {
          text-align: center !important;
        }
        .ql-editor [style*="text-align: right"] {
          text-align: right !important;
        }
        .ql-editor [style*="text-align: justify"] {
          text-align: justify !important;
        }
      `}</style>
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
      </div>
      
      <div style={{ 
        position: 'relative',
        zIndex: 10
      }}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={internalValue}
          onChange={(val) => {
            const cleanedVal = cleanupHTML(val);
            console.log(`✏️ QuillEditor: content changed, cleaned length: ${cleanedVal.length}`);
            setInternalValue(cleanedVal);
            onChange(cleanedVal);
          }}
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
