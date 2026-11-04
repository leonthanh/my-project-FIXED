const express = require("express");
const { optionalAuth, requireAuth, requireRole } = require("../../middlewares/auth");
const service = require("./service");

const router = express.Router();
const requireTeacher = [requireAuth, requireRole("teacher", "admin")];
const send = (handler) => async (req, res, next) => {
  try {
    const result = await handler(req);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

router.get("/:code", optionalAuth, send((req) => service.getLevelByCode(req.params.code)));

router.get(
  "/:code/submissions",
  ...requireTeacher,
  send((req) =>
    service.listSubmissions({
      code: req.params.code,
      skill: req.query.skill,
      status: req.query.status,
    })
  )
);
router.get(
  "/:code/submissions/active",
  optionalAuth,
  send((req) =>
    service.getActiveSubmission({
      code: req.params.code,
      query: req.query,
      user: req.user,
    })
  )
);
router.get(
  "/:code/submissions/:submissionId",
  ...requireTeacher,
  send((req) =>
    service.getSubmissionForReview({
      code: req.params.code,
      submissionId: req.params.submissionId,
      user: req.user,
    })
  )
);
router.put(
  "/:code/submissions/:submissionId/review",
  ...requireTeacher,
  send((req) =>
    service.saveSubmissionReview({
      code: req.params.code,
      submissionId: req.params.submissionId,
      body: req.body,
      user: req.user,
    })
  )
);

router.post(
  "/:code/submissions/autosave",
  optionalAuth,
  send((req) =>
    service.autosaveSubmission({
      code: req.params.code,
      body: req.body,
      user: req.user,
    }).then(({ submission, timing }) => ({
      message: "Draft saved.",
      submissionId: submission.id,
      savedAt: submission.lastSavedAt,
      expiresAt: submission.expiresAt,
      timing,
    }))
  )
);

router.get(
  "/:code/:skill/tests",
  optionalAuth,
  send((req) =>
    service.listTests({
      code: req.params.code,
      skill: req.params.skill,
      user: req.user,
    })
  )
);
router.get(
  "/:code/:skill/tests/:id",
  optionalAuth,
  send((req) =>
    service.getTestById({
      code: req.params.code,
      skill: req.params.skill,
      id: req.params.id,
      user: req.user,
    })
  )
);
router.post(
  "/:code/:skill/tests",
  ...requireTeacher,
  send((req) =>
    service.createTest({
      code: req.params.code,
      skill: req.params.skill,
      body: req.body,
      user: req.user,
    })
  )
);
router.put(
  "/:code/:skill/tests/:id",
  ...requireTeacher,
  send((req) =>
    service.updateTest({
      code: req.params.code,
      skill: req.params.skill,
      id: req.params.id,
      body: req.body,
    })
  )
);
router.delete(
  "/:code/:skill/tests/:id",
  ...requireTeacher,
  send(async (req) => {
    await service.deleteTest({
      code: req.params.code,
      skill: req.params.skill,
      id: req.params.id,
    });
    return { message: "Exam test archived." };
  })
);
router.post(
  "/:code/:skill/tests/:id/submit",
  optionalAuth,
  async (req, res, next) => {
    try {
      const result = await service.submitTest({
        code: req.params.code,
        skill: req.params.skill,
        id: req.params.id,
        body: req.body,
        user: req.user,
      });
      const isStudent = req.user?.role === "student";
      if (isStudent && result.studentResultVisibility === "confirmation") {
        return res.status(201).json({
          message: "Submission received.",
          submissionId: result.submission.id,
        });
      }
      return res.status(201).json({
        message: "Submission received.",
        submissionId: result.submission.id,
        score: result.score,
        total: result.total,
        percentage: result.percentage,
        ...(isStudent && result.studentResultVisibility !== "details"
          ? {}
          : {
              detailedResults: result.detailedResults,
              answers: result.detailedResults,
            }),
        breakdown: result.breakdown,
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
