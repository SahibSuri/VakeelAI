const mongoose = require("mongoose");

// ─── A Review is the top-level opinion on a judgment ─────────────────────────
// Replies are stored as nested subdocuments for simple threading
const replySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: [true, "Reply cannot be empty"],
      maxlength: [600, "Reply too long (max 600 chars)"],
      trim: true,
    },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const reviewSchema = new mongoose.Schema(
  {
    judgment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Judgment",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: [true, "Review cannot be empty"],
      minlength: [10, "Review too short (min 10 chars)"],
      maxlength: [1200, "Review too long (max 1200 chars)"],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Please provide a rating"],
      min: 1,
      max: 10,
    },

    // Optional: professional perspective tag
    perspectiveTag: {
      type: String,
      enum: [
        "Lawyer",
        "Law Student",
        "Academic",
        "Journalist",
        "Citizen",
        "Other",
      ],
      default: "Other",
    },

    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    replies: [replySchema],

    // Moderation
    isDeleted: { type: Boolean, default: false },
    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
reviewSchema.index({ judgment: 1, createdAt: -1 });
reviewSchema.index({ author: 1 });

// ─── Only one review per user per judgment ────────────────────────────────────
reviewSchema.index({ judgment: 1, author: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
