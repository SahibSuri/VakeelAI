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

const buildPrompt = (text) => `You are a senior Indian legal analyst writing for a legal news platform read by lawyers, law students, and educated citizens.

Analyze the following court judgment and respond ONLY in this exact JSON format with no extra text outside the JSON:
{
  "summary": "Write a detailed 6-10 paragraph summary covering the background and facts, arguments from each side, legal issues, court reasoning, final decision, and significance. Each paragraph should be 3-4 sentences. , 
  also make sure to mention the case number and the date of the judgment. Also mention the parties and the bench of the court. make sure the result is organized for a quick legal reading and review so that a lawyer can get an idea of what's the case about if reading first time or can get a quick revision if somone wants to read the case or the judgement again" , 
     A readable summary of facts, issues, reasoning, and decision.
     Key points for scanning the judgment quickly.
     A short note on why the judgment matters.
  "keyPoints": [
    "Key legal principle 1 established or reaffirmed",
    "Key legal principle 2",
    "Key legal principle 3",
    "Key legal principle 4",
    "Key legal principle 5"
  ],
  "precedentsCited": ["Only case names explicitly mentioned in the text"],
  "legalIssues": ["Issue 1 the court decided", "Issue 2"],
  "verdict": "one of: Upheld / Overruled / Modified / Dismissed / Allowed / Partially Allowed / Reaffirmed / N/A / Other",
  "significance": "2-3 sentences on why this judgment matters for Indian law going forward"
}

STRICT RULES:
- Never fabricate any case name, citation, or fact not present in the text
- For precedentsCited return [] if no cases are mentioned
- Write the summary in formal but readable English
- keyPoints must be actual legal takeaways a lawyer can use, not just descriptions of what happened
- significance should explain real-world impact on future cases

JUDGMENT TEXT:
${text}`;

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

// GET /summarize — show the form
router.get("/summarize", (req, res) => {
  res.render("summarize", { 
    title: "Summarize Any Judgment",
    result: null,
    error: null 
  });
});

// POST /summarize — process and return summary
router.post("/summarize", async (req, res) => {
  try {
    const { text, url } = req.body;
    let rawText = text;

    // If URL provided, fetch from IndianKanoon
    if (url && url.includes("indiankanoon.org/doc/")) {
      const tid = url.match(/\/doc\/(\d+)/)?.[1];
      if (tid) {
        const apiRes = await fetch(`https://api.indiankanoon.org/doc/${tid}/`, {
          method: "POST",
          headers: { "Authorization": `Token ${process.env.INDIANKANOON_API_KEY}` }
        });
        const data = await apiRes.json();
        rawText = data.doc || "";
      }
    }

    if (!rawText || rawText.trim().length < 100) {
      return res.render("summarize", { 
        title: "Summarize Any Judgment",
        result: null, 
        error: "Please provide valid judgment text or URL" 
      });
    }

    // Truncate if too long
    const text_to_summarize = rawText.length > 12000
      ? rawText.slice(0, 6000) + "\n...\n" + rawText.slice(-6000)
      : rawText;

    // Call OpenAI
    const OpenAI = require("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: buildPrompt(text_to_summarize) }],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);

    res.render("summarize", { 
      title: "Summarize Any Judgment",
      result, 
      error: null 
    });

  } catch (err) {
    console.error(err);
    res.render("summarize", { 
      title: "Summarize Any Judgment",
      result: null, 
      error: "Something went wrong. Please try again." 
    });
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
