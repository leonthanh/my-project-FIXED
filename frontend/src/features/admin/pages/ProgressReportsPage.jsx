import React, { useEffect, useState } from "react";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { apiPath, authFetch } from "../../../shared/utils/api";
import "./ProgressReportsPage.css";

const REPORT_TOOLS = [
  {
    id: "general",
    label: "Star Edu",
    title: "Star Edu Progress Report",
  },
  {
    id: "ielts",
    label: "IELTS",
    title: "Star Edu IELTS Progress Report",
  },
];

const ProgressReportsPage = () => {
  const [activeReportId, setActiveReportId] = useState(REPORT_TOOLS[0].id);
  const [reportHtml, setReportHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reportError, setReportError] = useState("");
  const activeReport = REPORT_TOOLS.find((report) => report.id === activeReportId) || REPORT_TOOLS[0];

  useEffect(() => {
    let isCurrent = true;

    setReportHtml("");
    setReportError("");
    setIsLoading(true);

    const loadReport = async () => {
      try {
        const response = await authFetch(apiPath(`progress-reports/${activeReport.id}`));
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
          }
          if (response.status === 403) {
            throw new Error("Tài khoản của bạn không có quyền xem báo cáo.");
          }
          throw new Error(`Không thể tải mẫu báo cáo (HTTP ${response.status}).`);
        }

        const html = await response.text();
        if (!html.trim()) throw new Error("Mẫu báo cáo không có nội dung.");
        if (isCurrent) setReportHtml(html);
      } catch (error) {
        if (isCurrent) {
          setReportError(error instanceof Error ? error.message : "Không thể tải mẫu báo cáo.");
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void loadReport();
    return () => {
      isCurrent = false;
    };
  }, [activeReport.id]);

  return (
    <>
      <AdminNavbar />
      <main className="progressReportsPage">
        <header className="progressReportsPage__header">
          <div>
            <h1>Progress Reports</h1>
            <p>Chọn bộ mẫu nhận xét để tạo báo cáo và xuất Word hoặc PDF.</p>
          </div>
        </header>

        <div className="progressReportsPage__tabs" role="tablist" aria-label="Report type">
          {REPORT_TOOLS.map((report) => (
            <button
              key={report.id}
              id={`progress-report-tab-${report.id}`}
              type="button"
              role="tab"
              aria-selected={activeReport.id === report.id}
              aria-controls="progress-report-panel"
              className={`progressReportsPage__tab${
                activeReport.id === report.id ? " progressReportsPage__tab--active" : ""
              }`}
              onClick={() => setActiveReportId(report.id)}
            >
              {report.label}
            </button>
          ))}
        </div>

        <section
          id="progress-report-panel"
          className="progressReportsPage__panel"
          role="tabpanel"
          aria-labelledby={`progress-report-tab-${activeReport.id}`}
        >
          {isLoading && (
            <p className="progressReportsPage__status" role="status">
              Đang tải mẫu báo cáo...
            </p>
          )}
          {reportError && (
            <p className="progressReportsPage__status progressReportsPage__status--error" role="alert">
              {reportError}
            </p>
          )}
          {!isLoading && !reportError && (
            <iframe
              key={activeReport.id}
              className="progressReportsPage__frame"
              srcDoc={reportHtml}
              title={activeReport.title}
            />
          )}
        </section>
      </main>
    </>
  );
};

export default ProgressReportsPage;
