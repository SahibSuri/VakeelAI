const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const passport = require("passport");
const Judgment = require("../models/Judgment");
const Review = require("../models/Review");
const User = require("../models/User");
const { generateAISummary } = require("../scripts/summarize");

const getLastMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  return { start, end };
};

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === id;

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
};

// ─── HOME ─────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { start, end } = getLastMonthRange();
    let judgments = await Judgment.find({
      isPublished: true,
      dateOfJudgment: { $gte: start, $lte: end }
    })
      .select("-rawText")
      .sort({ dateOfJudgment: -1 })
      .limit(50);

    // If calendar "last month" is empty (e.g. seed data in an older month), show recent published judgments
    if (judgments.length === 0) {
      const fallbackStart = new Date();
      fallbackStart.setMonth(fallbackStart.getMonth() - 6);
      judgments = await Judgment.find({
        isPublished: true,
        dateOfJudgment: { $gte: fallbackStart }
      })
        .select("-rawText")
        .sort({ dateOfJudgment: -1 })
        .limit(50);
    }

    res.render("index", {
      title: "Legal Dashboard | Last Month's Judgments",
      judgments,
      monthName: start.toLocaleString("default", { month: "long" }),
      year: start.getFullYear()
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading dashboard");
  }
});

// ─── ALL JUDGMENTS ────────────────────────────────────────────────────────────
router.get("/judgments", async (req, res) => {
  try {
    const { court, subject, sort = "recent", page = 1 } = req.query;
    const limit = 9;
    const filter = { isPublished: true };

    if (court) filter.court = court;
    if (subject) filter.subject = { $in: [subject] };

    const sortMap = {
      recent:         { dateOfJudgment: -1 },
      top_rated:      { avgRating: -1 },
      most_discussed: { totalReviews: -1 }
    };

    const judgments = await Judgment.find(filter)
      .select("-rawText")
      .sort(sortMap[sort] || { dateOfJudgment: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Judgment.countDocuments(filter);

    res.render("judgments/index", {
      title: "All Judgments",
      judgments,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      filters: { court, subject, sort }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading judgments");
  }
});

// ─── SINGLE JUDGMENT ─────────────────────────────────────────────────────────
router.get("/judgment/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).send("Judgment not found");
    }

    const judgment = await Judgment.findById(req.params.id);
    if (!judgment) return res.status(404).send("Judgment not found");

    let userRating = null;
    let userReview = null;

    if (req.isAuthenticated()) {
      const existing = judgment.ratings.find(
        r => r.user?.toString() === req.user._id.toString()
      );
      if (existing) userRating = existing.value;
      userReview = await Review.findOne({
        judgment: judgment._id,
        author: req.user._id
      });
    }

    const reviews = await Review.find({
      judgment: judgment._id,
      isDeleted: false
    })
      .populate("author", "name role specialization avatar")
      .populate("replies.author", "name role avatar")
      .sort({ createdAt: -1 })
      .limit(20);

    res.render("judgment", {
      title: `${judgment.title} | Judgment Details`,
      judgment,
      reviews,
      userRating,
      userReview
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading judgment details");
  }
});

// ─── SUBMIT RATING ────────────────────────────────────────────────────────────
router.post("/judgment/:id/rate", isLoggedIn, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).send("Judgment not found");
    }
    const { value } = req.body;
    const judgment = await Judgment.findById(req.params.id);

    const idx = judgment.ratings.findIndex(
      r => r.user?.toString() === req.user._id.toString()
    );

    if (idx >= 0) judgment.ratings[idx].value = parseInt(value);
    else judgment.ratings.push({ user: req.user._id, value: parseInt(value) });

    await judgment.recalcRating();
    res.redirect(`/judgment/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/judgment/${req.params.id}`);
  }
});

// ─── SUBMIT REVIEW ────────────────────────────────────────────────────────────
router.post("/judgment/:id/reviews", isLoggedIn, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).send("Judgment not found");
    }
    const { body, rating, perspectiveTag } = req.body;

    await Review.create({
      judgment: req.params.id,
      author: req.user._id,
      body,
      rating: parseInt(rating),
      perspectiveTag: perspectiveTag || "Other"
    });

    await Judgment.findByIdAndUpdate(req.params.id, {
      $inc: { totalReviews: 1 }
    });

    res.redirect(`/judgment/${req.params.id}`);
  } catch (err) {
    if (err.code === 11000) {
      // duplicate review — user already reviewed this judgment
      return res.redirect(`/judgment/${req.params.id}`);
    }
    console.error(err);
    res.redirect(`/judgment/${req.params.id}`);
  }
});

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
router.get("/login", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/");
  res.render("auth", { title: "Login", isLogin: true, error: null });
});

router.get("/register", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/");
  res.render("auth", { title: "Register", isLogin: false, error: null });
});

// POST LOGIN
router.post("/login",
  passport.authenticate("local", {
    failureRedirect: "/login"
  }),
  (req, res) => {
    res.redirect("/");
  }
);

// POST REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.redirect("/register");

    const user = await User.create({
      name,
      email,
      password,
      role: role || "public"
    });

    req.login(user, err => {
      if (err) return res.redirect("/login");
      res.redirect("/");
    });
  } catch (err) {
    console.error(err);
    res.redirect("/register");
  }
});

// POST LOGOUT
router.post("/logout", (req, res) => {
  req.logout(() => res.redirect("/login"));
});

// ─── PROFILE ─────────────────────────────────────────────────────────────────
router.get("/profile", isLoggedIn, async (req, res) => {
  try {
    const reviews = await Review.find({
      author: req.user._id,
      isDeleted: false
    })
      .populate("judgment", "title court dateOfJudgment")
      .sort({ createdAt: -1 });

    res.render("profile", {
      title: "My Profile",
      reviews
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading profile");
  }
});

module.exports = router;