import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AdminNavbar } from "../../../shared/components";
import { apiPath } from "../../../shared/utils/api";
import CambridgeTestBuilder from "../CambridgeTestBuilder";

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
        console.error("❌ Lỗi khi tải đề:", err);
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
          <p>⏳ Đang tải đề thi...</p>
        </div>
      </>
    );
  }

  if (message.type === "error") {
    return (
      <>
        <AdminNavbar />
        <div style={{ padding: "50px", textAlign: "center" }}>
          <p style={{ color: "#dc2626" }}>❌ {message.text}</p>
        </div>
      </>
    );
  }

  const testType = fetchedData?.testType || "ket-reading";
  return <CambridgeTestBuilder testType={testType} editId={id} initialData={fetchedData} />;
};

export default EditCambridgeReadingTest;

