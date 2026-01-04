import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StudentNavbar, AdminNavbar } from "../../../shared/components";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";

/**
 * SelectCambridgeTest - Trang chọn đề Cambridge cho học sinh
 * Hiển thị danh sách đề KET, PET, FLYERS, MOVERS, STARTERS
 */
const SelectCambridgeTest = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const isTeacher = user && user.role === "teacher";
  const navigate = useNavigate();

  const [tests, setTests] = useState({
    listening: [],
    reading: [],
  });
  const [activeTab, setActiveTab] = useState("listening");
  const [activeTestType, setActiveTestType] = useState("ket");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Test type options
  const testTypes = [
    { id: "ket", name: "KET (A2 Key)", icon: "🔑" },
    { id: "pet", name: "PET (B1 Preliminary)", icon: "📘" },
    { id: "flyers", name: "Flyers (A2)", icon: "✈️" },
    { id: "movers", name: "Movers (A1)", icon: "🚗" },
    { id: "starters", name: "Starters (Pre-A1)", icon: "⭐" },
  ];

  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
        setError(null);

        const [listeningRes, readingRes] = await Promise.all([
          fetch(apiPath(`cambridge/listening-tests?testType=${activeTestType}-listening`)),
          fetch(apiPath(`cambridge/reading-tests?testType=${activeTestType}-reading`)),
        ]);

        if (!listeningRes.ok || !readingRes.ok) {
          throw new Error("Không thể tải danh sách đề");
        }

        const listeningData = await listeningRes.json();
        const readingData = await readingRes.json();

        setTests({
          listening: Array.isArray(listeningData) ? listeningData : [],
          reading: Array.isArray(readingData) ? readingData : [],
        });
      } catch (err) {
        console.error("❌ Lỗi khi tải đề Cambridge:", err);
        setError(err.message);
        setTests({ listening: [], reading: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [activeTestType]);

  const handleSelectListening = (testId) => {
    navigate(`/cambridge/${activeTestType}-listening/${testId}`);
  };

  const handleSelectReading = (testId) => {
    navigate(`/cambridge/${activeTestType}-reading/${testId}`);
  };

  const handleEdit = (testId, testType) => {
    if (testType === "listening") {
      navigate(`/admin/edit-${activeTestType}-listening/${testId}`);
    } else {
      navigate(`/admin/edit-${activeTestType}-reading/${testId}`);
    }
  };

  const getTestConfig = (type) => {
    const key = `${activeTestType}-${type}`;
    return TEST_CONFIGS[key] || {};
  };

  const renderTestList = (testList, testType) => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          Đang tải danh sách đề...
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ textAlign: "center", padding: "40px", color: "#dc2626" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>❌</div>
          {error}
        </div>
      );
    }

    if (testList.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
          <p>Chưa có đề {testType === "listening" ? "Listening" : "Reading"} cho {activeTestType.toUpperCase()}</p>
          {isTeacher && (
            <button
              onClick={() => navigate(`/admin/create-${activeTestType}-${testType}`)}
              style={{
                marginTop: "16px",
                padding: "12px 24px",
                backgroundColor: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ➕ Tạo đề mới
            </button>
          )}
        </div>
      );
    }

    const config = getTestConfig(testType);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {testList.map((test, index) => (
          <div
            key={test.id}
            style={{
              border: "1px solid #e5e7eb",
              padding: "16px 20px",
              borderRadius: "12px",
              backgroundColor: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button
                onClick={() => {
                  if (testType === "listening") handleSelectListening(test.id);
                  else handleSelectReading(test.id);
                }}
                style={{
                  backgroundColor: "#0e276f",
                  color: "white",
                  border: "none",
                  padding: "14px 20px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "15px",
                  flex: 1,
                  textAlign: "left",
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#1a3a8f")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#0e276f")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "24px" }}>
                    {testType === "listening" ? "🎧" : "📖"}
                  </span>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: "16px" }}>
                      {test.title || `${activeTestType.toUpperCase()} ${testType.charAt(0).toUpperCase() + testType.slice(1)} ${index + 1}`}
                    </h3>
                    <div style={{ fontSize: "13px", opacity: 0.85 }}>
                      📚 {test.classCode || "N/A"} • 👨‍🏫 {test.teacherName || "N/A"} • 📊 {test.totalQuestions || config.totalQuestions || "?"} câu • ⏱️ {config.duration || 30} phút
                    </div>
                  </div>
                </div>
              </button>
              {isTeacher && (
                <button
                  onClick={() => handleEdit(test.id, testType)}
                  style={{
                    backgroundColor: "#f59e0b",
                    color: "white",
                    border: "none",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                    minWidth: "90px",
                  }}
                >
                  ✏️ Sửa
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {isTeacher ? <AdminNavbar /> : <StudentNavbar />}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 20px",
          fontFamily: "sans-serif",
          backgroundColor: "#f4f8ff",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: "900px",
            width: "100%",
            backgroundColor: "white",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            padding: "30px",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <img
              src={hostPath("uploads/staredu.jpg")}
              alt="StarEdu"
              style={{ height: 60, marginBottom: 12 }}
            />
            <h1 style={{ margin: "0", fontSize: "24px", color: "#0e276f" }}>
              🎓 Bài Thi Cambridge English
            </h1>
            <p style={{ margin: "8px 0 0", color: "#666" }}>
              Chọn loại bài thi và đề bạn muốn làm
            </p>
          </div>

          {/* Test Type Selector */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "20px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {testTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setActiveTestType(type.id)}
                style={{
                  padding: "10px 16px",
                  backgroundColor: activeTestType === type.id ? "#0e276f" : "#f1f5f9",
                  color: activeTestType === type.id ? "white" : "#374151",
                  border: activeTestType === type.id ? "2px solid #0e276f" : "2px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: activeTestType === type.id ? 600 : 500,
                  fontSize: "14px",
                  transition: "all 0.2s",
                }}
              >
                {type.icon} {type.name}
              </button>
            ))}
          </div>

          {/* Skill Tab Navigation */}
          <div
            style={{
              display: "flex",
              gap: "0",
              marginBottom: "24px",
              borderBottom: "2px solid #e5e7eb",
            }}
          >
            {["listening", "reading"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "14px 28px",
                  backgroundColor: "transparent",
                  color: activeTab === tab ? "#0e276f" : "#6b7280",
                  border: "none",
                  borderBottom: activeTab === tab ? "3px solid #0e276f" : "3px solid transparent",
                  cursor: "pointer",
                  fontWeight: activeTab === tab ? 700 : 500,
                  fontSize: "16px",
                  transition: "all 0.2s",
                  marginBottom: "-2px",
                }}
              >
                {tab === "listening" ? "🎧 Listening" : "📖 Reading"}
                <span
                  style={{
                    marginLeft: "8px",
                    padding: "2px 8px",
                    backgroundColor: activeTab === tab ? "#0e276f" : "#e5e7eb",
                    color: activeTab === tab ? "white" : "#6b7280",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                >
                  {tests[tab].length}
                </span>
              </button>
            ))}
          </div>

          {/* Test Info Banner */}
          <div
            style={{
              padding: "16px 20px",
              backgroundColor: "#f0f9ff",
              borderRadius: "10px",
              marginBottom: "20px",
              border: "1px solid #bae6fd",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "28px" }}>
                {testTypes.find((t) => t.id === activeTestType)?.icon}
              </span>
              <div>
                <h3 style={{ margin: "0 0 4px", color: "#0369a1", fontSize: "16px" }}>
                  {testTypes.find((t) => t.id === activeTestType)?.name} - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#0284c7" }}>
                  {getTestConfig(activeTab).totalQuestions || "?"} câu hỏi • {getTestConfig(activeTab).parts || "?"} parts • {getTestConfig(activeTab).duration || "?"} phút
                </p>
              </div>
            </div>
          </div>

          {/* Test List */}
          {renderTestList(tests[activeTab], activeTab)}

          {/* Teacher Quick Actions */}
          {isTeacher && tests[activeTab].length > 0 && (
            <div style={{ marginTop: "24px", textAlign: "center" }}>
              <button
                onClick={() => navigate(`/admin/create-${activeTestType}-${activeTab}`)}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#22c55e",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "15px",
                }}
              >
                ➕ Tạo đề {activeTestType.toUpperCase()} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} mới
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SelectCambridgeTest;
