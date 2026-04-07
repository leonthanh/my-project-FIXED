import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentNavbar from "../../../shared/components/StudentNavbar";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import LineIcon from "../../../shared/components/LineIcon";
import { apiPath, hostPath } from "../../../shared/utils/api";
import { TEST_CONFIGS } from "../../../shared/config/questionTypes";
import { canManageCategory } from "../../../shared/utils/permissions";
import "./SelectCambridgeTest.css";

const SelectOrangeIcon = ({ name, size = 18, className }) => (
  <span className={["cambridge-inlineIcon", className].filter(Boolean).join(" ")} aria-hidden="true">
    <LineIcon name={name} size={size} />
  </span>
);

/**
 * SelectCambridgeTest - Trang chọn đề Orange cho học sinh
 * Hiển thị danh sách đề KET, PET, FLYERS, MOVERS, STARTERS
 */
const SelectCambridgeTest = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const isTeacher = user && (user.role === "teacher" || user.role === "admin");
  const navigate = useNavigate();

  const [tests, setTests] = useState({
    listening: [],
    reading: [],
    writing: [],
  });
  const [activeTab, setActiveTab] = useState("listening");
  const [activeTestType, setActiveTestType] = useState("ket");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Test type options
  const testTypes = [
    { id: "ket", name: "KET (A2 Key)", iconName: "key" },
    { id: "pet", name: "PET (B1 Preliminary)", iconName: "pet" },
    { id: "flyers", name: "Flyers (A2)", iconName: "flyers" },
    { id: "movers", name: "Movers (A1)", iconName: "movers" },
    { id: "starters", name: "Starters (Pre-A1)", iconName: "starters" },
  ];

  // Types where reading tests are stored with just the base name (no '-reading' suffix)
  const BASE_TYPE_ONLY = ['movers', 'flyers', 'starters'];

  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
        setError(null);

        const readingTestType = BASE_TYPE_ONLY.includes(activeTestType)
          ? activeTestType
          : `${activeTestType}-reading`;

        const requests = [
          fetch(apiPath(`cambridge/listening-tests?testType=${activeTestType}-listening`)),
          fetch(apiPath(`cambridge/reading-tests?testType=${readingTestType}`)),
        ];

        if (activeTestType === "pet") {
          requests.push(fetch(apiPath("writing-tests?testType=pet-writing")));
        }

        const responses = await Promise.all(requests);
        const listeningRes = responses[0];
        const readingRes = responses[1];
        const writingRes = responses[2];

        if (!listeningRes.ok || !readingRes.ok) {
          throw new Error("Không thể tải danh sách đề");
        }

        const listeningData = await listeningRes.json();
        const readingData = await readingRes.json();
        const writingData = writingRes ? await writingRes.json() : [];

        setTests({
          listening: Array.isArray(listeningData) ? listeningData : [],
          reading: Array.isArray(readingData) ? readingData : [],
          writing: Array.isArray(writingData) ? writingData : [],
        });
      } catch (err) {
        console.error("Lỗi khi tải đề Orange:", err);
        setError(err.message);
        setTests({ listening: [], reading: [], writing: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [activeTestType]);

  useEffect(() => {
    if (activeTestType !== "pet" && activeTab === "writing") {
      setActiveTab("listening");
    }
  }, [activeTestType, activeTab]);

  const handleSelectListening = (testId) => {
    navigate(`/cambridge/${activeTestType}-listening/${testId}`);
  };

  const handleSelectReading = (testId) => {
    navigate(`/cambridge/${activeTestType}-reading/${testId}`);
  };

  const handleSelectWriting = (testId) => {
    const numericId = parseInt(testId, 10);
    if (!numericId || isNaN(numericId)) return;
    localStorage.setItem("selectedPetWritingTestId", numericId);
    localStorage.removeItem("selectedTestId");
    navigate("/pet-writing");
  };

  const handleEdit = (testId, testType) => {
    if (testType === "listening") {
      navigate(`/cambridge/listening/${testId}/edit`);
    } else if (testType === "reading") {
      navigate(`/cambridge/reading/${testId}/edit`);
    } else if (testType === "writing") {
      navigate(`/admin/edit-pet-writing/${testId}`);
    }
  };

  const getTestConfig = (type) => {
    if (type === "writing") {
      return TEST_CONFIGS["pet-writing"] || {};
    }
    const key = `${activeTestType}-${type}`;
    // movers/flyers/starters are keyed by base name only (e.g. 'movers', not 'movers-reading')
    return TEST_CONFIGS[key] || TEST_CONFIGS[activeTestType] || {};
  };

  const renderTestList = (testList, testType) => {
    if (loading) {
      return (
        <div className="cambridge-state cambridge-loading">
          <SelectOrangeIcon name="loading" size={32} className="cambridge-state__icon" />
          Đang tải danh sách đề...
        </div>
      );
    }

    if (error) {
      return (
        <div className="cambridge-state cambridge-error">
          <SelectOrangeIcon name="error" size={32} className="cambridge-state__icon" />
          {error}
        </div>
      );
    }

    if (testList.length === 0) {
      return (
        <div className="cambridge-state cambridge-empty">
          <SelectOrangeIcon name="empty" size={44} className="cambridge-state__icon cambridge-state__icon--large" />
          <p>
            Chưa có đề {testType === "listening" ? "Listening" : testType === "reading" ? "Reading" : "Writing"} cho {activeTestType.toUpperCase()}
          </p>
          {canManageCategory(user, testType) && (
            <button
              onClick={() =>
                testType === "writing"
                  ? navigate("/admin/create-pet-writing")
                  : navigate(`/admin/create-${activeTestType}-${testType}`)
              }
              className="cambridge-btn cambridge-btn--success"
            >
              <SelectOrangeIcon name="create" />
              <span>Tạo đề mới</span>
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
                  else if (testType === "reading") handleSelectReading(test.id);
                  else handleSelectWriting(test.id);
                }}
                className="cambridge-test-main"
              >
                <div className="cambridge-test-main__content">
                  <SelectOrangeIcon
                    name={testType === "listening" ? "listening" : testType === "reading" ? "reading" : "writing"}
                    size={22}
                    className="cambridge-test-main__icon"
                  />
                  <div>
                    <h3 className="cambridge-test-main__title">
                      {test.title || `${activeTestType.toUpperCase()} ${testType.charAt(0).toUpperCase() + testType.slice(1)} ${index + 1}`}
                    </h3>
                    <div className="cambridge-test-main__meta">
                      <span className="cambridge-test-main__metaItem">
                        <SelectOrangeIcon name="class" size={16} />
                        <span>{test.classCode || "N/A"}</span>
                      </span>
                      <span className="cambridge-test-main__metaItem">
                        <SelectOrangeIcon name="teacher" size={16} />
                        <span>{test.teacherName || "N/A"}</span>
                      </span>
                      <span className="cambridge-test-main__metaItem">
                        <SelectOrangeIcon name="questions" size={16} />
                        <span>{config.totalQuestions || test.totalQuestions || "?"} câu</span>
                      </span>
                      <span className="cambridge-test-main__metaItem">
                        <SelectOrangeIcon name="clock" size={16} />
                        <span>{config.duration || 30} phút</span>
                      </span>
                    </div>
                  </div>
                </div>
              </button>
              {canManageCategory(user, testType) && (
                <button
                  onClick={() => handleEdit(test.id, testType)}
                  className="cambridge-btn cambridge-btn--warning"
                >
                  <SelectOrangeIcon name="edit" />
                  <span>Sửa</span>
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
          <div className="cambridge-type-list">
            {testTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setActiveTestType(type.id)}
                className={`cambridge-type-btn${activeTestType === type.id ? " cambridge-type-btn--active" : ""}`}
              >
                <span className="cambridge-tabLabel">
                  <SelectOrangeIcon name={type.iconName} />
                  <span>{type.name}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="cambridge-tabs">
            {(activeTestType === "pet"
              ? ["listening", "reading", "writing"]
              : ["listening", "reading"]
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`cambridge-tab${activeTab === tab ? " cambridge-tab--active" : ""}`}
              >
                <span className="cambridge-tabLabel">
                  <SelectOrangeIcon
                    name={tab === "listening" ? "listening" : tab === "reading" ? "reading" : "writing"}
                  />
                  <span>
                    {tab === "listening"
                      ? "Listening"
                      : tab === "reading"
                      ? "Reading"
                      : "Writing"}
                  </span>
                </span>
                <span className="cambridge-tab__badge">{tests[tab].length}</span>
              </button>
            ))}
          </div>

          <div className="cambridge-info">
            <SelectOrangeIcon
              name={testTypes.find((t) => t.id === activeTestType)?.iconName}
              size={28}
              className="cambridge-info__icon"
            />
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
                onClick={() =>
                  activeTab === "writing"
                    ? navigate("/admin/create-pet-writing")
                    : navigate(`/admin/create-${activeTestType}-${activeTab}`)
                }
                className="cambridge-btn cambridge-btn--success"
              >
                <SelectOrangeIcon name="create" />
                <span>Tạo đề {activeTestType.toUpperCase()} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} mới</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SelectCambridgeTest;

