const express = require("express");
const router = express.Router();
const Judgment = require("../models/Judgment");
const { isLoggedIn, isAdmin } = require("../middleware/auth");
const { generateAISummary } = require("../scripts/summarize");

// ─── GET /api/judgments ───────────────────────────────────────────────────────
// Public. Supports filters: ?court=SC&month=4&year=2026&subject=IP
router.get("/", async (req, res) => {
  try {
    const { court, month, year, subject, sort = "recent", page = 1, limit = 10 } = req.query;

    const filter = { isPublished: true };

    if (court) filter.court = court;
    if (subject) filter.subject = { $in: [subject] };

    // Date filter — "last month" is the dashboard's main view
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      filter.dateOfJudgment = { $gte: start, $lte: end };
    } else if (!month && !year) {
      // Default: last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filter.dateOfJudgment = { $gte: thirtyDaysAgo };
    }

    const sortOptions = {
      recent: { dateOfJudgment: -1 },
      top_rated: { avgRating: -1 },
      most_discussed: { totalReviews: -1 },
    };

    const judgments = await Judgment.find(filter)
      .select("-rawText")           // don't send full text to list view
      .sort(sortOptions[sort] || { dateOfJudgment: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Judgment.countDocuments(filter);

    res.json({
      success: true,
      judgments,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/judgments/:id ───────────────────────────────────────────────────
// Public. Returns full details including AI summary.
router.get("/:id", async (req, res) => {
  try {
    const judgment = await Judgment.findById(req.params.id).select("-rawText");
    if (!judgment) return res.status(404).json({ success: false, message: "Judgment not found" });

    // Check if user already rated (to show selected state on frontend)
    let userRating = null;
    if (req.isAuthenticated()) {
      const existing = judgment.ratings.find(
        (r) => r.user.toString() === req.user._id.toString()
      );
      if (existing) userRating = existing.value;
    }

    res.json({ success: true, judgment, userRating });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/judgments/:id/rate ─────────────────────────────────────────────
// Logged in only. Submit or update your rating.
router.post("/:id/rate", isLoggedIn, async (req, res) => {
  try {
    const { value } = req.body;
    if (!value || value < 1 || value > 10)
      return res.status(400).json({ success: false, message: "Rating must be 1–10" });

    const judgment = await Judgment.findById(req.params.id);
    if (!judgment) return res.status(404).json({ success: false, message: "Not found" });

    const existingIdx = judgment.ratings.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingIdx >= 0) {
      judgment.ratings[existingIdx].value = value; // update existing
    } else {
      judgment.ratings.push({ user: req.user._id, value }); // new
    }

    await judgment.recalcRating();
    res.json({ success: true, avgRating: judgment.avgRating, totalRatings: judgment.totalRatings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/judgments — Admin: add a new judgment ─────────────────────────
router.post("/", isAdmin, async (req, res) => {
  try {
    const judgment = await Judgment.create(req.body);

    // Trigger AI summarization in background (non-blocking)
    if (judgment.rawText) {
      generateAISummary(judgment._id).catch(console.error);
    }

    res.status(201).json({ success: true, judgment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── POST /api/judgments/:id/summarize — Admin: re-run AI summary ─────────────
router.post("/:id/summarize", isAdmin, async (req, res) => {
  try {
    const result = await generateAISummary(req.params.id);
    res.json({ success: true, aiSummary: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;