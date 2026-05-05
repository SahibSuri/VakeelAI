require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const passport = require("./config/passport");
const connectDB = require("./config/db");

const app = express();

// ─── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true, // required for session cookies across origins
}));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Sessions ──────────────────────────────────────────────────────────────────
// Sessions stored in MongoDB — survives server restarts
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    },
  })
);

// ─── Passport ─────────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ─── Pass user to views ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/", require("./routes/viewRoutes"));

app.use("/api/auth",        require("./routes/auth"));
app.use("/api/judgments",   require("./routes/judgments"));

// Reviews are nested under judgments: /api/judgments/:judgmentId/reviews
app.use("/api/judgments/:judgmentId/reviews", require("./routes/reviews"));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", user: req.user?.name || null });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Something went wrong" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
