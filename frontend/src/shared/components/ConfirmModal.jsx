import React from 'react';
import LineIcon from './LineIcon.jsx';
import { useTheme } from '../contexts/ThemeContext';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm action', 
  message = 'Are you sure you want to continue?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  iconName,
  extraContent,
  hideCancel = false,
}) => {
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  const getTone = () => {
    switch (type) {
      case 'warning':
        return {
          icon: 'clock',
          accent: '#f59e0b',
          hero: 'linear-gradient(135deg, #b45309 0%, #d97706 55%, #f59e0b 100%)',
          text: isDarkMode ? '#fde68a' : '#92400e',
          surface: isDarkMode ? '#2a1f0f' : '#fff7ed',
          border: isDarkMode ? '#92400e' : '#fdba74',
        };
      case 'danger':
        return {
          icon: 'error',
          accent: '#dc2626',
          hero: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 55%, #ef4444 100%)',
          text: isDarkMode ? '#fecaca' : '#991b1b',
          surface: isDarkMode ? '#2a1515' : '#fef2f2',
          border: isDarkMode ? '#7f1d1d' : '#fecaca',
        };
      case 'info':
        return {
          icon: 'review',
          accent: '#0284c7',
          hero: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 55%, #0ea5e9 100%)',
          text: isDarkMode ? '#bae6fd' : '#0c4a6e',
          surface: isDarkMode ? '#10243b' : '#eff6ff',
          border: isDarkMode ? '#1d4ed8' : '#bfdbfe',
        };
      default:
        return {
          icon: 'review',
          accent: '#64748b',
          hero: 'linear-gradient(135deg, #334155 0%, #475569 55%, #64748b 100%)',
          text: isDarkMode ? '#cbd5e1' : '#334155',
          surface: isDarkMode ? '#1e293b' : '#f8fafc',
          border: isDarkMode ? '#475569' : '#cbd5e1',
        };
    }
  };

  const tone = getTone();
  const modalBg = isDarkMode ? '#111827' : '#fff';
  const textColor = isDarkMode ? '#e5e7eb' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#475569';
  const secondaryBg = isDarkMode ? '#0f172a' : '#fff';
  const secondaryBorder = isDarkMode ? '#334155' : '#e2e8f0';
  const secondaryText = isDarkMode ? '#cbd5e1' : '#475569';

  const styles = {
    overlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: isDarkMode ? 'rgba(2, 6, 23, 0.72)' : 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
      padding: '16px',
    },
    modal: {
      backgroundColor: modalBg,
      borderRadius: '20px',
      overflow: 'hidden',
      width: '90%',
      maxWidth: '500px',
      boxShadow: '0 24px 48px rgba(15, 23, 42, 0.35)',
      position: 'relative',
    },
    hero: {
      background: tone.hero,
      padding: '22px 24px 18px',
      position: 'relative',
      overflow: 'hidden',
    },
    heroOrb: {
      position: 'absolute',
      top: -36,
      right: -36,
      width: 136,
      height: 136,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.07)',
      pointerEvents: 'none',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      color: '#fff',
      position: 'relative',
      zIndex: 1,
    },
    title: {
      margin: 0,
      fontSize: '1.25rem',
      fontWeight: 'bold',
    },
    body: {
      padding: '20px 24px 22px',
    },
    message: {
      marginBottom: extraContent ? '14px' : '20px',
      color: mutedColor,
      lineHeight: 1.6,
      fontSize: '14px',
    },
    buttonContainer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      flexWrap: 'wrap',
      marginTop: '20px',
    },
    button: {
      padding: '10px 18px',
      borderRadius: '999px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: 500,
      transition: 'all 0.2s',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
    },
    confirmButton: {
      background: tone.hero,
      color: 'white',
      boxShadow: `0 4px 14px ${tone.accent}55`,
    },
    cancelButton: {
      backgroundColor: secondaryBg,
      color: secondaryText,
      border: `1.5px solid ${secondaryBorder}`,
    },
    extraBox: {
      background: tone.surface,
      border: `1px solid ${tone.border}`,
      borderRadius: '12px',
      padding: '14px 16px',
      color: tone.text,
      fontSize: '13px',
      lineHeight: 1.5,
    },
    closeButton: {
      position: 'absolute',
      top: '14px',
      right: '16px',
      width: '32px',
      height: '32px',
      borderRadius: '999px',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      background: 'rgba(255,255,255,0.18)',
      color: '#fff',
      zIndex: 1,
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {onClose ? (
          <button type="button" aria-label="Close" onClick={onClose} style={styles.closeButton}>
            <LineIcon name="close" size={16} strokeWidth={2.2} />
          </button>
        ) : null}

        <div style={styles.hero}>
          <div style={styles.heroOrb} />
          <div style={styles.header}>
            <span
              style={{
                width: '42px',
                height: '42px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.18)',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <LineIcon name={iconName || tone.icon} size={22} strokeWidth={2.1} />
            </span>
            <h3 style={styles.title}>{title}</h3>
          </div>
        </div>

        <div style={styles.body}>
          <div style={styles.message}>
          {message}
          </div>

          {extraContent ? <div style={styles.extraBox}>{extraContent}</div> : null}

          <div style={styles.buttonContainer}>
            {!hideCancel && onClose ? (
              <button
                type="button"
                data-testid="confirm-cancel-btn"
                onClick={onClose}
                style={{ ...styles.button, ...styles.cancelButton }}
              >
                <LineIcon name="close" size={16} strokeWidth={2.2} />
                {cancelText}
              </button>
            ) : null}
            <button
              type="button"
              data-testid="confirm-btn"
              onClick={onConfirm}
              style={{ ...styles.button, ...styles.confirmButton }}
            >
              <LineIcon name={iconName || tone.icon} size={16} strokeWidth={2.2} />
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
