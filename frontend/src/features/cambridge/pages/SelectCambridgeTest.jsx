import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StudentNavbar, AdminNavbar } from "../../../shared/components";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";
import { canManageCategory } from "../../../shared/utils/permissions";
import "./SelectCambridgeTest.css";

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
      navigate(`/cambridge/listening/${testId}/edit`);
    } else {
      navigate(`/cambridge/reading/${testId}/edit`);
    }
  };

  const getTestConfig = (type) => {
    const key = `${activeTestType}-${type}`;
    return TEST_CONFIGS[key] || {};
  };

  const renderTestList = (testList, testType) => {
    if (loading) {
      return (
        <div className="cambridge-state cambridge-loading">
          <div className="cambridge-state__icon">⏳</div>
          Đang tải danh sách đề...
        </div>
      );
    }

    if (error) {
      return (
        <div className="cambridge-state cambridge-error">
          <div className="cambridge-state__icon">❌</div>
          {error}
        </div>
      );
    }

    if (testList.length === 0) {
      return (
        <div className="cambridge-state cambridge-empty">
          <div className="cambridge-state__icon cambridge-state__icon--large">📭</div>
          <p>Chưa có đề {testType === "listening" ? "Listening" : "Reading"} cho {activeTestType.toUpperCase()}</p>
          {canManageCategory(user, testType) && (
            <button
              onClick={() => navigate(`/admin/create-${activeTestType}-${testType}`)}
              className="cambridge-btn cambridge-btn--success"
            >
              ➕ Tạo đề mới
            </button>
          )}
        </div>
      );
    }

    const config = getTestConfig(testType);

    return (
      <div className="cambridge-test-list">
        {testList.map((test, index) => (
          <div
            key={test.id}
            className="cambridge-test-item"
          >
            <div className="cambridge-test-row">
              <button
                onClick={() => {
                  if (testType === "listening") handleSelectListening(test.id);
                  else handleSelectReading(test.id);
                }}
                className="cambridge-test-main"
              >
                <div className="cambridge-test-main__content">
                  <span className="cambridge-test-main__icon">
                    {testType === "listening" ? "🎧" : "📖"}
                  </span>
                  <div>
                    <h3 className="cambridge-test-main__title">
                      {test.title || `${activeTestType.toUpperCase()} ${testType.charAt(0).toUpperCase() + testType.slice(1)} ${index + 1}`}
                    </h3>
                    <div className="cambridge-test-main__meta">
                      📚 {test.classCode || "N/A"} • 👨‍🏫 {test.teacherName || "N/A"} • 📊 {config.totalQuestions || test.totalQuestions || "?"} câu • ⏱️ {config.duration || 30} phút
                    </div>
                  </div>
                </div>
              </button>
              {canManageCategory(user, testType) && (
                <button
                  onClick={() => handleEdit(test.id, testType)}
                  className="cambridge-btn cambridge-btn--warning"
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
      <div className="cambridge-page">
        <div className="cambridge-card">
          <div className="cambridge-header">
            <img
              src={hostPath("uploads/staredu.jpg")}
              alt="StarEdu"
              className="cambridge-header__logo"
            />
            <h1 className="cambridge-header__title">🎓 Bài Thi Cambridge English</h1>
            <p className="cambridge-header__subtitle">Chọn loại bài thi và đề bạn muốn làm</p>
          </div>

          <div className="cambridge-type-list">
            {testTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setActiveTestType(type.id)}
                className={`cambridge-type-btn${activeTestType === type.id ? " cambridge-type-btn--active" : ""}`}
              >
                {type.icon} {type.name}
              </button>
            ))}
          </div>

          <div className="cambridge-tabs">
            {["listening", "reading"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`cambridge-tab${activeTab === tab ? " cambridge-tab--active" : ""}`}
              >
                {tab === "listening" ? "🎧 Listening" : "📖 Reading"}
                <span className="cambridge-tab__badge">{tests[tab].length}</span>
              </button>
            ))}
          </div>

          <div className="cambridge-info">
            <div className="cambridge-info__icon">
              {testTypes.find((t) => t.id === activeTestType)?.icon}
            </div>
            <div>
              <h3 className="cambridge-info__title">
                {testTypes.find((t) => t.id === activeTestType)?.name} - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h3>
              <p className="cambridge-info__meta">
                {getTestConfig(activeTab).totalQuestions || "?"} câu hỏi • {getTestConfig(activeTab).parts || "?"} parts • {getTestConfig(activeTab).duration || "?"} phút
              </p>
            </div>
          </div>

          {renderTestList(tests[activeTab], activeTab)}

          {canManageCategory(user, activeTab) && tests[activeTab].length > 0 && (
            <div className="cambridge-actions">
              <button
                onClick={() => navigate(`/admin/create-${activeTestType}-${activeTab}`)}
                className="cambridge-btn cambridge-btn--success"
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
