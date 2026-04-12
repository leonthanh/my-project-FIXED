import React from 'react';
import InlineIcon from './InlineIcon.jsx';

/**
 * KeyboardShortcutsHelp - Hiển thị danh sách keyboard shortcuts
 */

const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + S', action: 'Lưu / Review đề thi', iconName: 'save' },
    { key: 'Ctrl + N', action: 'Thêm câu hỏi mới', iconName: 'create' },
    { key: 'Ctrl + P', action: 'Xem trước đề thi (Preview)', iconName: 'eye' },
    { key: 'Ctrl + D', action: 'Chuyển Dark/Light mode', iconName: 'palette' },
    { key: 'Esc', action: 'Đóng modal/popup', iconName: 'close' }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000
    }} onClick={onClose}>
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '2px solid #0e276f'
        }}>
          <h3 style={{ margin: 0, color: '#0e276f', fontSize: '18px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <InlineIcon name="questions" size={18} style={{ color: '#0e276f' }} />
              Keyboard Shortcuts
            </span>
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <InlineIcon name="close" size={16} style={{ color: '#0e276f' }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {shortcuts.map((shortcut, idx) => (
            <div 
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}
            >
              <InlineIcon name={shortcut.iconName} size={18} style={{ color: '#0e276f' }} />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: '600', 
                  color: '#333',
                  fontSize: '14px'
                }}>
                  {shortcut.action}
                </div>
              </div>
              <kbd style={{
                padding: '6px 10px',
                backgroundColor: '#0e276f',
                color: 'white',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 'bold'
              }}>
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#1565c0',
          textAlign: 'center'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <InlineIcon name="idea" size={14} style={{ color: '#1565c0' }} />
            Nhấn <kbd style={{ 
            padding: '2px 6px', 
            backgroundColor: '#1565c0',
            color: 'white',
            borderRadius: '4px',
            fontSize: '11px'
          }}>?</kbd> để mở/đóng bảng này
          </span>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
