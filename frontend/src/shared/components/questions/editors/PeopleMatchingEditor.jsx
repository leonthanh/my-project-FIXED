import React from "react";
import { hostPath } from "../../../utils/api";
import InlineIcon from "../../InlineIcon.jsx";

const DEFAULT_PEOPLE = [
  { id: "A", name: "", need: "", imageUrl: "" },
  { id: "B", name: "", need: "", imageUrl: "" },
  { id: "C", name: "", need: "", imageUrl: "" },
  { id: "D", name: "", need: "", imageUrl: "" },
  { id: "E", name: "", need: "", imageUrl: "" },
];

const DEFAULT_TEXTS = [
  { id: "A", title: "", content: "" },
  { id: "B", title: "", content: "" },
  { id: "C", title: "", content: "" },
  { id: "D", title: "", content: "" },
  { id: "E", title: "", content: "" },
  { id: "F", title: "", content: "" },
  { id: "G", title: "", content: "" },
  { id: "H", title: "", content: "" },
];

const resolveImgSrc = (url) => {
  if (!url) return "";
  const value = String(url).trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return hostPath(value);
};

const isNumericId = (id) => typeof id === "string" && /^\d+$/.test(id.trim());
const isSingleLetterId = (id) => typeof id === "string" && /^[A-Z]$/.test(id.trim());

const getNextTextId = (existingTexts) => {
  const ids = (existingTexts || []).map((text) => String(text?.id || "").trim()).filter(Boolean);
  const allNumeric = ids.length > 0 && ids.every(isNumericId);
  const allLetters = ids.length > 0 && ids.every(isSingleLetterId);

  if (allLetters) {
    const used = new Set(ids);
    for (let i = 0; i < 26; i += 1) {
      const candidate = String.fromCharCode(65 + i);
      if (!used.has(candidate)) return candidate;
    }
    return String((existingTexts?.length || 0) + 1);
  }

  if (allNumeric) {
    const max = ids.reduce((acc, cur) => Math.max(acc, parseInt(cur, 10)), 0);
    return String(max + 1);
  }

  const used = new Set(ids);
  for (let i = 0; i < 26; i += 1) {
    const candidate = String.fromCharCode(65 + i);
    if (!used.has(candidate)) return candidate;
  }
  return String((existingTexts?.length || 0) + 1);
};

const getTextDisplayLabel = (text) => {
  const id = String(text?.id || "").trim();
  const content = String(text?.title || text?.content || "").trim();
  return content ? `${id} ${content}`.trim() : id;
};

/**
 * PeopleMatchingEditor - shared editor for KET/PET reading part 2.
 * Supports either uploaded images (stored as data URL) or pasted image URLs.
 */
const PeopleMatchingEditor = ({
  question = {},
  onChange,
  startingNumber = 6,
  partIndex = 1,
}) => {
  const description = question?.description || "";
  const textsTitle = question?.textsTitle || "";
  const people = Array.isArray(question?.people) && question.people.length > 0
    ? question.people.map((person, idx) => ({
        id: person?.id || DEFAULT_PEOPLE[idx]?.id || String.fromCharCode(65 + idx),
        name: person?.name || "",
        need: person?.need || "",
        imageUrl: person?.imageUrl || "",
      }))
    : DEFAULT_PEOPLE;
  const texts = Array.isArray(question?.texts) && question.texts.length > 0
    ? question.texts.map((text, idx) => ({
        id: text?.id || DEFAULT_TEXTS[idx]?.id || String.fromCharCode(65 + idx),
        title: text?.title || "",
        content: text?.content || "",
      }))
    : DEFAULT_TEXTS;
  const answers = question?.answers || {};

  const handlePeopleChange = (index, field, value) => {
    const newPeople = [...people];
    newPeople[index] = { ...newPeople[index], [field]: value };
    onChange("people", newPeople);
  };

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
    onChange("answers", { ...answers, [personId]: textId });
  };

  const getPersonNumber = (idx) => startingNumber + idx;

  const addText = () => {
    const newId = getNextTextId(texts);
    onChange("texts", [...texts, { id: String(newId), title: "", content: "" }]);
  };

  const removeText = (index) => {
    if (texts.length <= 5) return;
    const removedTextId = texts[index]?.id;
    const newTexts = texts.filter((_, textIdx) => textIdx !== index);
    const newAnswers = Object.fromEntries(
      Object.entries(answers).map(([personId, textId]) => [
        personId,
        textId === removedTextId ? "" : textId,
      ])
    );
    onChange("texts", newTexts);
    onChange("answers", newAnswers);
  };

  return (
    <div>
      <div
        style={{
          padding: "12px 16px",
          background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
          borderRadius: "8px",
          marginBottom: "16px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              backgroundColor: "white",
              color: "#7c3aed",
              padding: "4px 12px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            Part {partIndex + 1}
          </span>
          <span style={{ fontWeight: 600 }}>Matching - People & Texts</span>
          <span style={{ marginLeft: "auto", fontSize: "13px", opacity: 0.9 }}>
            Questions {startingNumber}-{startingNumber + 4}
          </span>
        </div>
      </div>

      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "#faf5ff",
          borderRadius: "8px",
          marginBottom: "16px",
          border: "1px solid #e9d5ff",
        }}
      >
        <p style={{ margin: 0, fontSize: "13px", color: "#6b21a8" }}>
          <strong>Hướng dẫn:</strong> Tạo 5 người (A-E) và 8 lựa chọn (A-H). Mỗi người chọn đúng 1 lựa chọn.
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={styles.label}>Mô tả chung (Rubric)</label>
        <textarea
          value={description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="VD: The people below all want to buy a book. Look at the descriptions of eight books. Decide which book would be the most suitable for each person."
          style={{ ...styles.input, minHeight: "60px" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "20px", alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              margin: "0 0 12px 0",
              fontSize: "14px",
              color: "#7c3aed",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Người (5 people)
          </h3>

          {people.map((person, idx) => (
            <div
              key={person.id || idx}
              style={{
                padding: "12px",
                backgroundColor: "#faf5ff",
                borderRadius: "8px",
                marginBottom: "10px",
                border: "1px solid #e9d5ff",
              }}
            >
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px" }}>
                {person.imageUrl ? (
                  <img
                    src={resolveImgSrc(person.imageUrl)}
                    alt={person.name || `Person ${person.id}`}
                    style={styles.personImage}
                  />
                ) : (
                  <div style={styles.emptyImage}>Ảnh</div>
                )}

                <div style={{ flex: 1 }}>
                  <label style={{ ...styles.label, marginBottom: "6px" }}>Ảnh người</label>
                  <input
                    type="text"
                    value={person.imageUrl || ""}
                    onChange={(e) => handlePeopleChange(idx, "imageUrl", e.target.value)}
                    placeholder="Paste image/GIF URL or /uploads/..."
                    style={{ ...styles.input, fontSize: "12px", marginBottom: "8px" }}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      handlePersonImageChange(idx, file);
                    }}
                    style={{ fontSize: "12px" }}
                  />
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "#6b7280", lineHeight: 1.5 }}>
                    Supports .gif, .png, .jpg links and internal upload paths.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={styles.personNumber}>{getPersonNumber(idx)}</span>
                <input
                  type="text"
                  value={person.name}
                  onChange={(e) => handlePeopleChange(idx, "name", e.target.value)}
                  placeholder="Tên (VD: Jo)"
                  style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                />
              </div>

              <textarea
                value={person.need}
                onChange={(e) => handlePeopleChange(idx, "need", e.target.value)}
                placeholder="Mô tả (optional) (VD: wants to buy comfortable shoes for running)"
                style={{ ...styles.input, minHeight: "50px", marginBottom: 0 }}
              />

              <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>Đáp án:</span>
                <select
                  value={answers[person.id] || ""}
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

        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h3
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#0891b2",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Texts ({texts.length} options)
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
            <label style={styles.label}>Tiêu đề cột phải</label>
            <input
              type="text"
              value={textsTitle}
              onChange={(e) => onChange("textsTitle", e.target.value)}
              placeholder="VD: Book reviews"
              style={{ ...styles.input, marginBottom: 0 }}
            />
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            {texts.map((text, idx) => (
              <div
                key={text.id}
                style={{
                  padding: "12px",
                  backgroundColor: "#ecfeff",
                  borderRadius: "8px",
                  border: "1px solid #a5f3fc",
                  position: "relative",
                }}
              >
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
                    <InlineIcon name="close" size={12} style={{ color: "currentColor" }} />
                  </button>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span
                    style={{
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
                    }}
                  >
                    {text.id}
                  </span>
                  <input
                    type="text"
                    value={text.title}
                    onChange={(e) => handleTextChange(idx, "title", e.target.value)}
                    placeholder="Nội dung ngắn (VD: cycling)"
                    style={{ ...styles.input, marginBottom: 0, flex: 1, fontWeight: 600 }}
                  />
                </div>

                <textarea
                  value={text.content}
                  onChange={(e) => handleTextChange(idx, "content", e.target.value)}
                  placeholder="Mô tả thêm (optional)"
                  style={{ ...styles.input, minHeight: "50px", marginBottom: 0 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "16px",
          backgroundColor: "#f0fdf4",
          borderRadius: "8px",
          border: "1px solid #bbf7d0",
        }}
      >
        <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#166534" }}>
          Đáp án đã chọn:
        </h4>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {people.map((person, idx) => {
            const selectedId = answers[person.id];
            const selectedText = texts.find((text) => String(text?.id || "").trim() === String(selectedId || "").trim());
            const display = selectedText ? getTextDisplayLabel(selectedText) : (selectedId || "?");

            return (
              <div
                key={person.id || idx}
                style={{
                  padding: "8px 12px",
                  backgroundColor: answers[person.id] ? "#dcfce7" : "#fee2e2",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                {getPersonNumber(idx)} {"->"} {display}
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
  emptyImage: {
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
    flexShrink: 0,
  },
  personImage: {
    width: "56px",
    height: "56px",
    borderRadius: "8px",
    objectFit: "cover",
    border: "1px solid #e9d5ff",
    backgroundColor: "#fff",
    flexShrink: 0,
  },
  personNumber: {
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
  },
};

export default PeopleMatchingEditor;
