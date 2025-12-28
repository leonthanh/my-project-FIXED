import React from 'react';

const getBandColor = (band) => {
  if (band >= 8) return '#16a34a'; // green
  if (band >= 7) return '#06b6d4'; // cyan
  if (band >= 6) return '#f59e0b'; // amber
  if (band >= 5) return '#f97316'; // orange
  return '#6b7280'; // gray
};

const ResultModal = ({ isOpen, onClose, result, onViewDetails }) => {
  if (!isOpen || !result) return null;

  const { total, correct, scorePercentage, band } = result;
  const pct = scorePercentage || (total > 0 ? Math.round((correct / total) * 100) : 0);

  const numericBand = (band != null && Number.isFinite(Number(band))) ? Number(band) : 0;
  const formattedBand = (band != null && Number.isFinite(Number(band))) ? Number(band).toFixed(1) : 'N/A';

  const color = getBandColor(numericBand || 0);

  return (
    <div role="dialog" aria-modal="true" className="result-modal-overlay" onClick={onClose}>
      <div className="result-modal" onClick={(e) => e.stopPropagation()}>
        <header className="result-modal-header">
          <h2>Reading — Kết quả</h2>
          <button type="button" aria-label="close" className="close-btn" onClick={onClose}>✕</button>
        </header>

        <div className="result-modal-body">
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#f3f4f6', display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{correct}/{total}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Correct</div>
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
            <p style={{ color: '#374151' }}><strong>Chi tiết:</strong></p>
            <ul>
              <li>Total questions: {total}</li>
              <li>Correct: {correct}</li>
              <li>Score percentage: {pct}%</li>
              {result && result.submissionId && <li>Submission ID: <strong>{result.submissionId}</strong></li>}
            </ul>
          </div>
        </div>

        <footer className="result-modal-footer">
          {/* Show detail button only to teachers */}
          {(() => {
            try {
              const user = JSON.parse(localStorage.getItem('user') || 'null');
              if (user && user.role === 'teacher') {
                return <button type="button" onClick={onViewDetails} className="btn btn-secondary">Xem chi tiết</button>;
              }
            } catch (e) {
              // ignore
            }
            return null;
          })()}

          <button type="button" onClick={onClose} className="btn btn-primary">Đóng</button>
        </footer>

        <style jsx>{`
          .result-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:10000 }
          .result-modal { width: 600px; background: #fff; border-radius: 10px; padding: 18px; box-shadow: 0 8px 30px rgba(0,0,0,0.15) }
          .result-modal-header { display:flex; justify-content:space-between; align-items:center }
          .close-btn { background: transparent; border: none; font-size:18px; cursor:pointer }
          .result-modal-body { padding-top: 12px }
          .result-modal-footer { display:flex; gap: 12px; justify-content:flex-end; margin-top: 18px }
          .btn { padding: 8px 12px; border-radius: 8px; cursor:pointer }
          .btn-primary { background: #1f6feb; color: #fff; border: none }
          .btn-secondary { background: #eef2ff; color: #0c4a6e; border: none }
        `}</style>
      </div>
    </div>
  );
};

export default ResultModal;
