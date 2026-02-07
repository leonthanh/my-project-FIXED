import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPath } from "../../../shared/utils/api";

const SelectPetWritingTest = () => {
  const [tests, setTests] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(apiPath("writing-tests?testType=pet-writing"))
      .then((res) => res.json())
      .then((data) => setTests(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load PET writing tests:", err));
  }, []);

  const handleSelect = (id) => {
    const numericId = parseInt(id, 10);
    if (!numericId || isNaN(numericId)) {
      console.error("Invalid test id:", id);
      return;
    }
    localStorage.setItem("selectedPetWritingTestId", numericId);
    localStorage.removeItem("selectedTestId");
    navigate("/pet-writing");
  };

  return (
    <div style={{ padding: "50px" }}>
      <h2>📋 PET Writing Tests</h2>
      {tests.length === 0 && <p>⏳ Loading tests...</p>}
      {tests.map((test) => (
        <div key={test.id} style={{ marginBottom: "20px" }}>
          <strong>
            📝 PET Writing {test.index} – {test.classCode || "N/A"} –{" "}
            {test.teacherName || "N/A"}
          </strong>
          <button
            onClick={() => handleSelect(test.id)}
            style={{ marginLeft: "10px" }}
          >
            Start
          </button>
        </div>
      ))}
    </div>
  );
};

export default SelectPetWritingTest;
