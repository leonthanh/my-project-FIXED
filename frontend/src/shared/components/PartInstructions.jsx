import React from 'react';
import CustomEditor from './CustomEditor';

const PartInstructions = ({ partNumber, value, onChange }) => {

  return (
    <div style={{ marginBottom: '20px', border: '1px solid #eee', borderRadius: '4px', padding: '10px' }}>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
        📝 Hướng dẫn cho Part {partNumber}:
      </label>
      <CustomEditor
        value={value}
        onChange={onChange}
        placeholder={`Nhập hướng dẫn cho Part ${partNumber}`}
      />
    </div>
  );
};

export default PartInstructions;
