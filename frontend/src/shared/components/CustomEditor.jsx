import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';

const editorConfig = {
  toolbar: {
    items: [
      'heading',
      '|',
      'fontSize',
      'fontFamily',
      '|',
      'fontColor',
      'fontBackgroundColor',
      '|',
      'bold',
      'italic',
      'underline',
      'strikethrough',
      '|',
      'bulletedList',
      'numberedList',
      '|',
      'alignment',
      'indent',
      'outdent',
      '|',
      'link',
      'insertTable',
      'blockQuote',
      '|',
      'undo',
      'redo'
    ],
    shouldNotGroupWhenFull: true
  },
  language: 'en',
  removePlugins: ['Title'],
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
  fontFamily: {
    options: [
      'default',
      'Arial, Helvetica, sans-serif',
      'Times New Roman, Times, serif',
      'Courier New, Courier, monospace'
    ]
  },
  table: {
    contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
  }
};

const CustomEditor = ({ value, onChange, placeholder }) => {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
      <CKEditor
        editor={DecoupledEditor}
        data={value}
        config={{
          ...editorConfig,
          placeholder: placeholder
        }}
        onReady={editor => {
          // Insert toolbar before editable area
          const toolbarContainer = editor.ui.view.toolbar.element;
          const editableArea = editor.ui.getEditableElement();
          
          if (editableArea.parentElement && !editableArea.parentElement.querySelector('.ck-toolbar')) {
            editableArea.parentElement.insertBefore(toolbarContainer, editableArea);
          }
          
          // Enable editing features
          editor.isReadOnly = false;
        }}
        onChange={(event, editor) => onChange(editor.getData())}
      />
    </div>
  );
};

export default CustomEditor;
