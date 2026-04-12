import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { apiPath } from "../../../shared/utils/api";
import LineIcon from "../../../shared/components/LineIcon.jsx";
import CambridgeTestBuilder from "../CambridgeTestBuilder";

const InlineIcon = ({ name, size = 16, strokeWidth = 2, style }) => (
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
 * EditCambridgeReadingTest - Trang sửa đề Cambridge Reading
 */
const EditCambridgeReadingTest = () => {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [fetchedData, setFetchedData] = useState(null);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const res = await fetch(apiPath(`cambridge/reading-tests/${id}`));
        if (!res.ok) throw new Error("Không thể tải đề thi");

        const data = await res.json();

        if (typeof data.parts === "string") {
          try {
            data.parts = JSON.parse(data.parts);
          } catch (err) {
            console.warn("Could not parse parts JSON from DB:", err);
            data.parts = null;
          }
        }

        setFetchedData(data);
      } catch (err) {
        console.error("Lỗi khi tải đề:", err);
        setMessage({ type: "error", text: "Không thể tải đề thi. " + err.message });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchTest();
  }, [id]);

  if (loading) {
    return (
      <>
        <AdminNavbar />
        <div style={{ padding: "50px", textAlign: "center" }}>
          <p style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <InlineIcon name="loading" size={16} style={{ color: "#0f172a" }} />
            Đang tải đề thi...
          </p>
        </div>
      </>
    );
  }

  if (message.type === "error") {
    return (
      <>
        <AdminNavbar />
        <div style={{ padding: "50px", textAlign: "center" }}>
          <p style={{ color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <InlineIcon name="error" size={16} style={{ color: "#dc2626" }} />
            {message.text}
          </p>
        </div>
      </>
    );
  }

  const testType = fetchedData?.testType || "ket-reading";
  return <CambridgeTestBuilder testType={testType} editId={id} initialData={fetchedData} />;
};

export default EditCambridgeReadingTest;


