import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
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
          <h2>Orange test type not found</h2>
          <p>
            Current path: <strong>/admin/create-{normalizedTestType || ""}</strong>
          </p>
          <p>Valid test types must exist in TEST_CONFIGS (for example: ket-reading, pet-listening).</p>
          <p>
            Back to <Link to="/cambridge">/cambridge</Link>
          </p>
        </div>
      </>
    );
  }

  return <CambridgeTestBuilder testType={normalizedTestType} resetDraftOnLoad />;
};

export default CreateCambridgeTest;

