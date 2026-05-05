/**
 * middleware/auth.js
 *
 * HOW PASSPORT + SESSION AUTH WORKS (so you understand what's happening):
 *
 *  1. User logs in via POST /api/auth/login
 *  2. Passport validates credentials, then calls req.login(user)
 *  3. Passport calls serializeUser → saves user._id into the SESSION (stored in MongoDB)
 *  4. Express sets a cookie on the browser: "connect.sid = <sessionId>"
 *
 *  On every subsequent request:
 *  5. Browser sends the cookie automatically
 *  6. Express reads the sessionId from the cookie
 *  7. MongoStore looks up the session in DB → gets the user._id
 *  8. Passport calls deserializeUser → fetches User from DB → attaches to req.user
 *  9. req.isAuthenticated() returns true if req.user exists
 *
 *  So these middleware functions just CHECK req.isAuthenticated() and req.user.role
 *  Passport did all the hard work before your route even runs.
 */

// ─── isLoggedIn ───────────────────────────────────────────────────────────────
// Use this on any route that requires a logged-in user.
// Example: router.post("/reviews", isLoggedIn, createReview)
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();

  return res.status(401).json({
    success: false,
    message: "Authentication required. Please log in.",
    code: "NOT_AUTHENTICATED",
  });
};

// ─── isAdmin ──────────────────────────────────────────────────────────────────
// Use this on admin-only routes: adding judgments, deleting reviews, etc.
// Note: isAdmin already implies isLoggedIn (checks both)
const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
      code: "NOT_AUTHENTICATED",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action.",
      code: "FORBIDDEN",
    });
  }

  return next();
};

// ─── isLawyerOrAdmin ─────────────────────────────────────────────────────────
// Use this on routes restricted to professionals + admins.
// Future use: accessing the AI contract review tool, uploading private docs, etc.
const isLawyerOrAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
      code: "NOT_AUTHENTICATED",
    });
  }

  if (!["lawyer", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "This feature is available for verified lawyers only.",
      code: "LAWYER_ONLY",
    });
  }

  return next();
};

// ─── isOwnerOrAdmin ───────────────────────────────────────────────────────────
// Factory middleware — use when the resource belongs to a specific user.
// Usage: router.delete("/:id", isLoggedIn, isOwnerOrAdmin("authorId"), handler)
// In practice for reviews, we handle this directly in the route (see reviews.js)
// because we need to fetch the DB document first anyway.
const isOwnerOrAdmin = (resourceUserIdField) => (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: "Authentication required.", code: "NOT_AUTHENTICATED" });
  }

  const resourceUserId = req.body[resourceUserIdField] || req.params[resourceUserIdField];
  const isOwner = resourceUserId && req.user._id.toString() === resourceUserId.toString();
  const isAdminUser = req.user.role === "admin";

  if (!isOwner && !isAdminUser) {
    return res.status(403).json({
      success: false,
      message: "You can only modify your own content.",
      code: "NOT_OWNER",
    });
  }

  return next();
};

// ─── optionalAuth ─────────────────────────────────────────────────────────────
// Use on public routes where being logged in gives EXTRA features.
// E.g.: GET /judgments — guests see content, logged-in users also see their own rating.
// This does nothing — Passport already ran deserializeUser — req.user is
// already populated if the cookie is valid. Just for documentation clarity.
const optionalAuth = (req, res, next) => next();

module.exports = {
  isLoggedIn,
  isAdmin,
  isLawyerOrAdmin,
  isOwnerOrAdmin,
  optionalAuth,
};