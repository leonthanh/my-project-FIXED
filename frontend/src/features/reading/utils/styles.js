/**
 * Shared Styles for Reading Test Editor
 * Các styles dùng chung cho CreateReadingTest và EditReadingTest
 */

// Theme colors
export const colors = {
  primaryBlue: '#0e276f',
  dangerRed: '#e03',
  successGreen: '#28a745',
  warningYellow: '#ffc107',
  sectionRed: '#ff6b6b',
  gray: '#6c757d',
  lightGray: '#f5f5f5',
  white: '#fff',
  black: '#000'
};

// Input style
export const inputStyle = {
  width: '100%',
  padding: '12px',
  marginBottom: '15px',
  fontSize: '16px',
  borderRadius: '6px',
  border: `2px solid ${colors.primaryBlue}`,
  backgroundColor: colors.white,
  cursor: 'text',
  boxSizing: 'border-box',
  position: 'relative',
  zIndex: 5,
  transition: 'border-color 0.2s'
};

// Compact input style
export const compactInputStyle = {
  ...inputStyle,
  padding: '6px',
  fontSize: '12px',
  marginBottom: 0,
  border: '1px solid #ccc'
};

// Modal styles
export const modalStyles = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

export const modalContentStyles = {
  backgroundColor: 'white',
  padding: '20px',
  borderRadius: '8px',
  width: '80%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
};

export const modalHeaderStyles = {
  backgroundColor: colors.primaryBlue,
  color: colors.white,
  padding: '12px 16px',
  borderRadius: '6px 6px 0 0',
  margin: '-20px -20px 12px',
};

// Button styles
export const confirmButtonStyle = {
  backgroundColor: colors.primaryBlue,
  border: 'none',
  color: colors.white,
  padding: '10px 16px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  boxShadow: '0 2px 6px rgba(14,39,111,0.25)',
  transition: 'filter 120ms ease',
};

export const backButtonStyle = {
  backgroundColor: colors.dangerRed,
  border: 'none',
  color: colors.white,
  padding: '10px 16px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  boxShadow: '0 2px 6px rgba(224,3,51,0.25)',
  transition: 'filter 120ms ease',
};

export const primaryButtonStyle = {
  padding: '10px 20px',
  fontSize: '14px',
  backgroundColor: colors.primaryBlue,
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'all 0.2s ease'
};

export const dangerButtonStyle = {
  ...primaryButtonStyle,
  backgroundColor: colors.dangerRed,
};

export const successButtonStyle = {
  ...primaryButtonStyle,
  backgroundColor: colors.successGreen,
};

export const grayButtonStyle = {
  ...primaryButtonStyle,
  backgroundColor: colors.gray,
};

// Column header styles
export const columnHeaderStyle = (bgColor, textColor = 'white') => ({
  padding: '8px 10px',
  borderBottom: `2px solid ${bgColor}`,
  backgroundColor: bgColor,
  color: textColor,
  fontWeight: 'bold',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  minHeight: 'auto',
  fontSize: '12px'
});

// Column container style
export const columnContainerStyle = (isResizing) => ({
  backgroundColor: colors.lightGray,
  borderRight: '1px solid #ddd',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
  transition: isResizing ? 'none' : 'width 0.3s ease'
});

// Passage/Section item style
export const itemStyle = (isSelected, selectedColor = colors.primaryBlue) => ({
  padding: '8px',
  marginBottom: '6px',
  backgroundColor: isSelected ? selectedColor : colors.white,
  color: isSelected ? colors.white : colors.black,
  border: '1px solid #ccc',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: isSelected ? 'bold' : 'normal',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
});

// Delete button style (small)
export const deleteButtonSmallStyle = {
  padding: '4px 8px',
  backgroundColor: '#dc3545',
  color: 'white',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
  marginLeft: '8px'
};

// Add button style
export const addButtonStyle = (bgColor = colors.successGreen) => ({
  width: '100%',
  padding: '10px',
  backgroundColor: bgColor,
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold',
  marginTop: '10px'
});

// Resize divider style
export const resizeDividerStyle = (isActive) => ({
  width: '6px',
  backgroundColor: isActive ? colors.primaryBlue : 'transparent',
  cursor: 'col-resize',
  flexShrink: 0,
  transition: 'background-color 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
});

// CSS for compact interface - Đồng bộ font-size toàn bộ
export const compactCSS = (className) => `
  /* Base Typography - Đồng bộ font-size */
  .${className} {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  /* Headings */
  .${className} h2 {
    font-size: 20px !important;
    font-weight: 600;
  }
  .${className} h3 {
    font-size: 16px !important;
    font-weight: 600;
  }
  .${className} h4 {
    font-size: 15px !important;
    font-weight: 600;
  }
  .${className} h5 {
    font-size: 14px !important;
    font-weight: 600;
  }
  .${className} h6 {
    font-size: 13px !important;
    font-weight: 600;
  }

  /* Labels */
  .${className} label {
    font-size: 13px !important;
    font-weight: 600;
    margin-bottom: 6px;
  }

  /* Form Elements */
  .${className} input, 
  .${className} select, 
  .${className} textarea {
    font-size: 14px !important;
    padding: 10px 12px !important;
    border-radius: 6px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  .${className} input:focus, 
  .${className} select:focus, 
  .${className} textarea:focus {
    outline: none;
    border-color: #0e276f;
    box-shadow: 0 0 0 3px rgba(14, 39, 111, 0.1);
  }

  /* Buttons */
  .${className} button {
    font-size: 13px !important;
    font-weight: 600;
    padding: 10px 16px !important;
    border-radius: 6px;
    transition: all 0.2s ease;
  }
  
  .${className} button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  /* Small text */
  .${className} small,
  .${className} .text-muted {
    font-size: 12px !important;
    color: #666;
  }

  /* Paragraphs */
  .${className} p {
    font-size: 14px;
    line-height: 1.6;
  }

  /* Quill Editor */
  .${className} .quill .ql-editor {
    font-size: 14px !important;
    font-family: inherit !important;
    line-height: 1.6;
    min-height: 120px;
  }
  .${className} .quill .ql-editor p {
    font-size: 14px !important;
  }
`;
