import React from 'react';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Xác nhận', 
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'warning' // 'warning', 'danger', 'info'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'danger':
        return '🚫';
      case 'info':
        return 'ℹ️';
      default:
        return '❔';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'warning':
        return '#ffc107';
      case 'danger':
        return '#dc3545';
      case 'info':
        return '#17a2b8';
      default:
        return '#6c757d';
    }
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      width: '90%',
      maxWidth: '500px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      position: 'relative'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '15px',
      color: getColor()
    },
    title: {
      margin: 0,
      fontSize: '1.25rem',
      fontWeight: 'bold'
    },
    message: {
      marginBottom: '20px',
      color: '#666',
      lineHeight: 1.5
    },
    buttonContainer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px'
    },
    button: {
      padding: '8px 16px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: 500,
      transition: 'all 0.2s'
    },
    confirmButton: {
      backgroundColor: getColor(),
      color: 'white',
      '&:hover': {
        opacity: 0.9
      }
    },
    cancelButton: {
      backgroundColor: '#e9ecef',
      color: '#212529',
      '&:hover': {
        backgroundColor: '#dee2e6'
      }
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={{ fontSize: '24px' }}>{getIcon()}</span>
          <h3 style={styles.title}>{title}</h3>
        </div>
        
        <div style={styles.message}>
          {message}
        </div>

        <div style={styles.buttonContainer}>
          <button
            type="button"
            data-testid="confirm-cancel-btn"
            onClick={onClose}
            style={{ ...styles.button, ...styles.cancelButton }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            data-testid="confirm-btn"
            onClick={onConfirm}
            style={{ ...styles.button, ...styles.confirmButton }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
