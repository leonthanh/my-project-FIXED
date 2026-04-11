import React, { useState, useEffect } from 'react';

/**
 * AutoSaveIndicator - Hiển thị trạng thái tự động lưu
 * 
 * Props:
 * - lastSaved: Date object của lần lưu gần nhất
 * - isSaving: boolean - đang lưu hay không
 * - error: string - lỗi nếu có
 */

const AutoSaveIndicator = ({ lastSaved, isSaving = false, error = null }) => {
  const [timeAgo, setTimeAgo] = useState('');
  const [showNotification, setShowNotification] = useState(false);

  // Update time ago every 10 seconds
  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastSaved) return;
      
      const now = new Date();
      const diff = Math.floor((now - lastSaved) / 1000);
      
      if (diff < 10) {
        setTimeAgo('vừa xong');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
      } else if (diff < 60) {
        setTimeAgo(`${diff} giây trước`);
      } else if (diff < 3600) {
        setTimeAgo(`${Math.floor(diff / 60)} phút trước`);
      } else {
        setTimeAgo(`${Math.floor(diff / 3600)} giờ trước`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  // Notification popup when just saved
  const notificationStyle = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    zIndex: 9999,
    animation: 'slideIn 0.3s ease',
    fontSize: '14px',
    fontWeight: '600'
  };

  const indicatorStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: error ? '#ffe6e6' : isSaving ? '#fff3e0' : '#e8f5e9',
    color: error ? '#dc3545' : isSaving ? '#f57c00' : '#388e3c',
    border: `1px solid ${error ? '#dc3545' : isSaving ? '#ff9800' : '#4caf50'}`
  };

  return (
    <>
      {/* Inline indicator */}
      <div style={indicatorStyle}>
        {isSaving ? (
          <>
            <span style={{ 
              display: 'inline-block', 
              animation: 'spin 1s linear infinite',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
            }} />
            <span>Đang lưu...</span>
          </>
        ) : error ? (
          <>
            <span>Lỗi lưu</span>
          </>
        ) : lastSaved ? (
          <>
            <span>Đã lưu {timeAgo}</span>
          </>
        ) : (
          <>
            <span>Chưa lưu</span>
          </>
        )}
      </div>

      {/* Popup notification */}
      {showNotification && (
        <div style={notificationStyle}>
          <span>Đã lưu tự động</span>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default AutoSaveIndicator;
