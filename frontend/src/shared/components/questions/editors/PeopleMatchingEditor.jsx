import React from "react";

/**
 * PeopleMatchingEditor - KET Part 2: Matching People with Texts
 * 
 * Format mẫu Cambridge:
 * - 5 người (A-E): Mỗi người có mô tả ngắn về sở thích/nhu cầu
 * - 8 texts (1-8): Các lựa chọn (quảng cáo, review, mô tả...)
 * - Học sinh nối mỗi người với 1 text phù hợp
 * 
 * VD:
 * Person A: Jo wants to buy some comfortable shoes for running.
 * Text 1: NEW SPORTS WORLD - 50% off all trainers this week!
 * → Jo nối với Text 1
 * 
 * @param {Object} props
 * @param {Object} props.question - Question data
 * @param {Function} props.onChange - Handler khi thay đổi field
 * @param {number} props.startingNumber - Số câu bắt đầu
 */
const PeopleMatchingEditor = ({
  question = {},
  onChange,
  startingNumber = 6, // Part 2 thường bắt đầu từ câu 6
  partIndex = 1, // Default to Part 2 (index 1)
}) => {
  const isNumericId = (id) => typeof id === 'string' && /^\d+$/.test(id.trim());
  const isSingleLetterId = (id) => typeof id === 'string' && /^[A-Z]$/.test(id.trim());

  const getTextDisplayLabel = (text) => {
    const id = String(text?.id || '').trim();
    const content = String(text?.title || text?.content || '').trim();
    return content ? `${id} ${content}`.trim() : id;
  };

  const getNextTextId = (existingTexts) => {
    const ids = (existingTexts || []).map(t => String(t?.id || '').trim()).filter(Boolean);
    const allNumeric = ids.length > 0 && ids.every(isNumericId);
    const allLetters = ids.length > 0 && ids.every(isSingleLetterId);

    if (allLetters) {
      const used = new Set(ids);
      for (let i = 0; i < 26; i++) {
        const candidate = String.fromCharCode(65 + i);
        if (!used.has(candidate)) return candidate;
      }
      return (existingTexts?.length || 0) + 1;
    }

    if (allNumeric) {
      const max = ids.reduce((acc, cur) => Math.max(acc, parseInt(cur, 10)), 0);
      return String(max + 1);
    }

    // Default to letters for Cambridge people-matching
    const used = new Set(ids);
    for (let i = 0; i < 26; i++) {
      const candidate = String.fromCharCode(65 + i);
      if (!used.has(candidate)) return candidate;
    }
    return String((existingTexts?.length || 0) + 1);
  };

  const description = question?.description || '';
  const textsTitle = question?.textsTitle || '';
  const people = question?.people || [ 
    { id: 'A', name: '', need: '' },
    { id: 'B', name: '', need: '' },
    { id: 'C', name: '', need: '' },
    { id: 'D', name: '', need: '' },
    { id: 'E', name: '', need: '' },
  ];

  const texts = question?.texts || [
    { id: 'A', title: '', content: '' },
    { id: 'B', title: '', content: '' },
    { id: 'C', title: '', content: '' },
    { id: 'D', title: '', content: '' },
    { id: 'E', title: '', content: '' },
    { id: 'F', title: '', content: '' },
    { id: 'G', title: '', content: '' },
    { id: 'H', title: '', content: '' },
  ];

  const answers = question?.answers || {}; // { A: '3', B: '1', ... }

  const handlePeopleChange = (index, field, value) => {
    const newPeople = [...people];
    newPeople[index] = { ...newPeople[index], [field]: value };
    onChange("people", newPeople);
  };

  const getPersonNumber = (idx) => startingNumber + idx;

  const handlePersonImageChange = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const newPeople = [...people];
      newPeople[index] = { ...newPeople[index], imageUrl: reader.result };
      onChange("people", newPeople);
    };
    reader.readAsDataURL(file);
  };

  const handleTextChange = (index, field, value) => {
    const newTexts = [...texts];
    newTexts[index] = { ...newTexts[index], [field]: value };
    onChange("texts", newTexts);
  };

  const handleAnswerChange = (personId, textId) => {
    const newAnswers = { ...answers, [personId]: textId };
    onChange("answers", newAnswers);
  };

  const addText = () => {
    const newId = getNextTextId(texts);
    onChange("texts", [...texts, { id: String(newId), title: '', content: '' }]);
  };

  const removeText = (index) => {
    if (texts.length <= 5) return; // Minimum 5 texts
    const newTexts = texts.filter((_, i) => i !== index);
    onChange("texts", newTexts);
  };

  return (
    <div>
      {/* Part Header */}
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
        borderRadius: "8px",
        marginBottom: "16px",
        color: "white",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            backgroundColor: "white",
            color: "#7c3aed",
            padding: "4px 12px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 700,
          }}>Part {partIndex + 1}</span>
          <span style={{ fontWeight: 600 }}>Matching - People & Texts</span>
          <span style={{
            marginLeft: "auto",
            fontSize: "13px",
            opacity: 0.9,
          }}>Questions {startingNumber}-{startingNumber + 4}</span>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        padding: "12px 16px",
        backgroundColor: "#faf5ff",
        borderRadius: "8px",
        marginBottom: "16px",
        border: "1px solid #e9d5ff",
      }}>
        <p style={{ margin: 0, fontSize: "13px", color: "#6b21a8" }}>
          💡 <strong>Hướng dẫn:</strong> Tạo 5 người (A-E) và 8 lựa chọn (A-H). 
          Mỗi người chọn đúng 1 lựa chọn.
        </p>
      </div>

      {/* Description */}
      <div style={{ marginBottom: "20px" }}>
        <label style={styles.label}>📝 Mô tả chung (Rubric)</label>
        <textarea
          value={description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="VD: The people below all want to buy a book. Look at the descriptions of eight books. Decide which book would be the most suitable for each person."
          style={{ ...styles.input, minHeight: "60px" }}
        />
      </div>

      {/* Two Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        
        {/* LEFT: People */}
        <div>
          <h3 style={{ 
            margin: "0 0 12px 0", 
            fontSize: "14px", 
            color: "#7c3aed",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            👥 Người (5 people)
          </h3>
          
          {people.map((person, idx) => (
            <div key={person.id} style={{
              padding: "12px",
              backgroundColor: "#faf5ff",
              borderRadius: "8px",
              marginBottom: "10px",
              border: "1px solid #e9d5ff",
            }}>
              {/* Image Upload */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                {person.imageUrl ? (
                  <img
                    src={person.imageUrl}
                    alt={person.name || `Person ${person.id}`}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "8px",
                      objectFit: "cover",
                      border: "1px solid #e9d5ff",
                      backgroundColor: "#fff",
                    }}
                  />
                ) : (
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "8px",
                    border: "1px dashed #c4b5fd",
                    backgroundColor: "#f5f3ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    color: "#7c3aed",
                  }}>
                    Ảnh
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <label style={{ ...styles.label, marginBottom: "6px" }}>📷 Ảnh người</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePersonImageChange(idx, e.target.files?.[0])}
                    style={{ fontSize: "12px" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  backgroundColor: "#7c3aed",
                  color: "white",
                  borderRadius: "50%",
                  fontWeight: 700,
                  fontSize: "14px",
                }}>
                  {getPersonNumber(idx)}
                </span>
                <input
                  type="text"
                  value={person.name}
                  onChange={(e) => handlePeopleChange(idx, 'name', e.target.value)}
                  placeholder="Tên (VD: Jo)"
                  style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                />
              </div>
              <textarea
                value={person.need}
                onChange={(e) => handlePeopleChange(idx, 'need', e.target.value)}
                placeholder="Mô tả (optional) (VD: wants to buy comfortable shoes for running)"
                style={{ ...styles.input, minHeight: "50px", marginBottom: 0 }}
              />
              
              {/* Answer selector */}
              <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>Đáp án:</span>
                <select
                  value={answers[person.id] || ''}
                  onChange={(e) => handleAnswerChange(person.id, e.target.value)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid #d1d5db",
                    fontSize: "12px",
                    backgroundColor: answers[person.id] ? "#dcfce7" : "white",
                  }}
                >
                  <option value="">-- Chọn text --</option>
                  {texts.map((text) => (
                    <option key={text.id} value={text.id}>
                      {getTextDisplayLabel(text)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: Texts */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: "14px", 
              color: "#0891b2",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              📄 Texts ({texts.length} options)
            </h3>
            <button
              type="button"
              onClick={addText}
              style={{
                padding: "4px 10px",
                backgroundColor: "#ecfeff",
                color: "#0891b2",
                border: "1px solid #a5f3fc",
                borderRadius: "4px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              + Thêm text
            </button>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={styles.label}>🧾 Tiêu đề cột phải</label>
            <input
              type="text"
              value={textsTitle}
              onChange={(e) => onChange("textsTitle", e.target.value)}
              placeholder="VD: Book reviews"
              style={{ ...styles.input, marginBottom: 0 }}
            />
          </div>
          
          <div style={{ maxHeight: "500px", overflowY: "auto", paddingRight: "8px" }}>
            {texts.map((text, idx) => (
              <div key={text.id} style={{
                padding: "12px",
                backgroundColor: "#ecfeff",
                borderRadius: "8px",
                marginBottom: "10px",
                border: "1px solid #a5f3fc",
                position: "relative",
              }}>
                {/* Remove button */}
                {texts.length > 5 && (
                  <button
                    type="button"
                    onClick={() => removeText(idx)}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      padding: "2px 6px",
                      backgroundColor: "#fee2e2",
                      color: "#dc2626",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "10px",
                    }}
                  >
                    ✕
                  </button>
                )}
                
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "28px",
                    height: "28px",
                    backgroundColor: "#0891b2",
                    color: "white",
                    borderRadius: "6px",
                    fontWeight: 700,
                    fontSize: "12px",
                  }}>
                    {text.id}
                  </span>
                  <input
                    type="text"
                    value={text.title}
                    onChange={(e) => handleTextChange(idx, 'title', e.target.value)}
                    placeholder="Nội dung ngắn (VD: cycling)"
                    style={{ ...styles.input, marginBottom: 0, flex: 1, fontWeight: 600 }}
                  />
                </div>
                <textarea
                  value={text.content}
                  onChange={(e) => handleTextChange(idx, 'content', e.target.value)}
                  placeholder="Mô tả thêm (optional)"
                  style={{ ...styles.input, minHeight: "50px", marginBottom: 0 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Summary */}
      <div style={{
        marginTop: "20px",
        padding: "16px",
        backgroundColor: "#f0fdf4",
        borderRadius: "8px",
        border: "1px solid #bbf7d0",
      }}>
        <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#166534" }}>
          ✅ Đáp án đã chọn:
        </h4>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {people.map((person, idx) => {
            const selectedId = answers[person.id];
            const selectedText = texts.find(t => String(t?.id || '').trim() === String(selectedId || '').trim());
            const display = selectedText ? getTextDisplayLabel(selectedText) : (selectedId || '?');
            return (
              <div key={person.id} style={{
                padding: "8px 12px",
                backgroundColor: answers[person.id] ? "#dcfce7" : "#fee2e2",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
              }}>
                {getPersonNumber(idx)} → {display}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles = {
  input: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "13px",
    marginBottom: "8px",
    boxSizing: "border-box",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: 600,
    fontSize: "13px",
    color: "#374151",
  },
};

export default PeopleMatchingEditor;
