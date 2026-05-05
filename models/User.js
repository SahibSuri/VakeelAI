const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [60, "Name too long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      // not required — Google OAuth users have no password
    },
    googleId: String,
    avatar: String,

    // ─── Role-based access ────────────────────────────────────────────────────
    // public   → can read summaries, leave reviews, join discussions
    // lawyer   → all of above + can access AI tool features (future)
    // admin    → can add/edit judgments, moderate reviews
    role: {
      type: String,
      enum: ["public", "lawyer", "admin"],
      default: "public",
    },

    // Optional professional details (lawyers fill this)
    barCouncilId: String,
    specialization: String, // e.g. "Criminal Law", "IP Law"

    // Engagement stats
    reviewsPosted: { type: Number, default: 0 },
    discussionsStarted: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Hash password before saving ──────────────────────────────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model("User", userSchema);
