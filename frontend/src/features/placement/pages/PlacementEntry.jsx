import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import LineIcon from "../../../shared/components/LineIcon";
import { apiPath } from "../../../shared/utils/api";
import {
  buildPlacementAttemptPath,
  buildPlacementSharePath,
  getPlacementItemSummaryCounts,
  readPlacementLeadDraft,
  savePlacementLeadDraft,
} from "../../../shared/utils/placementTests";
import "./PlacementEntry.css";

const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;

const normalizePlacementValue = (value) => String(value || "").trim().toLowerCase();

const SKILL_ORDER = {
  writing: 0,
  reading: 1,
  listening: 2,
};

const ORANGE_LEVEL_ORDER = {
  ket: 0,
  pet: 1,
  flyers: 2,
  flyer: 2,
  movers: 3,
  mover: 3,
  starters: 4,
  starter: 4,
};

const getSkillRank = (skill) => {
  const normalizedSkill = normalizePlacementValue(skill);
  return Object.prototype.hasOwnProperty.call(SKILL_ORDER, normalizedSkill)
    ? SKILL_ORDER[normalizedSkill]
    : 99;
};

const getOrangeLevelRank = (item) => {
  const candidates = [item?.testType, item?.badge, item?.title, item?.subtitle]
    .map(normalizePlacementValue)
    .filter(Boolean);

  for (const candidate of candidates) {
    for (const [level, rank] of Object.entries(ORANGE_LEVEL_ORDER)) {
      if (candidate.includes(level)) {
        return rank;
      }
    }
  }

  return 99;
};

const comparePlacementItems = (platform, left, right) => {
  if (platform === "orange") {
    const levelDelta = getOrangeLevelRank(left) - getOrangeLevelRank(right);
    if (levelDelta !== 0) {
      return levelDelta;
    }
  }

  const skillDelta = getSkillRank(left?.skill) - getSkillRank(right?.skill);
  if (skillDelta !== 0) {
    return skillDelta;
  }

  const badgeDelta = normalizePlacementValue(left?.badge).localeCompare(normalizePlacementValue(right?.badge));
  if (badgeDelta !== 0 && platform === "orange") {
    return badgeDelta;
  }

  const titleDelta = normalizePlacementValue(left?.title).localeCompare(normalizePlacementValue(right?.title));
  if (titleDelta !== 0) {
    return titleDelta;
  }

  return Number(left?.sortOrder || 0) - Number(right?.sortOrder || 0);
};

const PlacementEntry = () => {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(() => readPlacementLeadDraft());
  const [message, setMessage] = useState("");
  const [savedLead, setSavedLead] = useState(false);
  const [placementPackage, setPlacementPackage] = useState(null);
  const [loadingPackage, setLoadingPackage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const groupRefs = useRef({});

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
      return null;
    }
  }, []);

  const isTeacher = currentUser?.role === "teacher" || currentUser?.role === "admin";

  useEffect(() => {
    let isMounted = true;

    const fetchPlacementPackage = async () => {
      try {
        setLoadingPackage(true);
        const endpoint = shareToken
          ? `placement/packages/share/${encodeURIComponent(shareToken)}`
          : "placement/packages/public-default";
        const res = await fetch(apiPath(endpoint));
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.message || "Could not load the placement package.");
        }

        if (!isMounted) return;
        setPlacementPackage(data || null);
      } catch (fetchError) {
        if (!isMounted) return;
        setPlacementPackage(null);
        setMessage(fetchError?.message || "Could not load the placement package.");
        setSavedLead(false);
      } finally {
        if (isMounted) {
          setLoadingPackage(false);
        }
      }
    };

    fetchPlacementPackage();

    return () => {
      isMounted = false;
    };
  }, [shareToken]);

  const selections = useMemo(
    () => (Array.isArray(placementPackage?.items) ? placementPackage.items : []),
    [placementPackage?.items]
  );

  const selectionSummary = useMemo(() => {
    return getPlacementItemSummaryCounts(selections);
  }, [selections]);

  const groupedSelections = useMemo(() => {
    const buckets = {
      ix: [],
      orange: [],
    };
    const extraBuckets = new Map();

    selections.forEach((item) => {
      const platform = String(item?.platform || "").trim().toLowerCase();

      if (platform === "ix" || platform === "orange") {
        buckets[platform].push(item);
        return;
      }

      const fallbackPlatform = platform || "other";
      if (!extraBuckets.has(fallbackPlatform)) {
        extraBuckets.set(fallbackPlatform, []);
      }
      extraBuckets.get(fallbackPlatform).push(item);
    });

    let runningIndex = 0;

    return [["ix", buckets.ix], ["orange", buckets.orange], ...Array.from(extraBuckets.entries())]
      .filter(([, items]) => items.length > 0)
      .map(([platform, items]) => {
        const accent = platform === "orange" ? "orange" : "ix";
        const sortedItems = [...items].sort((left, right) => comparePlacementItems(platform, left, right));
        const title =
          platform === "orange"
            ? "Orange tests"
            : platform === "ix"
              ? "IX tests"
              : `${platform.toUpperCase()} tests`;

        const startIndex = runningIndex;
        runningIndex += sortedItems.length;

        return {
          platform,
          accent,
          title,
          items: sortedItems,
          startIndex,
        };
      });
  }, [selections]);

  const sharePath = useMemo(() => buildPlacementSharePath(shareToken), [shareToken]);
  const activeShareToken = String(shareToken || placementPackage?.shareToken || "").trim();
  const backPath = isTeacher ? "/select-test" : "/login";

  const handleLeadChange = (field) => (event) => {
    const nextValue = event.target.value;
    setLead((current) => ({ ...current, [field]: nextValue }));
  };

  const handleJumpToGroup = (platform) => {
    const nextGroup = groupRefs.current?.[platform];
    if (!nextGroup) {
      return;
    }

    const nextTop = window.scrollY + nextGroup.getBoundingClientRect().top - 20;
    window.scrollTo({ top: Math.max(nextTop, 0), behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextName = String(lead?.name || "").trim();
    const nextPhone = String(lead?.phone || "").trim();

    if (!nextName || !nextPhone) {
      setSavedLead(false);
      setMessage("Please enter both the student name and phone number.");
      return;
    }

    if (!vnPhoneRegex.test(nextPhone)) {
      setSavedLead(false);
      setMessage("Please enter a valid Vietnamese phone number.");
      return;
    }

    if (!activeShareToken) {
      setSavedLead(false);
      setMessage("No placement tests are published right now. Ask the teacher to turn tests on first.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");
      savePlacementLeadDraft({ name: nextName, phone: nextPhone });
      setLead({ name: nextName, phone: nextPhone });

      const res = await fetch(
        apiPath(`placement/packages/share/${encodeURIComponent(activeShareToken)}/attempts`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName: nextName,
            studentPhone: nextPhone,
          }),
        }
      );
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Could not start the placement attempt.");
      }

      setSavedLead(true);
      navigate(buildPlacementAttemptPath(data?.attemptToken));
    } catch (submitError) {
      setSavedLead(false);
      setMessage(submitError?.message || "Could not start the placement attempt.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="placement-entry-page">
      <div className="placement-entry-shell">
        <section className="placement-entry-grid">
          <div className="placement-entry-sidebar">
            <section className="placement-entry-hero">
              <div className="placement-entry-heroTop">
                <Link to={backPath} className="placement-entry-backLink">
                  <LineIcon name="tests" size={16} />
                  <span>{isTeacher ? "Back to Test List" : "Back to Login"}</span>
                </Link>

                {isTeacher && shareToken ? (
                  <Link to={sharePath} className="placement-entry-previewLink">
                    <LineIcon name="link" size={16} />
                    <span>Refresh Preview Link</span>
                  </Link>
                ) : null}
              </div>

              <div className="placement-entry-pillRow">
                <span className="placement-entry-pill">
                  <LineIcon name="tests" size={14} />
                  <span>{selections.length} assigned test{selections.length === 1 ? "" : "s"}</span>
                </span>
                <span className="placement-entry-pill">
                  <LineIcon name="writing" size={14} />
                  <span>{selectionSummary.writing} writing</span>
                </span>
                <span className="placement-entry-pill">
                  <LineIcon name="reading" size={14} />
                  <span>{selectionSummary.reading} reading</span>
                </span>
                <span className="placement-entry-pill">
                  <LineIcon name="listening" size={14} />
                  <span>{selectionSummary.listening} listening</span>
                </span>
                <span className="placement-entry-pill">
                  <LineIcon name="target" size={14} />
                  <span>{selectionSummary.ix} IX • {selectionSummary.orange} Orange</span>
                </span>
              </div>
            </section>

            <article className="placement-entry-card placement-entry-card--form">
              <div className="placement-entry-cardHeader">
                <span className="placement-entry-cardIcon" aria-hidden="true">
                  <LineIcon name="form" size={18} />
                </span>
                <div>
                  <h2 className="placement-entry-cardTitle">Student entry</h2>
                </div>
              </div>

              <form className="placement-entry-form" onSubmit={handleSubmit}>
                <label className="placement-entry-field">
                  <span>Student name</span>
                  <input
                    type="text"
                    value={lead?.name || ""}
                    onChange={handleLeadChange("name")}
                    placeholder="Nguyen Van A"
                  />
                </label>

                <label className="placement-entry-field">
                  <span>Phone number</span>
                  <input
                    type="tel"
                    value={lead?.phone || ""}
                    onChange={handleLeadChange("phone")}
                    placeholder="0912345678"
                  />
                </label>

                <button type="submit" className="placement-entry-primaryButton" disabled={submitting || loadingPackage}>
                  <LineIcon name="save" size={16} />
                  <span>{submitting ? "Starting Placement" : "Continue to Assigned Tests"}</span>
                </button>
              </form>

              {message ? (
                <p className={`placement-entry-message${savedLead ? " is-success" : ""}`}>{message}</p>
              ) : null}
            </article>
          </div>

          <article className="placement-entry-card placement-entry-card--list">
            <div className="placement-entry-cardHeader">
              <span className="placement-entry-cardIcon" aria-hidden="true">
                <LineIcon name="target" size={18} />
              </span>
              <div>
                <h2 className="placement-entry-cardTitle">Assigned test list</h2>
              </div>
            </div>

            {groupedSelections.length > 1 ? (
              <div className="placement-entry-jumpNav" aria-label="Jump to test platform">
                {groupedSelections.map((group) => (
                  <button
                    key={group.platform}
                    type="button"
                    className={`placement-entry-jumpButton placement-entry-jumpButton--${group.accent}`}
                    onClick={() => handleJumpToGroup(group.platform)}
                  >
                    <span>{group.platform === "orange" ? "Orange" : group.platform === "ix" ? "IX" : group.platform.toUpperCase()}</span>
                    <span className="placement-entry-jumpCount">{group.items.length}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {loadingPackage ? (
              <div className="placement-entry-emptyState">
                <span className="placement-entry-emptyIcon" aria-hidden="true">
                  <LineIcon name="tests" size={22} />
                </span>
                <h3>Loading placement package</h3>
                <p>Checking the tests assigned to this placement link.</p>
              </div>
            ) : selections.length === 0 ? (
              <div className="placement-entry-emptyState">
                <span className="placement-entry-emptyIcon" aria-hidden="true">
                  <LineIcon name="tests" size={22} />
                </span>
                <h3>No placement tests are showing yet</h3>
                <p>
                  {shareToken
                    ? "Ask the teacher to update this placement package or turn tests on from the test list first."
                    : "No placement tests are published right now. Ask the teacher to turn tests on from the test list first."}
                </p>
              </div>
            ) : (
              <div className="placement-entry-groupList">
                {groupedSelections.map((group) => (
                  <section
                    key={group.platform}
                    className="placement-entry-group"
                    ref={(node) => {
                      if (node) {
                        groupRefs.current[group.platform] = node;
                      } else {
                        delete groupRefs.current[group.platform];
                      }
                    }}
                  >
                    <div className="placement-entry-groupHeader">
                      <div className="placement-entry-groupTitleRow">
                        <span className={`placement-entry-groupPill placement-entry-groupPill--${group.accent}`}>
                          {group.platform === "orange" ? "Orange" : group.platform === "ix" ? "IX" : group.platform.toUpperCase()}
                        </span>
                        <h3 className="placement-entry-groupTitle">{group.title}</h3>
                      </div>
                      <span className="placement-entry-groupCount">
                        {group.items.length} test{group.items.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="placement-entry-list">
                      {group.items.map((item, index) => {
                        const itemAccent = item.platform === "orange" ? "orange" : "ix";

                        return (
                          <div
                            key={item.id || item.attemptItemToken || `${item.platform}-${item.testType || item.skill}-${item.testId}-${item.sortOrder ?? index}`}
                            className={`placement-entry-testCard placement-entry-testCard--${itemAccent}`}
                          >
                            <div className="placement-entry-testHeader">
                              <span className="placement-entry-testNumber">#{group.startIndex + index + 1}</span>
                              <span className={`placement-entry-testBadge placement-entry-testBadge--${itemAccent}`}>
                                {item.badge || item.platform.toUpperCase()}
                              </span>
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
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </div>
  );
};

export default PlacementEntry;