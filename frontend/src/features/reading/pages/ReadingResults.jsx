import React from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';

const ReadingResults = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state && location.state.result;

  if (!result) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Không có kết quả</h2>
        <p>Không tìm thấy kết quả. Có thể bạn vừa nộp bài và trang này được mở từ state navigation.</p>
        <button onClick={() => navigate(-1)}>Quay lại</button>
      </div>
    );
  }

  return (
    <div className="reading-results" style={{ padding: 20 }}>
      <h2>Reading Results — Test {id}</h2>
      <div style={{ marginTop: 12 }}>
        <p><strong>Total questions:</strong> <span data-testid="result-total">{result.total}</span></p>
        <p><strong>Correct:</strong> <span data-testid="result-correct">{result.correct}</span></p>
        <p><strong>Score percentage:</strong> <span data-testid="result-percentage">{result.scorePercentage}%</span></p>
        <p><strong>IELTS Band (IDP mapping):</strong> <span data-testid="result-band">{result.band}</span></p>
      </div>

      <div style={{ marginTop: 18 }}>
        <button onClick={() => navigate('/select-test')}>Quay về chọn đề</button>
      </div>
    </div>
  );
};

export default ReadingResults;
