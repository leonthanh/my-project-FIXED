const express = require("express");

const AppSetting = require("../models/AppSetting");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

const DISPLAY_LABELS_KEY = "display-labels";
const MAX_LABEL_LENGTH = 40;

const DEFAULT_DISPLAY_LABELS = Object.freeze({
  ixDisplayName: "IX",
  orangeDisplayName: "Orange",
  fceDisplayName: "FCE",
});

let settingsTableReadyPromise = null;

const ensureSettingsTableReady = async () => {
  if (!settingsTableReadyPromise) {
    settingsTableReadyPromise = AppSetting.sync()
      .then(() => true)
      .catch((error) => {
        settingsTableReadyPromise = null;
        throw error;
      });
  }

  return settingsTableReadyPromise;
};

const sanitizeDisplayLabel = (value, fallbackValue) => {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return fallbackValue;
  return normalized.slice(0, MAX_LABEL_LENGTH);
};

const sanitizeDisplayLabels = (raw = {}) => ({
  ixDisplayName: sanitizeDisplayLabel(raw.ixDisplayName, DEFAULT_DISPLAY_LABELS.ixDisplayName),
  orangeDisplayName: sanitizeDisplayLabel(
    raw.orangeDisplayName,
    DEFAULT_DISPLAY_LABELS.orangeDisplayName
  ),
  fceDisplayName: sanitizeDisplayLabel(raw.fceDisplayName, DEFAULT_DISPLAY_LABELS.fceDisplayName),
});

const parseSettingValue = (value) => {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const loadDisplayLabels = async () => {
  await ensureSettingsTableReady();

  const record = await AppSetting.findOne({
    where: { settingKey: DISPLAY_LABELS_KEY },
  });

  const rawLabels = record ? parseSettingValue(record.settingValue) : {};
  const labels = sanitizeDisplayLabels({
    ...DEFAULT_DISPLAY_LABELS,
    ...rawLabels,
  });

  return {
    record,
    labels,
  };
};

router.get("/display-labels", async (_req, res) => {
  try {
    const { record, labels } = await loadDisplayLabels();
    return res.json({
      labels,
      updatedAt: record?.updatedAt || null,
    });
  } catch (error) {
    console.error("Failed to load display labels:", error);
    return res.status(500).json({ message: "Could not load display labels." });
  }
});

router.put("/display-labels", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const inputLabels = req.body?.labels;

    if (!inputLabels || typeof inputLabels !== "object" || Array.isArray(inputLabels)) {
      return res.status(400).json({ message: "labels must be an object." });
    }

    const { record, labels: existingLabels } = await loadDisplayLabels();
    const nextLabels = sanitizeDisplayLabels({
      ...existingLabels,
      ...inputLabels,
    });

    const serializedValue = JSON.stringify(nextLabels);

    if (record) {
      await record.update({
        settingValue: serializedValue,
        updatedByUserId: req.user?.id || null,
      });
    } else {
      await AppSetting.create({
        settingKey: DISPLAY_LABELS_KEY,
        settingValue: serializedValue,
        updatedByUserId: req.user?.id || null,
      });
    }

    return res.json({
      message: "Display labels updated.",
      labels: nextLabels,
    });
  } catch (error) {
    console.error("Failed to update display labels:", error);
    return res.status(500).json({ message: "Could not update display labels." });
  }
});

module.exports = router;
