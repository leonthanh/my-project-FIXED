import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPath } from "../../../shared/utils/api";
import InlineIcon from "../../../shared/components/InlineIcon.jsx";

const SelectWritingTest = () => {
  const [tests, setTests] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(apiPath("writing-tests"))
      .then((res) => res.json())
      .then((data) => setTests(data))
      .catch((err) => console.error("Lỗi khi tải đề:", err));
  }, []);

  const handleSelect = (test) => {
    const numericId = parseInt(test.id, 10); // Ép sang số
    if (!numericId || isNaN(numericId)) {
      console.error("ID đề không hợp lệ:", test?.id);
      return;
    }
    if (test?.testType === "pet-writing") {
      localStorage.setItem("selectedPetWritingTestId", numericId);
      localStorage.removeItem("selectedTestId");
      navigate("/pet-writing");
      return;
    }
    localStorage.setItem("selectedTestId", numericId);
    localStorage.removeItem("selectedPetWritingTestId");
    navigate("/writing-test"); // Chuyển đến trang làm bài
  };

  return (
    <div style={{ padding: "50px" }}>
      <h2 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><InlineIcon name="document" size={18} />Chọn đề viết</h2>
      {tests.length === 0 && <p style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><InlineIcon name="loading" size={16} />Đang tải đề...</p>}
      {tests.map((test) => (
        <div key={test.id} style={{ marginBottom: "20px" }}>
          <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <InlineIcon name="writing" size={16} />
            {test.testType === "pet-writing" ? "PET Writing" : "Writing"}{" "}
            {test.index} – {test.classCode || "N/A"} –{" "}
            {test.teacherName || "N/A"}
          </strong>

          <button
            onClick={() => handleSelect(test)}
            style={{ marginLeft: "10px" }}
          >
            Làm bài
          </button>
        </div>
      ))}
    </div>
  );
};

export default SelectWritingTest;
