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

  .${className} .listening-editor-workspace {
    background:
      radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 28%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.36) 0%, rgba(248, 250, 252, 0.94) 100%);
  }

  .${className} .listening-editor-sidebar {
    background: linear-gradient(180deg, #13233f 0%, #1f2f49 46%, #172033 100%) !important;
    box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.05);
  }

  .${className} .listening-editor-sidebar-block-header {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(15, 23, 42, 0.08) 100%);
  }

  .${className} .listening-editor-sidebar-block-label {
    color: #b7c6da !important;
    letter-spacing: 0.12em !important;
  }

  .${className} .listening-editor-sidebar-toggle {
    background: rgba(255, 255, 255, 0.08) !important;
    border-color: rgba(148, 163, 184, 0.32) !important;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
  }

  .${className} .listening-editor-sidebar-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
  }

  .${className} .listening-editor-nav-card {
    background: linear-gradient(180deg, rgba(71, 85, 105, 0.98) 0%, rgba(51, 65, 85, 0.96) 100%) !important;
    border: 1px solid rgba(148, 163, 184, 0.14) !important;
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);
  }

  .${className} .listening-editor-nav-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 28px rgba(15, 23, 42, 0.18);
  }

  .${className} .listening-editor-nav-card-part.is-active {
    background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%) !important;
    border-color: rgba(191, 219, 254, 0.72) !important;
  }

  .${className} .listening-editor-nav-card-section.is-active {
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%) !important;
    border-color: rgba(196, 181, 253, 0.72) !important;
  }

  .${className} .listening-editor-nav-card-subtitle {
    color: #dbe7f5 !important;
  }

  .${className} .listening-editor-nav-card-meta {
    color: #a9b9ce !important;
  }

  .${className} .listening-editor-delete-icon-btn {
    backdrop-filter: blur(12px);
    box-shadow: inset 0 0 0 1px rgba(252, 165, 165, 0.14);
  }

  .${className} .listening-editor-sidebar-action {
    border-radius: 12px !important;
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.18);
    letter-spacing: 0.01em;
  }

  .${className} .listening-editor-sidebar-action-part {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
  }

  .${className} .listening-editor-sidebar-action-section {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important;
  }

  .${className} .listening-editor-main {
    padding: 10px 12px 12px;
    box-sizing: border-box;
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.4) 0%, rgba(255, 255, 255, 0.78) 100%);
  }

  .${className} .listening-editor-panel {
    background: rgba(255, 255, 255, 0.82) !important;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 18px !important;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
    overflow: hidden !important;
  }

  .${className} .listening-editor-panel-header {
    padding: 8px 14px !important;
    min-height: 42px;
    box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.12), 0 10px 22px rgba(15, 23, 42, 0.08);
  }

  .${className} .listening-editor-panel-header-audio {
    background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%) !important;
  }

  .${className} .listening-editor-panel-header-questions {
    background: linear-gradient(135deg, #4338ca 0%, #7c3aed 100%) !important;
  }

  .${className} .listening-editor-panel-title {
    font-size: 12px;
    letter-spacing: -0.01em;
  }

  .${className} .listening-editor-panel-toggle {
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.16);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  }

  .${className} .listening-editor-panel-body {
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 250, 252, 0.98) 100%),
      linear-gradient(90deg, rgba(226, 232, 240, 0.45) 1px, transparent 1px);
  }

  .${className} .listening-editor-content-card {
    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    border: 1px solid rgba(37, 99, 235, 0.18);
    border-radius: 18px;
    padding: 20px;
    box-shadow: 0 20px 44px rgba(29, 78, 216, 0.1);
  }

  .${className} .listening-editor-audio-dropzone {
    border-radius: 16px !important;
    background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%) !important;
    border-color: rgba(191, 219, 254, 0.95) !important;
    box-shadow: inset 0 0 0 1px rgba(191, 219, 254, 0.28), 0 18px 32px rgba(15, 23, 42, 0.06);
  }

  .${className} .listening-editor-audio-dropzone.is-active,
  .${className} .listening-editor-global-audio.is-active {
    border-color: rgba(20, 184, 166, 0.55) !important;
    background: linear-gradient(180deg, rgba(240, 253, 250, 0.98) 0%, rgba(236, 253, 245, 0.98) 100%) !important;
  }

  .${className} .listening-editor-global-audio {
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    border-color: rgba(148, 163, 184, 0.24) !important;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.96) 100%) !important;
  }

  .${className} .listening-editor-divider {
    position: relative;
    height: 10px !important;
    margin: 4px 14px;
    border-radius: 999px;
    background: transparent !important;
  }

  .${className} .listening-editor-divider::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 118px;
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(20, 184, 166, 0.3) 0%, rgba(99, 102, 241, 0.34) 100%);
    transform: translate(-50%, -50%);
  }

  .${className} .listening-editor-empty-state {
    width: min(430px, 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 28px 30px;
    border-radius: 24px;
    border: 1px dashed #bfdbfe;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(239, 246, 255, 0.98) 100%);
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
    text-align: center;
  }

  .${className} .listening-editor-empty-badge {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #2563eb;
    background: linear-gradient(135deg, rgba(191, 219, 254, 0.7) 0%, rgba(224, 242, 254, 0.92) 100%);
    box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.52);
  }

  .${className} .listening-editor-empty-title {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.02em;
  }

  .${className} .listening-editor-empty-description {
    font-size: 13px;
    line-height: 1.65;
    color: #475569;
    max-width: 320px;
  }

  .${className} .listening-editor-footer-bar {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 100%) !important;
    box-shadow: 0 -14px 30px rgba(15, 23, 42, 0.08) !important;
    backdrop-filter: blur(18px);
  }

  .${className} .listening-editor-secondary-cta {
    border-radius: 14px !important;
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
  }

  .${className} .listening-editor-primary-cta {
    border-radius: 14px !important;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
    box-shadow: 0 18px 32px rgba(37, 99, 235, 0.28) !important;
  }

  .${className} .listening-editor-primary-cta:hover {
    box-shadow: 0 22px 36px rgba(37, 99, 235, 0.34) !important;
  }

  @media (max-width: 768px) {
    .${className} .listening-editor-main {
      padding: 8px;
    }

    .${className} .listening-editor-panel {
      border-radius: 14px !important;
    }

    .${className} .listening-editor-panel-header {
      padding: 8px 12px !important;
      min-height: 40px;
    }

    .${className} .listening-editor-panel-toggle {
      padding: 3px 8px;
    }

    .${className} .listening-editor-divider {
      margin: 4px 10px;
    }
  }
`;
