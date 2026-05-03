const express = require("express");

const { requireAuth, requireRole } = require("../middlewares/auth");
const placementService = require("../modules/placement/service");

const router = express.Router();

const requirePlacementManager = [requireAuth, requireRole("teacher", "admin")];

const handlePlacementError = (error, res, fallbackMessage) => {
  const statusCode = Number(error?.statusCode) || 500;
  if (statusCode >= 500) {
    console.error("Placement route error:", error);
  }
  return res.status(statusCode).json({ message: error?.message || fallbackMessage });
};

router.get("/packages/current", requirePlacementManager, async (req, res) => {
  try {
    const placementPackage = await placementService.getCurrentPackageForOwner(req.user);
    res.json(placementPackage);
  } catch (error) {
    handlePlacementError(error, res, "Failed to load placement package.");
  }
});

router.get("/packages/public-default", async (_req, res) => {
  try {
    const placementPackage = await placementService.getDefaultPublicPackage();
    res.json(placementPackage);
  } catch (error) {
    handlePlacementError(error, res, "Failed to load placement package.");
  }
});

router.put("/packages/current", requirePlacementManager, async (req, res) => {
  try {
    const placementPackage = await placementService.replaceCurrentPackageItems({
      ownerUser: req.user,
      items: req.body?.items,
    });
    res.json(placementPackage);
  } catch (error) {
    handlePlacementError(error, res, "Failed to save placement package.");
  }
});

router.get("/packages/share/:shareToken", async (req, res) => {
  try {
    const placementPackage = await placementService.getPublicPackageByShareToken(
      req.params.shareToken
    );
    res.json(placementPackage);
  } catch (error) {
    handlePlacementError(error, res, "Failed to load placement package.");
  }
});

router.post("/packages/share/:shareToken/attempts", async (req, res) => {
  try {
    const attempt = await placementService.createOrResumeAttemptForShareToken({
      shareToken: req.params.shareToken,
      studentName: req.body?.studentName,
      studentPhone: req.body?.studentPhone,
    });
    res.status(201).json(attempt);
  } catch (error) {
    handlePlacementError(error, res, "Failed to start placement attempt.");
  }
});

router.get("/attempts/:attemptToken", async (req, res) => {
  try {
    const attempt = await placementService.getPlacementAttemptByToken(
      req.params.attemptToken
    );
    res.json(attempt);
  } catch (error) {
    handlePlacementError(error, res, "Failed to load placement attempt.");
  }
});

router.get("/attempt-items/:attemptItemToken", async (req, res) => {
  try {
    const payload = await placementService.getPlacementAttemptItemByToken(
      req.params.attemptItemToken
    );
    res.json(payload);
  } catch (error) {
    handlePlacementError(error, res, "Failed to load placement attempt item.");
  }
});

module.exports = router;