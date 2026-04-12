import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import DoCambridgeListeningTest from "./DoCambridgeListeningTest";
import DoCambridgeReadingTest from "./DoCambridgeReadingTest";
import LineIcon from "../../../shared/components/LineIcon.jsx";

const InlineIcon = ({ name, size = 18, strokeWidth = 2, style }) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 0,
      ...style,
    }}
  >
    <LineIcon name={name} size={size} strokeWidth={strokeWidth} />
  </span>
);

/**
 * DoCambridgeTestEntry
 * Routes a generic /cambridge/:testType/:id URL to the correct student page.
 * Example: /cambridge/ket-listening/1 -> DoCambridgeListeningTest
 *          /cambridge/ket-reading/2    -> DoCambridgeReadingTest
 */
const DoCambridgeTestEntry = () => {
  const { testType } = useParams();

  const kind = useMemo(() => {
    const s = String(testType || "").trim().toLowerCase();
    if (s.includes("listening")) return "listening";
    if (s.includes("reading")) return "reading";
    return "unknown";
  }, [testType]);

  if (kind === "listening") return <DoCambridgeListeningTest />;
  if (kind === "reading") return <DoCambridgeReadingTest />;

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 10 }}>
        <InlineIcon name="error" size={22} style={{ color: "#dc2626" }} />
        Không nhận diện được loại đề Cambridge
      </h2>
      <p>
        URL hiện tại thiếu phần <strong>reading</strong> hoặc <strong>listening</strong>.
      </p>
      <p style={{ color: "#6b7280" }}>
        Ví dụ đúng: <code>/cambridge/ket-listening/1</code> hoặc <code>/cambridge/ket-reading/1</code>
      </p>
    </div>
  );
};

export default DoCambridgeTestEntry;
