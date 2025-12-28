import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';

const ReadingResults = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const navResult = location.state && location.state.result;

  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState([]);
  const [meta, setMeta] = useState(null);
  const API = process.env.REACT_APP_API_URL;

  useEffect(() => {
    // If navigation provided result, show summary only; otherwise fetch compare details for submission id
    if (navResult) return setMeta(navResult);

    const fetchCompare = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/reading-submissions/${id}/compare`);
        if (!res.ok) throw new Error('Không thể tải dữ liệu');
        const data = await res.json();
        setDetails(data.details || []);
        setMeta({ submissionId: data.submissionId });
      } catch (err) {
        console.error('Error fetching compare:', err);
        setDetails([]);
        setMeta(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCompare();
  }, [id, API, navResult]);

  if (loading) return <p style={{ padding: 20 }}>⏳ Đang tải chi tiết chấm...</p>;

  // If navigation provided result summary, show summary
  if (navResult && !details.length) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Reading Results — Test {id}</h2>
        <p><strong>Total questions:</strong> {navResult.total}</p>
        <p><strong>Correct:</strong> {navResult.correct}</p>
        <p><strong>Score percentage:</strong> {navResult.scorePercentage}%</p>
        <p><strong>IELTS Band:</strong> {navResult.band}</p>
        <p><button onClick={() => navigate(-1)}>Quay lại</button></p>
      </div>
    );
  }

  if (!details.length) return (
    <div style={{ padding: 24 }}>
      <h3>Không có chi tiết chấm</h3>
      <p>Submission ID: {id}</p>
      <p><Link to="/">Quay lại</Link></p>
    </div>
  );

  return (
    <div style={{ padding: 18, fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <h2>Chi tiết chấm — Submission #{id}</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#0e276f', color: 'white' }}>
            <th style={{ padding: 8, border: '1px solid #ddd' }}>Q</th>
            <th style={{ padding: 8, border: '1px solid #ddd' }}>Paragraph</th>
            <th style={{ padding: 8, border: '1px solid #ddd' }}>Expected (raw)</th>
            <th style={{ padding: 8, border: '1px solid #ddd' }}>Expected Label</th>
            <th style={{ padding: 8, border: '1px solid #ddd' }}>Student (raw)</th>
            <th style={{ padding: 8, border: '1px solid #ddd' }}>Student Label</th>
            <th style={{ padding: 8, border: '1px solid #ddd' }}>Result</th>
          </tr>
        </thead>
        <tbody>
          {details.map((r, idx) => (
            <tr key={idx} style={{ background: r.isCorrect ? '#e6f4ea' : '#ffe6e6' }}>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{r.questionNumber}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{r.paragraphId || '-'}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{r.expected}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{r.expectedLabel}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{r.student}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{r.studentLabel}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{r.isCorrect ? '✓' : '✕'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 18 }}>
        <Link to="/">Quay lại</Link>
      </div>
    </div>
  );
};

export default ReadingResults;
