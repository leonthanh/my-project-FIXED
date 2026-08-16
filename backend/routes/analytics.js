const express = require("express");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const { verifyAccessToken } = require("../utils/tokens");

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

const resolveOptionalUser = (req) => {
  const header = String(req.headers?.authorization || "").trim();
  if (!header) return null;

  const [type, token] = header.split(" ");
  if (String(type).toLowerCase() !== "bearer" || !token) return null;

  try {
    const payload = verifyAccessToken(token);
    return {
      id: payload?.sub,
      role: payload?.role,
    };
  } catch {
    return null;
  }
};

router.post("/events", async (req, res) => {
  try {
    const eventType = String(req.body?.eventType || "").trim().toLowerCase();
    if (!VALID_EVENT_TYPES.has(eventType)) {
      return res.status(400).json({
        message: "Invalid analytics eventType.",
      });
    }

    const pagePath = normalizePagePath(req.body?.pagePath);
    const sessionId = normalizeSessionId(req.body?.sessionId);
    const user = resolveOptionalUser(req);

    const userId = Number(user?.id);
    await AnalyticsEvent.create({
      userId: Number.isFinite(userId) && userId > 0 ? userId : null,
      role: String(user?.role || "").trim() || null,
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
