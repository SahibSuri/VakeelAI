const express = require("express");
const router = express.Router();
const passport = require("passport");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { isLoggedIn } = require("../middleware/auth");

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Min 6 characters"),
    body("role")
      .optional()
      .isIn(["public", "lawyer"])
      .withMessage("Invalid role"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { name, email, password, role, barCouncilId, specialization } = req.body;

      const existing = await User.findOne({ email });
      if (existing)
        return res.status(409).json({ success: false, message: "Email already registered" });

      const user = await User.create({
        name,
        email,
        password,
        role: role || "public",
        barCouncilId,
        specialization,
      });

      // Auto-login after registration
      req.login(user, (err) => {
        if (err) return res.status(500).send("Login failed after registration");
        res.redirect("/");
      });
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).send(info?.message || "Login failed");

    req.login(user, (err) => {
      if (err) return next(err);
      res.redirect("/");
    });
  })(req, res, next);
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
});

// ─── GET /api/auth/me — get current session user ──────────────────────────────
router.get("/me", isLoggedIn, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ─── GET /api/auth/google ─────────────────────────────────────────────────────
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed` }),
  (req, res) => {
    res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  }
);

module.exports = router;
