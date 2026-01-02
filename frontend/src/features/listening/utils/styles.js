/**
 * Shared Styles for Listening Test Editor
 * Các styles dùng chung cho CreateListeningTest và EditListeningTest
 */

// Theme colors - Audio/Listening focused
export const colors = {
  primaryPurple: '#7c3aed',    // Main listening color
  partBlue: '#2563eb',         // Parts column
  audioGreen: '#059669',       // Audio/Content column  
  sectionOrange: '#ea580c',    // Sections column
  questionYellow: '#d97706',   // Questions column
  dangerRed: '#dc2626',
  successGreen: '#16a34a',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  white: '#ffffff',
  black: '#111827'
};

// Input style
export const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  marginBottom: '12px',
  fontSize: '14px',
  borderRadius: '8px',
  border: '2px solid #e5e7eb',
  backgroundColor: colors.white,
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

// Compact input style
export const compactInputStyle = {
  ...inputStyle,
  padding: '8px 10px',
  fontSize: '13px',
  marginBottom: 0,
  border: '1px solid #d1d5db',
  borderRadius: '6px',
};

// Modal styles
export const modalStyles = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
};

export const modalContentStyles = {
  backgroundColor: 'white',
  padding: '24px',
  borderRadius: '12px',
  width: '85%',
  maxWidth: '900px',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

export const modalHeaderStyles = {
  backgroundColor: colors.primaryPurple,
  color: colors.white,
  padding: '16px 20px',
  borderRadius: '12px 12px 0 0',
  margin: '-24px -24px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

// Button styles
export const buttonBase = {
  border: 'none',
  padding: '10px 18px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px',
  transition: 'all 0.2s ease',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};

export const primaryButtonStyle = {
  ...buttonBase,
  backgroundColor: colors.primaryPurple,
  color: colors.white,
  boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.3)',
};

export const successButtonStyle = {
  ...buttonBase,
  backgroundColor: colors.successGreen,
  color: colors.white,
};

export const dangerButtonStyle = {
  ...buttonBase,
  backgroundColor: colors.dangerRed,
  color: colors.white,
};

export const secondaryButtonStyle = {
  ...buttonBase,
  backgroundColor: colors.lightGray,
  color: colors.black,
  border: '1px solid #d1d5db',
};

// Column header styles
export const columnHeaderStyle = (bgColor, textColor = 'white') => ({
  padding: '12px 14px',
  borderBottom: `3px solid ${bgColor}`,
  backgroundColor: bgColor,
  color: textColor,
  fontWeight: 700,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  fontSize: '13px',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
});

// Part/Section item style
export const itemStyle = (isSelected, selectedColor = colors.partBlue) => ({
  padding: '10px 12px',
  marginBottom: '8px',
  backgroundColor: isSelected ? selectedColor : colors.white,
  color: isSelected ? colors.white : colors.black,
  border: isSelected ? 'none' : '1px solid #e5e7eb',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: isSelected ? 600 : 400,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  transition: 'all 0.15s ease',
  boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
});

// Delete button style (small)
export const deleteButtonSmallStyle = {
  padding: '4px 8px',
  backgroundColor: colors.dangerRed,
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  marginLeft: '8px',
  opacity: 0.9,
};

// Add button style
export const addButtonStyle = (bgColor = colors.successGreen) => ({
  width: '100%',
  padding: '12px',
  backgroundColor: bgColor,
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 600,
  marginTop: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  transition: 'all 0.2s ease',
});

// Resize divider style
export const resizeDividerStyle = (isActive) => ({
  width: '6px',
  backgroundColor: isActive ? colors.primaryPurple : 'transparent',
  cursor: 'col-resize',
  flexShrink: 0,
  transition: 'background-color 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

// Audio upload box style
export const audioUploadStyle = {
  border: '2px dashed #d1d5db',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center',
  backgroundColor: '#f9fafb',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

export const audioUploadActiveStyle = {
  ...audioUploadStyle,
  borderColor: colors.audioGreen,
  backgroundColor: '#ecfdf5',
};

// Audio player style
export const audioPlayerStyle = {
  width: '100%',
  borderRadius: '8px',
  marginTop: '12px',
};

// Part type badge
export const partTypeBadgeStyle = (color = colors.primaryPurple) => ({
  display: 'inline-block',
  padding: '4px 10px',
  backgroundColor: `${color}15`,
  color: color,
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
});

// CSS for compact interface
export const compactCSS = (className) => `
  /* Base Typography */
  .${className} {
    font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: ${colors.black};
  }

  /* Headings */
  .${className} h2 { font-size: 20px !important; font-weight: 700; }
  .${className} h3 { font-size: 16px !important; font-weight: 600; }
  .${className} h4 { font-size: 15px !important; font-weight: 600; }

  /* Labels */
  .${className} label {
    font-size: 13px !important;
    font-weight: 600;
    color: ${colors.gray};
    margin-bottom: 6px;
    display: block;
  }

  /* Form Elements */
  .${className} input, 
  .${className} select, 
  .${className} textarea {
    font-size: 14px !important;
    padding: 10px 12px !important;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  .${className} input:focus, 
  .${className} select:focus, 
  .${className} textarea:focus {
    outline: none;
    border-color: ${colors.primaryPurple};
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }

  /* Buttons */
  .${className} button {
    font-size: 13px !important;
    font-weight: 600;
  }
  
  .${className} button:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.05);
  }
  
  .${className} button:active:not(:disabled) {
    transform: translateY(0);
  }

  /* Audio Player Custom */
  .${className} audio {
    width: 100%;
    border-radius: 8px;
    outline: none;
  }
  
  .${className} audio::-webkit-media-controls-panel {
    background: linear-gradient(135deg, ${colors.audioGreen}10, ${colors.primaryPurple}10);
  }

  /* Scrollbar */
  .${className} ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .${className} ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  .${className} ::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  
  .${className} ::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
  }

  /* Question Type Cards */
  .${className} .question-type-card {
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    background: white;
    transition: all 0.2s ease;
  }
  
  .${className} .question-type-card:hover {
    border-color: ${colors.primaryPurple};
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1);
  }

  /* Part Cards */
  .${className} .part-card {
    position: relative;
    overflow: hidden;
  }
  
  .${className} .part-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: ${colors.partBlue};
  }

  /* Section indicator */
  .${className} .section-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: ${colors.sectionOrange}10;
    border-radius: 8px;
    margin-bottom: 12px;
  }
`;
