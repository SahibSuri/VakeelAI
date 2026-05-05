const express = require("express");
const router = express.Router({ mergeParams: true }); // mergeParams to get :judgmentId
const { body, validationResult } = require("express-validator");
const Review = require("../models/Review");
const Judgment = require("../models/Judgment");
const User = require("../models/User");
const { isLoggedIn, isAdmin } = require("../middleware/auth");

// ─── GET /api/judgments/:judgmentId/reviews ───────────────────────────────────
// Public. Paginated reviews for a judgment.
router.get("/", async (req, res) => {
  try {
    const { sort = "recent", page = 1 } = req.query;
    const limit = 10;

    const sortMap = {
      recent: { createdAt: -1 },
      top: { upvotes: -1 },         // most upvoted
      highest: { rating: -1 },
      lowest: { rating: 1 },
    };

    const reviews = await Review.find({
      judgment: req.params.judgmentId,
      isDeleted: false,
    })
      .populate("author", "name role specialization avatar")
      .populate("replies.author", "name role avatar")
      .sort(sortMap[sort] || { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Review.countDocuments({
      judgment: req.params.judgmentId,
      isDeleted: false,
    });

    res.json({ success: true, reviews, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/judgments/:judgmentId/reviews ──────────────────────────────────
// Logged in only. One review per user per judgment (enforced by unique index).
router.post(
  "/",
  isLoggedIn,
  [
    body("body").trim().isLength({ min: 10, max: 1200 }).withMessage("Review must be 10–1200 chars"),
    body("rating").isInt({ min: 1, max: 10 }).withMessage("Rating must be 1–10"),
    body("perspectiveTag").optional().isIn(["Lawyer", "Law Student", "Academic", "Journalist", "Citizen", "Other"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const judgment = await Judgment.findById(req.params.judgmentId);
      if (!judgment) return res.status(404).json({ success: false, message: "Judgment not found" });

      const review = await Review.create({
        judgment: req.params.judgmentId,
        author: req.user._id,
        body: req.body.body,
        rating: req.body.rating,
        perspectiveTag: req.body.perspectiveTag || "Other",
      });

      // Update judgment review count
      await Judgment.findByIdAndUpdate(req.params.judgmentId, { $inc: { totalReviews: 1 } });

      // Update user review count
      await User.findByIdAndUpdate(req.user._id, { $inc: { reviewsPosted: 1 } });

      await review.populate("author", "name role specialization avatar");

      res.status(201).json({ success: true, review });
    } catch (err) {
      if (err.code === 11000)
        return res.status(409).json({ success: false, message: "You've already reviewed this judgment" });
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/judgments/:judgmentId/reviews/:reviewId/reply ──────────────────
router.post(
  "/:reviewId/reply",
  isLoggedIn,
  [body("body").trim().isLength({ min: 1, max: 600 }).withMessage("Reply must be 1–600 chars")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const review = await Review.findById(req.params.reviewId);
      if (!review || review.isDeleted)
        return res.status(404).json({ success: false, message: "Review not found" });

      review.replies.push({ author: req.user._id, body: req.body.body });
      await review.save();

      const updatedReview = await Review.findById(review._id)
        .populate("author", "name role avatar")
        .populate("replies.author", "name role avatar");

      res.status(201).json({ success: true, review: updatedReview });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/judgments/:judgmentId/reviews/:reviewId/upvote ─────────────────
router.post("/:reviewId/upvote", isLoggedIn, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Not found" });

    const userId = req.user._id;
    const alreadyUpvoted = review.upvotes.some((id) => id.equals(userId));

    if (alreadyUpvoted) {
      review.upvotes.pull(userId);  // toggle off
    } else {
      review.upvotes.push(userId);  // toggle on
    }
    await review.save();

    res.json({ success: true, upvotes: review.upvotes.length, upvoted: !alreadyUpvoted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/judgments/:judgmentId/reviews/:reviewId ─────────────────────
// Author or admin can delete (soft delete)
router.delete("/:reviewId", isLoggedIn, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Not found" });

    const isOwner = review.author.equals(req.user._id);
    const isAdminUser = req.user.role === "admin";
    if (!isOwner && !isAdminUser)
      return res.status(403).json({ success: false, message: "Not authorised" });

    review.isDeleted = true;
    await review.save();

    await Judgment.findByIdAndUpdate(req.params.judgmentId, { $inc: { totalReviews: -1 } });

    res.json({ success: true, message: "Review removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
