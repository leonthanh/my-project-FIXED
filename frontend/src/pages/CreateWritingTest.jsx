// src/pages/CreateWritingTest.jsx
import React, { useState, useRef } from 'react';
import AdminNavbar from '../components/AdminNavbar';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';

// Cấu hình CKEditor
DecoupledEditor.defaultConfig = {
  toolbar: {
    items: [
      'undo', 'redo', '|',
      'heading', '|',
      'fontSize', 'fontFamily', '|',
      'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', '|',
      'fontColor', 'fontBackgroundColor', '|',
      'alignment', '|',
      'bulletedList', 'numberedList', '|',
      'indent', 'outdent', '|',
      'link', 'insertImage', 'insertTable', 'mediaEmbed', '|',
      'highlight', 'blockQuote', 'code', '|',
      'specialCharacters'
    ],
    shouldNotGroupWhenFull: true
  },
  fontSize: {
    options: [
      9,
      11,
      13,
      'default',
      17,
      19,
      21,
      23,
      25,
      27,
      29,
      31
    ]
  },
  alignment: {
    options: ['left', 'center', 'right', 'justify']
  },
  image: {
    toolbar: [
      'imageTextAlternative',
      'toggleImageCaption',
      'imageStyle:inline',
      'imageStyle:block',
      'imageStyle:side'
    ]
  },
  table: {
    contentToolbar: [
      'tableColumn',
      'tableRow',
      'mergeTableCells',
      'tableCellProperties',
      'tableProperties'
    ]
  }
};

const CreateWritingTest = () => {
  const [task1, setTask1] = useState('');
  const [task2, setTask2] = useState('');
  const [classCode, setClassCode] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  const task1EditorRef = useRef(null);
  const task2EditorRef = useRef(null);
  const task1ToolbarRef = useRef(null);
  const task2ToolbarRef = useRef(null);

  const API = process.env.REACT_APP_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!task1.trim() || !task2.trim()) {
      setMessage('❌ Vui lòng nhập đầy đủ nội dung Task 1 và Task 2.');
      return;
    }

    const formData = new FormData();
    formData.append('task1', task1);
    formData.append('task2', task2);
    formData.append('classCode', classCode);
    formData.append('teacherName', teacherName);
    if (image) formData.append('image', image);

    try {
      const endpoint = image ? '/api/writing-tests/with-image' : '/api/writing-tests';
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      setMessage(data.message || '✅ Đã tạo đề');

      setTask1('');
      setTask2('');
      setClassCode('');
      setTeacherName('');
      setImage(null);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      console.error(err);
      setMessage('❌ Lỗi khi tạo đề');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    fontSize: '16px',
    borderRadius: '6px',
    border: '1px solid #ccc'
  };

  return (
    <>
      <AdminNavbar />
      <div style={{ maxWidth: '800px', margin: '20px auto' }}>
        <h2>📝 Thêm đề Writing</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Mã lớp (VD: 317S3)"
            value={classCode}
            onChange={e => setClassCode(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Tên giáo viên ra đề"
            value={teacherName}
            onChange={e => setTeacherName(e.target.value)}
            style={inputStyle}
          />

          <div style={{ marginBottom: '20px' }}>
            <label><b>Nội dung Task 1:</b></label>
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }} ref={task1EditorRef}>
              <div ref={task1ToolbarRef}></div>
              <CKEditor
                editor={DecoupledEditor}
                data={task1}
                onReady={editor => {
                  try {
                    if (task1ToolbarRef.current && !task1ToolbarRef.current.children.length) {
                      task1ToolbarRef.current.appendChild(editor.ui.view.toolbar.element);
                    }
                  } catch (err) {
                    console.error('Error mounting toolbar 1:', err);
                  }
                }}
                onChange={(event, editor) => setTask1(editor.getData())}
                config={{
                  toolbar: {
                    shouldNotGroupWhenFull: true
                  }
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label><b>Nội dung Task 2:</b></label>
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }} ref={task2EditorRef}>
              <div ref={task2ToolbarRef}></div>
              <CKEditor
                editor={DecoupledEditor}
                data={task2}
                onReady={editor => {
                  try {
                    if (task2ToolbarRef.current && !task2ToolbarRef.current.children.length) {
                      task2ToolbarRef.current.appendChild(editor.ui.view.toolbar.element);
                    }
                  } catch (err) {
                    console.error('Error mounting toolbar 2:', err);
                  }
                }}
                onChange={(event, editor) => setTask2(editor.getData())}
                config={{
                  toolbar: {
                    shouldNotGroupWhenFull: true
                  }
                }}
              />
            </div>
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={e => setImage(e.target.files[0])}
            style={{ margin: '10px 0' }}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#e03',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ➕ Tạo đề
            </button>

            <button
              type="button"
              onClick={() => setShowPreview(true)}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#0e276f',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              👁 Preview
            </button>
          </div>
        </form>

        {message && (
          <p style={{
            marginTop: 10,
            fontWeight: 'bold',
            color: message.includes('❌') ? 'red' : 'green'
          }}>
            {message}
          </p>
        )}

        {/* Modal Preview */}
        {showPreview && (
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0,
              width: '100%', height: '100%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}
            onClick={() => setShowPreview(false)}
          >
            <div
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                width: '80%',
                maxHeight: '80%',
                overflowY: 'auto'
              }}
              onClick={e => e.stopPropagation()}
            >
              <h3>📄 Xem trước đề</h3>

              {image && (
                <div style={{ marginBottom: '15px' }}>
                  <h4>Hình minh họa:</h4>
                  <img
                    src={URL.createObjectURL(image)}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      border: '1px solid #ccc',
                      borderRadius: '6px'
                    }}
                  />
                </div>
              )}

              <div>
                <h4>Task 1:</h4>
                <div dangerouslySetInnerHTML={{ __html: task1 }} />
              </div>

              <div style={{ marginTop: '15px' }}>
                <h4>Task 2:</h4>
                <div dangerouslySetInnerHTML={{ __html: task2 }} />
              </div>

              <div style={{ textAlign: 'right', marginTop: '20px' }}>
                <button
                  onClick={() => setShowPreview(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#e03',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CreateWritingTest;
