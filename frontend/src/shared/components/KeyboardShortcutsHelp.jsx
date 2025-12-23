import React from 'react';

/**
 * KeyboardShortcutsHelp - Hiển thị danh sách keyboard shortcuts
 */

const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + S', action: 'Lưu / Review đề thi', icon: '💾' },
    { key: 'Ctrl + N', action: 'Thêm câu hỏi mới', icon: '➕' },
    { key: 'Ctrl + P', action: 'Xem trước đề thi (Preview)', icon: '👁' },
    { key: 'Ctrl + D', action: 'Chuyển Dark/Light mode', icon: '🌓' },
    { key: 'Esc', action: 'Đóng modal/popup', icon: '✖️' }
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
            ⌨️ Keyboard Shortcuts
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
            ×
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
              <span style={{ fontSize: '20px' }}>{shortcut.icon}</span>
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
          💡 Nhấn <kbd style={{ 
            padding: '2px 6px', 
            backgroundColor: '#1565c0',
            color: 'white',
            borderRadius: '4px',
            fontSize: '11px'
          }}>?</kbd> để mở/đóng bảng này
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
