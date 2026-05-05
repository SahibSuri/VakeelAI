const express = require("express");
const router = express.Router();
const Judgment = require("../models/Judgment");
const Review = require("../models/Review");

// Helper to get last month date range
const getLastMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  return { start, end };
};

// ─── GET / ────────────────────────────────────────────────────────────────────
// Main Dashboard: shows last month's judgments
router.get("/", async (req, res) => {
  try {
    const { start, end } = getLastMonthRange();
    
    // Fetch judgments from last month, sorted by date
    const judgments = await Judgment.find({
      isPublished: true,
      dateOfJudgment: { $gte: start, $lte: end }
    })
      .select("-rawText") // Exclude heavy raw text
      .sort({ dateOfJudgment: -1 })
      .limit(50); // Limit to 50 to avoid massive pages

    res.render("index", {
      title: "Legal Dashboard | Last Month's Judgments",
      judgments,
      monthName: start.toLocaleString('default', { month: 'long' }),
      year: start.getFullYear()
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading dashboard");
  }
});

// ─── GET /judgment/:id ────────────────────────────────────────────────────────
// Judgment Detail & Reviews page
router.get("/judgment/:id", async (req, res) => {
  try {
    const judgment = await Judgment.findById(req.params.id);
    if (!judgment) return res.status(404).send("Judgment not found");

    // Check if the current user has already rated this judgment
    let userRating = null;
    if (req.isAuthenticated()) {
      const existing = judgment.ratings.find(
        (r) => r.user.toString() === req.user._id.toString()
      );
      if (existing) userRating = existing.value;
    }

    // Fetch top/recent reviews for this judgment
    const reviews = await Review.find({
      judgment: judgment._id,
      isDeleted: false,
    })
      .populate("author", "name role specialization avatar")
      .populate("replies.author", "name role avatar")
      .sort({ createdAt: -1 })
      .limit(20);

    res.render("judgment", {
      title: `${judgment.title} | Judgment Details`,
      judgment,
      reviews,
      userRating
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading judgment details");
  }
});

// ─── Auth Pages ───────────────────────────────────────────────────────────────
router.get("/login", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/");
  res.render("auth", { title: "Login", isLogin: true });
});

router.get("/register", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/");
  res.render("auth", { title: "Register", isLogin: false });
});

module.exports = router;
