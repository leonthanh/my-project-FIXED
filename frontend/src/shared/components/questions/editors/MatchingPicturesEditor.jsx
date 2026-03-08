import React, { useMemo, useState } from "react";
import { apiPath, hostPath } from "../../../utils/api";

const styles = {
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "14px",
    background: "#ffffff",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: 700,
    fontSize: "13px",
    color: "#374151",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
    minHeight: "72px",
    resize: "vertical",
  },
  smallBtn: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
  },
  previewImage: {
    width: "96px",
    height: "96px",
    objectFit: "contain",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    background: "#fff",
  },
};

const normalizeChoices = (choices = []) => {
  const base = Array.isArray(choices) ? choices : [];
  const normalized = base.map((choice, idx) => ({
    id: choice?.id || String.fromCharCode(65 + idx),
    label: choice?.label || "",
    imageUrl: choice?.imageUrl || "",
  }));
  if (normalized.length > 0) return normalized;
  return Array.from({ length: 6 }, (_, idx) => ({
    id: String.fromCharCode(65 + idx),
    label: "",
    imageUrl: "",
  }));
};

const normalizePrompts = (prompts = []) => {
  const base = Array.isArray(prompts) ? prompts : [];
  const normalized = base.map((prompt, idx) => ({
    number: prompt?.number ?? idx + 1,
    text: prompt?.text || "",
    correctAnswer: prompt?.correctAnswer || "",
  }));
  if (normalized.length > 0) return normalized;
  return Array.from({ length: 5 }, (_, idx) => ({
    number: idx + 1,
    text: "",
    correctAnswer: "",
  }));
};

const resolveImgSrc = (url) => {
  if (!url) return "";
  const value = String(url);
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return hostPath(value);
  return value;
};

const MatchingPicturesEditor = ({ question = {}, onChange, startingNumber = 1, partIndex = 0 }) => {
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadError, setUploadError] = useState("");

  const choices = useMemo(() => normalizeChoices(question?.choices), [question?.choices]);
  const prompts = useMemo(() => normalizePrompts(question?.prompts), [question?.prompts]);
  const examplePrompt = question?.examplePrompt || "";
  const exampleAnswer = question?.exampleAnswer || "";

  const setField = (field, value) => onChange(field, value);

  const updateChoice = (idx, patch) => {
    const next = choices.map((choice, choiceIdx) => (choiceIdx === idx ? { ...choice, ...patch } : choice));
    setField("choices", next);
  };

  const updatePrompt = (idx, patch) => {
    const next = prompts.map((prompt, promptIdx) => (promptIdx === idx ? { ...prompt, ...patch } : prompt));
    setField("prompts", next);
  };

  const addChoice = () => {
    const nextId = String.fromCharCode(65 + choices.length);
    setField("choices", [...choices, { id: nextId, label: "", imageUrl: "" }]);
  };

  const removeChoice = (idx) => {
    if (choices.length <= 4) return;
    const removed = choices[idx];
    const nextChoices = choices.filter((_, choiceIdx) => choiceIdx !== idx);
    const nextPrompts = prompts.map((prompt) => (
      prompt.correctAnswer === removed?.id ? { ...prompt, correctAnswer: "" } : prompt
    ));
    setField("choices", nextChoices);
    setField("prompts", nextPrompts);
    if (exampleAnswer === removed?.id) {
      setField("exampleAnswer", "");
    }
  };

  const addPrompt = () => {
    const nextNumber = prompts.length + 1;
    setField("prompts", [...prompts, { number: nextNumber, text: "", correctAnswer: "" }]);
  };

  const removePrompt = (idx) => {
    if (prompts.length <= 3) return;
    const nextPrompts = prompts.filter((_, promptIdx) => promptIdx !== idx).map((prompt, promptIdx) => ({
      ...prompt,
      number: promptIdx + 1,
    }));
    setField("prompts", nextPrompts);
  };

  const uploadChoiceImage = async (choiceId, file) => {
    if (!file) return;
    setUploadError("");
    setUploadingId(choiceId);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(apiPath("upload/cambridge-image"), {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.message || "Upload ảnh thất bại");
      }
      const nextChoices = choices.map((choice) => (
        choice.id === choiceId ? { ...choice, imageUrl: data.url } : choice
      ));
      setField("choices", nextChoices);
    } catch (err) {
      setUploadError(err?.message || "Upload ảnh thất bại");
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div style={styles.section}>
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)",
        borderRadius: "8px",
        color: "white",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ background: "white", color: "#2563eb", padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 800 }}>
            Part {partIndex + 1}
          </span>
          <strong>Matching With Pictures</strong>
          <span style={{ marginLeft: "auto", fontSize: "12px", opacity: 0.9 }}>
            Questions {startingNumber}-{startingNumber + prompts.length - 1}
          </span>
        </div>
      </div>

      <div style={{ ...styles.card, background: "#eff6ff", borderColor: "#bfdbfe" }}>
        <div style={{ fontSize: "13px", color: "#1d4ed8", lineHeight: 1.5 }}>
          Dạng này dành cho học sinh nhỏ tuổi: bên phải là các ảnh/đáp án, bên trái là mô tả. Học sinh kéo-thả ảnh vào từng chỗ trống thay vì gõ bàn phím.
        </div>
      </div>

      <div style={styles.card}>
        <label style={styles.label}>Example</label>
        <textarea
          value={examplePrompt}
          onChange={(e) => setField("examplePrompt", e.target.value)}
          placeholder="VD: This place is outside the city. There are fields, trees, and animals here."
          style={styles.textarea}
        />
        <div style={{ marginTop: "10px" }}>
          <label style={styles.label}>Đáp án ví dụ</label>
          <select
            value={exampleAnswer}
            onChange={(e) => setField("exampleAnswer", e.target.value)}
            style={styles.input}
          >
            <option value="">-- Chọn đáp án ví dụ --</option>
            {choices.map((choice) => (
              <option key={choice.id} value={choice.id}>{choice.id}. {choice.label || '(chưa đặt tên)'}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <label style={{ ...styles.label, marginBottom: 0 }}>Ngân hàng hình ảnh / đáp án</label>
          <button type="button" onClick={addChoice} style={{ ...styles.smallBtn, background: "#dbeafe", color: "#1d4ed8" }}>+ Thêm ảnh</button>
        </div>
        <div style={{ display: "grid", gap: "12px" }}>
          {choices.map((choice, idx) => (
            <div key={choice.id} style={{ ...styles.card, background: "#f8fafc" }}>
              <div style={{ display: "grid", gridTemplateColumns: "96px 1fr auto", gap: "12px", alignItems: "start" }}>
                <div>
                  {choice.imageUrl ? (
                    <img src={resolveImgSrc(choice.imageUrl)} alt={choice.label || choice.id} style={styles.previewImage} />
                  ) : (
                    <div style={{ ...styles.previewImage, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "12px" }}>
                      No image
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  <div>
                    <label style={styles.label}>Mã đáp án</label>
                    <input value={choice.id} readOnly style={{ ...styles.input, background: "#f3f4f6" }} />
                  </div>
                  <div>
                    <label style={styles.label}>Tên hiển thị</label>
                    <input
                      value={choice.label}
                      onChange={(e) => updateChoice(idx, { label: e.target.value })}
                      placeholder="VD: football / a dentist / the wind"
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Link ảnh hoặc upload</label>
                    <input
                      value={choice.imageUrl}
                      onChange={(e) => updateChoice(idx, { imageUrl: e.target.value })}
                      placeholder="https://... hoặc /uploads/..."
                      style={styles.input}
                    />
                    <div style={{ marginTop: "6px" }}>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingId === choice.id}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          await uploadChoiceImage(choice.id, file);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => removeChoice(idx)}
                    style={{ ...styles.smallBtn, background: "#fee2e2", color: "#dc2626" }}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {uploadError && <div style={{ marginTop: "8px", color: "#dc2626", fontSize: "12px" }}>❌ {uploadError}</div>}
      </div>

      <div style={styles.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <label style={{ ...styles.label, marginBottom: 0 }}>Questions</label>
          <button type="button" onClick={addPrompt} style={{ ...styles.smallBtn, background: "#dcfce7", color: "#166534" }}>+ Thêm câu</button>
        </div>
        <div style={{ display: "grid", gap: "10px" }}>
          {prompts.map((prompt, idx) => (
            <div key={`${prompt.number}-${idx}`} style={{ ...styles.card, background: "#fafafa" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <strong style={{ color: "#1f2937" }}>Question {prompt.number}</strong>
                <button
                  type="button"
                  onClick={() => removePrompt(idx)}
                  style={{ ...styles.smallBtn, background: "#fee2e2", color: "#dc2626" }}
                >
                  Xóa
                </button>
              </div>
              <div style={{ display: "grid", gap: "8px" }}>
                <div>
                  <label style={styles.label}>Mô tả</label>
                  <textarea
                    value={prompt.text}
                    onChange={(e) => updatePrompt(idx, { text: e.target.value })}
                    placeholder="VD: This is a game. People kick a ball around a field."
                    style={styles.textarea}
                  />
                </div>
                <div>
                  <label style={styles.label}>Đáp án đúng</label>
                  <select
                    value={prompt.correctAnswer}
                    onChange={(e) => updatePrompt(idx, { correctAnswer: e.target.value })}
                    style={styles.input}
                  >
                    <option value="">-- Chọn đáp án đúng --</option>
                    {choices.map((choice) => (
                      <option key={choice.id} value={choice.id}>{choice.id}. {choice.label || '(chưa đặt tên)'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MatchingPicturesEditor;
