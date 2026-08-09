const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const AnalyticsEvent = require("../models/AnalyticsEvent");

const router = express.Router();

const VALID_EVENT_TYPES = new Set(["page_view", "heartbeat"]);

const normalizePagePath = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return "/";
  return normalized.slice(0, 255);
};

const normalizeSessionId = (value = "") => {
  const normalized = String(value || "").trim();
  return normalized ? normalized.slice(0, 80) : null;
};

router.post("/events", requireAuth, async (req, res) => {
  try {
    const eventType = String(req.body?.eventType || "").trim().toLowerCase();
    if (!VALID_EVENT_TYPES.has(eventType)) {
      return res.status(400).json({
        message: "Invalid analytics eventType.",
      });
    }

    const pagePath = normalizePagePath(req.body?.pagePath);
    const sessionId = normalizeSessionId(req.body?.sessionId);

    const userId = Number(req.user?.id);
    await AnalyticsEvent.create({
      userId: Number.isFinite(userId) && userId > 0 ? userId : null,
      role: String(req.user?.role || "").trim() || null,
      eventType,
      pagePath,
      sessionId,
      meta: {
        referrer: String(req.body?.referrer || "").slice(0, 255) || null,
      },
    });

    return res.status(201).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      message: "Could not store analytics event.",
      detail: error?.message || String(error),
    });
  }
});

module.exports = router;
