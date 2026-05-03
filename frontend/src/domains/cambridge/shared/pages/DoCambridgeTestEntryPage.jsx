import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import DoCambridgeListeningTestPage from "./DoCambridgeListeningTestPage";
import DoCambridgeReadingTestPage from "./DoCambridgeReadingTestPage";
import PetWritingTestPage from "../../pet/writing/pages/PetWritingTestPage";
import LineIcon from "../../../../shared/components/LineIcon.jsx";

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
 *          /cambridge/pet-writing/3    -> PetWritingTest
 */
const DoCambridgeTestEntry = () => {
  const { testType } = useParams();

  const kind = useMemo(() => {
    const s = String(testType || "").trim().toLowerCase();
    if (s.includes("listening")) return "listening";
    if (s.includes("reading")) return "reading";
    if (s.includes("writing")) return "writing";
    return "unknown";
  }, [testType]);

  if (kind === "listening") return <DoCambridgeListeningTestPage />;
  if (kind === "reading") return <DoCambridgeReadingTestPage />;
  if (kind === "writing") return <PetWritingTestPage />;

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 10 }}>
        <InlineIcon name="error" size={22} style={{ color: "#dc2626" }} />
        Không nhận diện được loại đề Cambridge
      </h2>
      <p>
        URL hiện tại thiếu phần <strong>reading</strong>, <strong>listening</strong> hoặc <strong>writing</strong>.
      </p>
      <p style={{ color: "#6b7280" }}>
        Ví dụ đúng: <code>/cambridge/ket-listening/1</code>, <code>/cambridge/ket-reading/1</code> hoặc <code>/cambridge/pet-writing/1</code>
      </p>
    </div>
  );
};

export default DoCambridgeTestEntry;
