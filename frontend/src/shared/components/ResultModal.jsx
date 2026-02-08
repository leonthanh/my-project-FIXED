import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const getBandColor = (band) => {
  if (band >= 8) return '#16a34a'; // green
  if (band >= 7) return '#06b6d4'; // cyan
  if (band >= 6) return '#f59e0b'; // amber
  if (band >= 5) return '#f97316'; // orange
  return '#6b7280'; // gray
};

const ResultModal = ({ isOpen, onClose, result, onViewDetails, title = 'Reading — Kết quả' }) => {
  const { isDarkMode } = useTheme();

  if (!isOpen || !result) return null;
  const modalBg = isDarkMode ? '#111827' : '#fff';
  const overlayBg = isDarkMode ? 'rgba(2,6,23,0.7)' : 'rgba(0,0,0,0.45)';
  const textColor = isDarkMode ? '#e5e7eb' : '#0e276f';
  const surface = isDarkMode ? '#1f2b47' : '#f3f4f6';
  const muted = isDarkMode ? '#94a3b8' : '#6b7280';
  const footerBg = isDarkMode ? '#0f172a' : '#ffffffff';
  const btnPrimaryBg = isDarkMode ? '#1f2b47' : '#e03';
  const btnSecondaryBg = isDarkMode ? '#0b1d2e' : '#eef2ff';
  const btnSecondaryColor = isDarkMode ? '#cbd5f5' : '#0c4a6e';

  const { total, correct, scorePercentage, band } = result;
  const pct = scorePercentage || (total > 0 ? Math.round((correct / total) * 100) : 0);

  const numericBand = (band != null && Number.isFinite(Number(band))) ? Number(band) : 0;
  const formattedBand = (band != null && Number.isFinite(Number(band))) ? Number(band).toFixed(1) : 'N/A';

  const color = getBandColor(numericBand || 0);

  return (
    <div role="dialog" aria-modal="true" className="result-modal-overlay" onClick={onClose}>
      <div className="result-modal" style={{ color: textColor }} onClick={(e) => e.stopPropagation()}>
        <header className="result-modal-header">
          <h2>{title}</h2>
          <button type="button" aria-label="close" className="close-btn" onClick={onClose}>✕</button>
        </header>

        <div className="result-modal-body">
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: surface, display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{correct}/{total}</div>
                <div style={{ fontSize: 12, color: muted }}>Correct</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{pct}%</div>
              <div style={{ marginTop: 6 }}>
                <span style={{ padding: '6px 10px', background: color, color: '#fff', borderRadius: 8, fontWeight: 700 }} data-testid="result-band">Band {formattedBand}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <p style={{ color: isDarkMode ? '#7dd3fc' : '#06c' }}><strong>Chi tiết:</strong></p>
            <ul>
              <li>Total questions: {total}</li>
              <li>Correct: {correct}</li>
              <li>Score percentage: {pct}%</li>
              {result && result.submissionId && <li>Submission ID: <strong>{result.submissionId}</strong></li>}
            </ul>
          </div>
        </div>

        <footer className="result-modal-footer">
          {/* The "View details" button removed from student modal; teachers can use the admin View page */}
          <button type="button" onClick={onClose} className="btn btn-primary">Đóng</button>
        </footer>

        <style>{`
          .result-modal-overlay { position: fixed; inset: 0; background: ${overlayBg}; display:flex; align-items:center; justify-content:center; z-index:10000 }
          .result-modal { width: 600px; background: ${modalBg}; border-radius: 10px; padding: 18px; box-shadow: 0 8px 30px rgba(0,0,0,0.35) }
          .result-modal-header { display:flex; justify-content:space-between; align-items:center }
          .close-btn { background: transparent; border: none; font-size:18px; cursor:pointer; color: ${textColor} }
          .result-modal-body { padding-top: 12px }
          .result-modal-footer { display:flex; padding: 0; background: ${footerBg}; min-height: 12px }
          .btn { padding: 8px 12px; border-radius: 8px; cursor:pointer }
          .btn-primary { background: ${btnPrimaryBg}; color: #fff; border: none }
          .btn-secondary { background: ${btnSecondaryBg}; color: ${btnSecondaryColor}; border: none }
        `}</style>
      </div>
    </div>
  );
};

export default ResultModal;
