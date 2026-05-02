import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LineIcon from "../../../shared/components/LineIcon";
import { apiPath } from "../../../shared/utils/api";
import {
  buildPlacementAttemptItemRuntimePath,
  buildPlacementSharePath,
  getPlacementItemSummaryCounts,
} from "../../../shared/utils/placementTests";
import "./PlacementEntry.css";

const formatPercentage = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return `${Math.round(numeric)}%`;
};

const getStatusLabel = (status) => {
  if (status === "submitted") return "Completed";
  if (status === "started") return "In progress";
  return "Ready";
};

const PlacementAttempt = () => {
  const { attemptToken } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchAttempt = async () => {
      if (!attemptToken) {
        setAttempt(null);
        setLoading(false);
        setError("This placement attempt link is incomplete.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const res = await fetch(apiPath(`placement/attempts/${encodeURIComponent(attemptToken)}`));
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.message || "Could not load the placement attempt.");
        }

        if (!isMounted) return;
        setAttempt(data || null);
      } catch (fetchError) {
        if (!isMounted) return;
        setAttempt(null);
        setError(fetchError?.message || "Could not load the placement attempt.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAttempt();

    return () => {
      isMounted = false;
    };
  }, [attemptToken]);

  const items = Array.isArray(attempt?.items) ? attempt.items : [];
  const summary = useMemo(
    () => attempt?.summary || getPlacementItemSummaryCounts(items),
    [attempt?.summary, items]
  );
  const sharePath = useMemo(
    () => buildPlacementSharePath(attempt?.shareToken),
    [attempt?.shareToken]
  );

  return (
    <div className="placement-entry-page">
      <div className="placement-entry-shell">
        <section className="placement-entry-hero">
          <div className="placement-entry-heroTop">
            <Link to={sharePath} className="placement-entry-backLink">
              <LineIcon name="tests" size={16} />
              <span>Back to Placement Link</span>
            </Link>
          </div>

          <div className="placement-entry-heroCopy">
            <span className="placement-entry-eyebrow">Placement Attempt</span>
            <h1 className="placement-entry-title">Assigned tests and summary progress</h1>
            <p className="placement-entry-text">
              Continue the assigned placement tests from any device using the same student phone number.
            </p>
          </div>

          <div className="placement-entry-pillRow">
            <span className="placement-entry-pill">
              <LineIcon name="form" size={14} />
              <span>{attempt?.studentName || "Student"}</span>
            </span>
            <span className="placement-entry-pill">
              <LineIcon name="phone" size={14} />
              <span>{attempt?.studentPhone || "No phone"}</span>
            </span>
            <span className="placement-entry-pill">
              <LineIcon name="tests" size={14} />
              <span>{summary.submitted}/{summary.total} completed</span>
            </span>
          </div>
        </section>

        <section className="placement-entry-grid">
          <article className="placement-entry-card placement-entry-card--form">
            <div className="placement-entry-cardHeader">
              <span className="placement-entry-cardIcon" aria-hidden="true">
                <LineIcon name="target" size={18} />
              </span>
              <div>
                <h2 className="placement-entry-cardTitle">Attempt summary</h2>
                <p className="placement-entry-cardText">
                  Students only see overall progress here. Detailed review remains in the teacher area.
                </p>
              </div>
            </div>

            <div className="placement-entry-statsGrid">
              <div className="placement-entry-statCard">
                <strong>{summary.total}</strong>
                <span>Assigned</span>
              </div>
              <div className="placement-entry-statCard">
                <strong>{summary.started}</strong>
                <span>In progress</span>
              </div>
              <div className="placement-entry-statCard">
                <strong>{summary.submitted}</strong>
                <span>Completed</span>
              </div>
            </div>

            {loading ? (
              <p className="placement-entry-message">Loading attempt data.</p>
            ) : error ? (
              <p className="placement-entry-message">{error}</p>
            ) : null}
          </article>

          <article className="placement-entry-card placement-entry-card--list">
            <div className="placement-entry-cardHeader">
              <span className="placement-entry-cardIcon" aria-hidden="true">
                <LineIcon name="tests" size={18} />
              </span>
              <div>
                <h2 className="placement-entry-cardTitle">Assigned tests</h2>
                <p className="placement-entry-cardText">
                  Start or continue each test. Completed items stay here as a simple summary.
                </p>
              </div>
            </div>

            {!loading && !items.length ? (
              <div className="placement-entry-emptyState">
                <span className="placement-entry-emptyIcon" aria-hidden="true">
                  <LineIcon name="tests" size={22} />
                </span>
                <h3>No assigned tests found</h3>
                <p>This attempt does not contain any placement test items yet.</p>
              </div>
            ) : (
              <div className="placement-entry-list">
                {items.map((item, index) => {
                  const runtimePath = buildPlacementAttemptItemRuntimePath(item, attemptToken);
                  const scoreLine = item.status === "submitted"
                    ? [
                        Number.isFinite(Number(item.correct)) && Number.isFinite(Number(item.totalQuestions))
                          ? `${item.correct}/${item.totalQuestions}`
                          : null,
                        formatPercentage(item.percentage),
                      ]
                        .filter(Boolean)
                        .join(" • ")
                    : "";

                  return (
                    <div key={item.attemptItemToken || `${item.testId}-${index}`} className="placement-entry-testCard">
                      <div className="placement-entry-testHeader">
                        <span className="placement-entry-testNumber">#{index + 1}</span>
                        <span className="placement-entry-testBadge">{getStatusLabel(item.status)}</span>
                      </div>

                      <h3 className="placement-entry-testTitle">{item.title}</h3>

                      {item.subtitle ? (
                        <p className="placement-entry-testSubtitle">{item.subtitle}</p>
                      ) : null}

                      <div className="placement-entry-testMeta">
                        <span>{item.platform === "orange" ? "Orange" : "IX"}</span>
                        <span>{item.skill}</span>
                        {item.questionsLabel ? <span>{item.questionsLabel}</span> : null}
                        {item.durationLabel ? <span>{item.durationLabel}</span> : null}
                      </div>

                      {scoreLine ? (
                        <p className="placement-entry-note">Score summary: {scoreLine}</p>
                      ) : null}

                      {item.status === "submitted" ? (
                        <button type="button" className="placement-entry-primaryButton" disabled>
                          <LineIcon name="tests" size={16} />
                          <span>Completed</span>
                        </button>
                      ) : (
                        <Link to={runtimePath} className="placement-entry-primaryButton placement-entry-primaryButton--link">
                          <LineIcon name="target" size={16} />
                          <span>{item.status === "started" ? "Continue Test" : "Start Test"}</span>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>
      </div>
    </div>
  );
};

export default PlacementAttempt;