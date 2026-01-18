import React, { useMemo, useState } from "react";
import { apiPath, hostPath } from "../../../utils/api";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: "12px",
    alignItems: "start",
  },
  label: {
    fontWeight: 700,
    color: "#374151",
    fontSize: "13px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  optionCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "12px",
    background: "#f8fafc",
  },
  optionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "10px",
  },
  optionTitle: {
    fontWeight: 800,
    color: "#0f172a",
  },
  preview: {
    width: "120px",
    height: "90px",
    objectFit: "contain",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    background: "white",
  },
  help: {
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: 1.4,
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    background: "white",
  },
};

const ensure3Options = (imageOptions) => {
  const base = Array.isArray(imageOptions) ? imageOptions : [];
  const normalized = base
    .slice(0, 3)
    .map((opt) => ({ imageUrl: opt?.imageUrl || "", text: opt?.text || "" }));
  while (normalized.length < 3) normalized.push({ imageUrl: "", text: "" });
  return normalized;
};

const resolveImgSrc = (url) => {
  if (!url) return "";
  const s = String(url);
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return hostPath(s);
  return s;
};

const MultipleChoicePicturesEditor = ({ question, onChange }) => {
  const imageOptions = useMemo(
    () => ensure3Options(question?.imageOptions),
    [question?.imageOptions]
  );

  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [uploadError, setUploadError] = useState("");

  const setField = (field, value) => {
    onChange(field, value);
  };

  const updateOption = (idx, patch) => {
    const next = imageOptions.map((opt, i) => (i === idx ? { ...opt, ...patch } : opt));
    setField("imageOptions", next);
  };

  const uploadForOption = async (idx, file) => {
    if (!file) return;
    setUploadError("");
    setUploadingIndex(idx);
    try {
      const form = new FormData();
      form.append("image", file);

      const res = await fetch(apiPath("upload/cambridge-image"), {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Upload thất bại");
      }

      if (data?.url) {
        updateOption(idx, { imageUrl: data.url });
      } else {
        throw new Error("Server không trả về url");
      }
    } catch (err) {
      setUploadError(err?.message || "Upload thất bại");
    } finally {
      setUploadingIndex(null);
    }
  };

  const optionLabels = ["A", "B", "C"];

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <div style={styles.label}>Câu hỏi</div>
        <div>
          <input
            style={styles.input}
            value={question?.questionText || ""}
            onChange={(e) => setField("questionText", e.target.value)}
            placeholder="VD: What does the boy’s mother need to buy for him?"
          />
          <div style={{ ...styles.help, marginTop: "6px" }}>
            Gợi ý: Nếu đề là dạng chỉ có hình, bạn vẫn nên nhập câu hỏi (prompt) ở đây.
          </div>
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.label}>Đáp án</div>
        <div>
          {imageOptions.map((opt, idx) => (
            <div key={idx} style={{ ...styles.optionCard, marginBottom: "10px" }}>
              <div style={styles.optionHeader}>
                <div style={styles.optionTitle}>Option {optionLabels[idx]}</div>
                {opt.imageUrl ? (
                  <img
                    src={resolveImgSrc(opt.imageUrl)}
                    alt={`Option ${optionLabels[idx]}`}
                    style={styles.preview}
                    onError={(e) => {
                      // hide broken image icon
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div style={{ ...styles.help, width: "120px", textAlign: "right" }}>
                    (chưa có hình)
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <div style={{ ...styles.help, marginBottom: "6px" }}>Link hình ảnh (URL)</div>
                  <input
                    style={styles.input}
                    value={opt.imageUrl}
                    onChange={(e) => updateOption(idx, { imageUrl: e.target.value })}
                    placeholder="https://.../image.png"
                  />
                  <div style={{ ...styles.help, marginTop: "8px" }}>
                    Hoặc upload ảnh:
                    <div style={{ marginTop: "6px" }}>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingIndex === idx}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          await uploadForOption(idx, file);
                        }}
                      />
                      {uploadingIndex === idx && (
                        <div style={{ marginTop: "6px", fontSize: "12px", color: "#0e276f" }}>
                          Đang upload...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ ...styles.help, marginBottom: "6px" }}>Chú thích (tuỳ chọn)</div>
                  <input
                    style={styles.input}
                    value={opt.text}
                    onChange={(e) => updateOption(idx, { text: e.target.value })}
                    placeholder="VD: shoes / trousers / jacket"
                  />
                </div>
              </div>

              <div style={{ ...styles.help, marginTop: "8px" }}>
                Mẹo: Nếu bạn chưa có URL ảnh, có thể tạm nhập chữ mô tả ở “Chú thích” và để trống URL.
              </div>
            </div>
          ))}

          {uploadError && (
            <div style={{ marginTop: "8px", color: "#dc2626", fontSize: "12px" }}>
              ❌ {uploadError}
            </div>
          )}
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.label}>Đáp án đúng</div>
        <div>
          <select
            style={styles.select}
            value={question?.correctAnswer || ""}
            onChange={(e) => setField("correctAnswer", e.target.value)}
          >
            <option value="">-- Chọn đáp án đúng --</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default MultipleChoicePicturesEditor;
