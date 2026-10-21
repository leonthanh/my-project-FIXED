import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { apiPath, authFetch } from "../../../shared/utils/api";
import "./ExamLevelsPage.css";

const groupTemplatesBySkill = (templates) => {
  const grouped = new Map();
  (Array.isArray(templates) ? templates : []).forEach((template) => {
    if (!template?.skill || !template?.templateId) return;
    const skill = grouped.get(template.skill) || {
      id: template.skill,
      label: template.label || template.skill,
      templates: [],
    };
    skill.templates.push(template);
    grouped.set(template.skill, skill);
  });
  return Array.from(grouped.values());
};

const createEmptyForm = (skills = []) => ({
  code: "",
  name: "",
  description: "",
  skills: skills.map(({ id }) => id),
  skillConfig: Object.fromEntries(
    skills.map(({ id, templates }) => [
      id,
      {
        templateId: templates[0].templateId,
        weight: 1,
        durationMinutes: templates[0].defaultDurationMinutes,
      },
    ])
  ),
  sortOrder: 0,
  isActive: true,
});

const requestJson = async (path, options = {}) => {
  const response = await authFetch(apiPath(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Request failed (${response.status}).`);
  }
  return payload;
};

const toForm = (level, skills) => ({
  ...createEmptyForm(skills),
  ...level,
  skills: [...level.skills],
  skillConfig: {
    ...createEmptyForm(skills).skillConfig,
    ...level.skillConfig,
  },
});

const ExamLevelsPage = () => {
  const [levels, setLevels] = useState([]);
  const [templates, setTemplates] = useState([]);
  const skillOptions = useMemo(() => groupTemplatesBySkill(templates), [templates]);
  const [form, setForm] = useState(() => createEmptyForm());
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadLevels = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [levelData, templateData] = await Promise.all([
        requestJson("exam-levels/admin"),
        requestJson("exam-levels/templates"),
      ]);
      setLevels(Array.isArray(levelData) ? levelData : []);
      setTemplates(Array.isArray(templateData) ? templateData : []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLevels();
  }, [loadLevels]);

  useEffect(() => {
    if (!editingId && !form.skills.length && skillOptions.length) {
      setForm(createEmptyForm(skillOptions));
    }
  }, [editingId, form.skills.length, skillOptions]);

  const updateFormField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleSkill = (skillId) => {
    setForm((current) => {
      const enabled = current.skills.includes(skillId);
      const skills = enabled
        ? current.skills.filter((skill) => skill !== skillId)
        : [...current.skills, skillId];
      return { ...current, skills };
    });
  };

  const updateSkillConfig = (skillId, key, value) => {
    setForm((current) => ({
      ...current,
      skillConfig: {
        ...current.skillConfig,
        [skillId]: {
          ...current.skillConfig[skillId],
          [key]: key === "templateId" ? value : Number(value),
        },
      },
    }));
  };

  const resetForm = () => {
    setForm(createEmptyForm(skillOptions));
    setEditingId(null);
    setNotice("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...form,
      ...(editingId ? {} : { code: form.code }),
    };

    try {
      await requestJson(
        editingId ? `exam-levels/admin/${editingId}` : "exam-levels/admin",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );
      setNotice(editingId ? "Level updated." : "Level created.");
      resetForm();
      await loadLevels();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const editLevel = (level) => {
    setForm(toForm(level, skillOptions));
    setEditingId(level.id);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setLevelActive = async (level, isActive) => {
    setError("");
    setNotice("");
    try {
      const payload = {
        ...level,
        isActive,
        skills: level.skills,
        skillConfig: level.skillConfig,
      };
      await requestJson(`exam-levels/admin/${level.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setNotice(`${level.name} ${isActive ? "activated" : "deactivated"}.`);
      await loadLevels();
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  return (
    <div className="exam-levels-page">
      <AdminNavbar />
      <main className="exam-levels-page__main">
        <header className="exam-levels-page__header">
          <div>
            <p className="exam-levels-page__eyebrow">EXAM SETUP</p>
            <h1>Level Registry</h1>
            <p>
              Configure a level once, then define its skills, shared templates,
              and score weights.
            </p>
          </div>
          <span className="exam-levels-page__count">
            {levels.length} {levels.length === 1 ? "level" : "levels"}
          </span>
        </header>

        {error && <div className="exam-levels-page__alert exam-levels-page__alert--error" role="alert">{error}</div>}
        {notice && <div className="exam-levels-page__alert exam-levels-page__alert--success" role="status">{notice}</div>}

        <section className="exam-levels-page__panel" aria-labelledby="exam-level-form-title">
          <div className="exam-levels-page__section-heading">
            <div>
              <p className="exam-levels-page__eyebrow">{editingId ? "EDIT LEVEL" : "NEW LEVEL"}</p>
              <h2 id="exam-level-form-title">{editingId ? "Update level" : "Create a level"}</h2>
            </div>
            {editingId && (
              <button className="exam-levels-page__button exam-levels-page__button--quiet" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="exam-levels-page__form-grid">
              <label>
                Level name
                <input
                  required
                  maxLength={80}
                  value={form.name}
                  onChange={(event) => updateFormField("name", event.target.value)}
                  placeholder="Prepare"
                />
              </label>
              <label>
                Level code
                <input
                  required
                  maxLength={40}
                  pattern="[a-z][a-z0-9]*(?:-[a-z0-9]+)*"
                  value={form.code}
                  disabled={Boolean(editingId)}
                  onChange={(event) =>
                    updateFormField("code", event.target.value.toLowerCase())
                  }
                  placeholder="prepare"
                />
                <small>Stable identifier used by tests and attempts.</small>
              </label>
              <label className="exam-levels-page__wide-field">
                Description
                <textarea
                  maxLength={500}
                  rows={2}
                  value={form.description}
                  onChange={(event) => updateFormField("description", event.target.value)}
                  placeholder="Optional notes about this level"
                />
              </label>
            </div>

            <fieldset className="exam-levels-page__skills">
              <legend>Included skills and templates</legend>
              <div className="exam-levels-page__skill-grid">
                {skillOptions.map((skill) => {
                  const enabled = form.skills.includes(skill.id);
                  const config = form.skillConfig[skill.id];
                  return (
                    <article
                      className={`exam-levels-page__skill-card${enabled ? " is-enabled" : ""}`}
                      key={skill.id}
                    >
                      <label className="exam-levels-page__skill-toggle">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => toggleSkill(skill.id)}
                        />
                        <span>{skill.label}</span>
                      </label>
                      <label>
                        Shared template
                        <select
                          value={config.templateId}
                          disabled={!enabled}
                          onChange={(event) =>
                            updateSkillConfig(skill.id, "templateId", event.target.value)
                          }
                        >
                          {skill.templates.map((template) => (
                            <option key={template.templateId} value={template.templateId}>
                              {template.templateName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="exam-levels-page__skill-options">
                        <label>
                          Score weight
                          <input
                            type="number"
                            min="0.01"
                            max="100"
                            step="0.1"
                            required={enabled}
                            disabled={!enabled}
                            value={config.weight}
                            onChange={(event) =>
                              updateSkillConfig(skill.id, "weight", event.target.value)
                            }
                          />
                        </label>
                        <label>
                          Minutes
                          <input
                            type="number"
                            min="1"
                            max="600"
                            step="1"
                            required={enabled}
                            disabled={!enabled}
                            value={config.durationMinutes}
                            onChange={(event) =>
                              updateSkillConfig(skill.id, "durationMinutes", event.target.value)
                            }
                          />
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>
            </fieldset>

            <div className="exam-levels-page__form-footer">
              <label className="exam-levels-page__sort-order">
                Display order
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="1"
                  value={form.sortOrder}
                  onChange={(event) =>
                    updateFormField("sortOrder", Number(event.target.value))
                  }
                />
              </label>
              <button
                className="exam-levels-page__button exam-levels-page__button--primary"
                type="submit"
                disabled={saving || form.skills.length === 0}
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Create level"}
              </button>
            </div>
          </form>
        </section>

        <section className="exam-levels-page__panel" aria-labelledby="exam-level-list-title">
          <div className="exam-levels-page__section-heading">
            <div>
              <p className="exam-levels-page__eyebrow">REGISTRY</p>
              <h2 id="exam-level-list-title">Configured levels</h2>
            </div>
          </div>
          {loading ? (
            <p className="exam-levels-page__empty">Loading levels…</p>
          ) : levels.length === 0 ? (
            <p className="exam-levels-page__empty">No levels configured yet.</p>
          ) : (
            <div className="exam-levels-page__list">
              {levels.map((level) => (
                <article className="exam-levels-page__level-row" key={level.id}>
                  <div className="exam-levels-page__level-info">
                    <div className="exam-levels-page__level-title">
                      <h3>{level.name}</h3>
                      <code>{level.code}</code>
                      <span className={`exam-levels-page__status${level.isActive ? " is-active" : ""}`}>
                        {level.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {level.description && <p>{level.description}</p>}
                    <div className="exam-levels-page__badges">
                      {level.skills.map((skill) => (
                        <span key={skill}>
                          {skillOptions.find((item) => item.id === skill)?.label || skill}
                          {" · "}
                          weight {level.skillConfig?.[skill]?.weight ?? 1}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="exam-levels-page__row-actions">
                    <button
                      className="exam-levels-page__button exam-levels-page__button--quiet"
                      type="button"
                      onClick={() => editLevel(level)}
                    >
                      Edit
                    </button>
                    <button
                      className="exam-levels-page__button exam-levels-page__button--quiet"
                      type="button"
                      onClick={() => setLevelActive(level, !level.isActive)}
                    >
                      {level.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ExamLevelsPage;
