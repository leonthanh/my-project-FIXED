import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StudentNavbar, AdminNavbar } from "../../../shared/components";
import { apiPath, hostPath } from "../../../shared/utils/api";

const SelectTest = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const isTeacher = user && user.role === "teacher";
  const [tests, setTests] = useState({
    writing: [],
    reading: [],
    listening: [],
    cambridge: [],
  });
  const [activeTab, setActiveTab] = useState("writing");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllTests = async () => {
      try {
        setLoading(true);
        const [writingRes, readingRes, listeningRes, cambridgeRes] = await Promise.all([
          fetch(apiPath("writing-tests")),
          fetch(apiPath("reading-tests")),
          fetch(apiPath("listening-tests")),
          fetch(apiPath("cambridge")), // Route: /api/cambridge
        ]);

        const writingData = await writingRes.json();
        const readingData = await readingRes.json();
        const listeningData = await listeningRes.json();
        const cambridgeData = cambridgeRes.ok ? await cambridgeRes.json() : [];

        setTests({
          writing: Array.isArray(writingData) ? writingData : [],
          reading: Array.isArray(readingData) ? readingData : [],
          listening: Array.isArray(listeningData) ? listeningData : [],
          cambridge: Array.isArray(cambridgeData) ? cambridgeData : [],
        });
      } catch (err) {
        console.error("❌ Lỗi khi tải đề:", err);
        setTests({
          writing: [],
          reading: [],
          listening: [],
          cambridge: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllTests();
  }, []);

  const handleSelectWriting = (testId) => {
    const numericId = parseInt(testId, 10);
    if (!numericId || isNaN(numericId)) {
      console.error("❌ Test ID không hợp lệ:", testId);
      return;
    }
    localStorage.setItem("selectedTestId", numericId);
    navigate("/writing-test");
  };

  const handleSelectReading = (testId) => {
    navigate(`/reading/${testId}`);
  };

  const handleSelectListening = (testId) => {
    navigate(`/listening/${testId}`);
  };

  const handleSelectCambridge = (test) => {
    // Navigate based on category (reading or listening)
    if (test.category === 'listening') {
      navigate(`/cambridge/listening/${test.id}`);
    } else {
      navigate(`/cambridge/reading/${test.id}`);
    }
  };

  const handleEdit = (testId, testType, test = null) => {
    if (testType === "writing") {
      navigate(`/edit-test/${testId}`);
    } else if (testType === "reading") {
      navigate(`/reading-tests/${testId}/edit`);
    } else if (testType === "listening") {
      navigate(`/listening/${testId}/edit`);
    } else if (testType === "cambridge" && test) {
      // Navigate based on category
      if (test.category === 'listening') {
        navigate(`/cambridge/listening/${testId}/edit`);
      } else {
        navigate(`/cambridge/reading/${testId}/edit`);
      }
    }
  };

  const renderTestList = (testList, testType) => {
    if (testList.length === 0) {
      return (
        <p style={{ textAlign: "center", color: "#999" }}>
          Chưa có đề thi loại này
        </p>
      );
    }

    return testList.map((test, index) => (
      <div
        key={test.id}
        style={{
          border: "1px solid #eee",
          padding: "15px",
          borderRadius: "10px",
          marginBottom: "15px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => {
              if (testType === "writing") handleSelectWriting(test.id);
              else if (testType === "reading") handleSelectReading(test.id);
              else if (testType === "listening") handleSelectListening(test.id);
              else if (testType === "cambridge") handleSelectCambridge(test);
            }}
            style={{
              backgroundColor: "#0e276f",
              color: "white",
              border: "none",
              padding: "12px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              flex: 1,
              textAlign: "left",
            }}
          >
            <h3 style={{ margin: "0px" }}>
              {testType === "writing"
                ? "📝"
                : testType === "reading"
                ? "📖"
                : testType === "listening"
                ? "🎧"
                : "🏆"}{" "}
              {testType === "cambridge" 
                ? `${test.testType?.toUpperCase() || 'KET'} ${test.category === 'listening' ? '🎧' : '📖'} ${test.title || ''}`
                : `${testType.charAt(0).toUpperCase() + testType.slice(1)} ${test.index || index + 1}`} – {test.classCode || "N/A"} –{" "}
              {test.teacherName || "N/A"}
            </h3>
          </button>
          {isTeacher && (
            <button
              onClick={() => handleEdit(test.id, testType, test)}
              style={{
                backgroundColor: "#e03",
                color: "white",
                border: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                minWidth: "100px",
              }}
            >
              ✏️ Sửa đề
            </button>
          )}
        </div>
      </div>
    ));
  };

  return (
    <>
      {isTeacher ? <AdminNavbar /> : <StudentNavbar />}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "50px 20px",
          fontFamily: "sans-serif",
          backgroundColor: "#f4f8ff",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
            width: "100%",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
            padding: "30px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <img
              src={hostPath("uploads/staredu.jpg")}
              alt="StarEdu"
              style={{ height: 60, marginBottom: 10 }}
            />
          </div>

          {/* Tab Navigation */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "30px",
              borderBottom: "2px solid #eee",
              padding: "0 0 20px 0",
              flexWrap: "wrap",
            }}
          >
            {["writing", "reading", "listening", "cambridge"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: activeTab === tab ? "#0e276f" : "#e0e0e0",
                  color: activeTab === tab ? "white" : "#333",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: activeTab === tab ? "bold" : "normal",
                }}
              >
                {tab === "writing"
                  ? "📝 Writing"
                  : tab === "reading"
                  ? "📖 Reading"
                  : tab === "listening"
                  ? "🎧 Listening"
                  : "🏆 Cambridge"}
              </button>
            ))}
          </div>

          {/* Test List */}
          {loading ? (
            <p
              style={{
                textAlign: "center",
                fontStyle: "italic",
                color: "#666",
              }}
            >
              ⏳ Đang tải đề...
            </p>
          ) : (
            renderTestList(tests[activeTab], activeTab)
          )}

          <button
            onClick={() => (window.location.href = "/my-feedback")}
            style={{
              marginTop: "30px",
              padding: "12px 20px",
              backgroundColor: "#e03",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              width: "100%",
            }}
          >
            📄 Xem nhận xét
          </button>
        </div>
      </div>
    </>
  );
};

export default SelectTest;
