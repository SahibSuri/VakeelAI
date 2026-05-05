const mongoose = require("mongoose");

const judgmentSchema = new mongoose.Schema(
  {
    // ─── Source metadata (from IndianKanoon API or manual entry) ─────────────
    title: { type: String, required: true, trim: true },
    caseNumber: { type: String, trim: true },
    court: {
      type: String,
      enum: [
        "Supreme Court of India",
        "Delhi High Court",
        "Bombay High Court",
        "Madras High Court",
        "Calcutta High Court",
        "Allahabad High Court",
        "Other",
      ],
      required: true,
    },
    bench: [String],          // judges who presided
    parties: {
      petitioner: String,
      respondent: String,
    },
    dateOfJudgment: { type: Date, required: true },
    subject: [String],        // e.g. ["Criminal Law", "Article 21"]
    verdict: {
      type: String,
      enum: ["Upheld", "Overruled", "Modified", "Dismissed", "Allowed", "Partially Allowed"],
    },

    // ─── Content ──────────────────────────────────────────────────────────────
    fullTextUrl: String,      // link to indiankanoon.org or court website
    rawText: String,          // full judgment text (used for AI summarization)

    // AI-generated fields
    aiSummary: {
      text: String,
      generatedAt: Date,
      model: String,          // e.g. "gpt-4o"
    },
    keyPoints: [String],      // 3–5 bullet takeaways (AI-generated)
    precedentsCited: [String],

    // ─── Engagement ───────────────────────────────────────────────────────────
    // Ratings: stored as array of { userId, value } for avg calculation
    ratings: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        value: { type: Number, min: 1, max: 10 },
      },
    ],
    avgRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    isPublished: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },

    // Source tracking
    sourceId: String,         // indiankanoon doc ID
    sourceName: { type: String, default: "IndianKanoon" },
  },
  { timestamps: true }
);

// ─── Indexes for fast filtering ───────────────────────────────────────────────
judgmentSchema.index({ dateOfJudgment: -1 });
judgmentSchema.index({ court: 1 });
judgmentSchema.index({ subject: 1 });
judgmentSchema.index({ avgRating: -1 });

// ─── Recalculate avgRating whenever ratings array changes ────────────────────
judgmentSchema.methods.recalcRating = async function () {
  if (this.ratings.length === 0) {
    this.avgRating = 0;
    this.totalRatings = 0;
  } else {
    const sum = this.ratings.reduce((acc, r) => acc + r.value, 0);
    this.avgRating = parseFloat((sum / this.ratings.length).toFixed(1));
    this.totalRatings = this.ratings.length;
  }
  await this.save();
};

module.exports = mongoose.model("Judgment", judgmentSchema);
