import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { AdminNavbar } from "../../../shared/components";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";
import CambridgeTestBuilder from "../CambridgeTestBuilder";

const CreateCambridgeTest = () => {
  const { testType } = useParams();

  const normalizedTestType = useMemo(() => {
    const t = String(testType || "").trim().toLowerCase();
    return t;
  }, [testType]);

  const isValid = Boolean(TEST_CONFIGS?.[normalizedTestType]);

  if (!normalizedTestType || !isValid) {
    return (
      <>
        <AdminNavbar />
        <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
          <h2>❌ Không tìm thấy loại đề Cambridge</h2>
          <p>
            Đường dẫn hiện tại: <strong>/admin/create-{normalizedTestType || ""}</strong>
          </p>
          <p>Loại đề hợp lệ phải nằm trong cấu hình TEST_CONFIGS (vd: ket-reading, pet-listening...).</p>
          <p>
            Quay lại <Link to="/cambridge">/cambridge</Link>
          </p>
        </div>
      </>
    );
  }

  return <CambridgeTestBuilder testType={normalizedTestType} resetDraftOnLoad />;
};

export default CreateCambridgeTest;
