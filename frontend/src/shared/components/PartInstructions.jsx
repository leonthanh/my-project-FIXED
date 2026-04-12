import React from 'react';
import CustomEditor from './CustomEditor';
import InlineIcon from './InlineIcon.jsx';

const PartInstructions = ({ partNumber, value, onChange }) => {

  return (
    <div style={{ marginBottom: '20px', border: '1px solid #eee', borderRadius: '4px', padding: '10px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', fontWeight: 'bold' }}>
        <InlineIcon name="writing" size={14} />
        Hướng dẫn cho Part {partNumber}:
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
