import React, { useState } from "react";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import "./ProgressReportsPage.css";

const REPORT_TOOLS = [
  {
    id: "general",
    label: "Star Edu",
    title: "Star Edu Progress Report",
    src: "/progress-reports/progress-report.html",
  },
  {
    id: "ielts",
    label: "IELTS",
    title: "Star Edu IELTS Progress Report",
    src: "/progress-reports/ielts-progress-report.html",
  },
];

const ProgressReportsPage = () => {
  const [activeReportId, setActiveReportId] = useState(REPORT_TOOLS[0].id);
  const activeReport = REPORT_TOOLS.find((report) => report.id === activeReportId);

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
          <iframe
            key={activeReport.id}
            className="progressReportsPage__frame"
            src={activeReport.src}
            title={activeReport.title}
          />
        </section>
      </main>
    </>
  );
};

export default ProgressReportsPage;
