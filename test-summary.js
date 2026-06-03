require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Judgment = require("./models/Judgment");
const { generateAISummary } = require("./scripts/summarize");

async function test() {
  await connectDB();

  const judgments = await Judgment.find({ rawText: { $exists: true, $ne: "" } });
  console.log(`Found ${judgments.length} judgments to summarize\n`);

  if (judgments.length === 0) {
    console.log("❌ No judgment with rawText found.");
    console.log("   Run: node scripts/seedJudgments.js first");
    await mongoose.disconnect();
    return;
  }

  for (const judgment of judgments) {
    try {
      await generateAISummary(judgment._id);

      const updated = await Judgment.findById(judgment._id);
      console.log("\n════════════════════════════════════════");
      console.log("AI SUMMARY:");
      console.log("════════════════════════════════════════");
      console.log(updated.aiSummary?.text || "(none)");

      console.log("\n════════════════════════════════════════");
      console.log("KEY POINTS:");
      console.log("════════════════════════════════════════");
      (updated.keyPoints || []).forEach((p, i) => console.log(`${i + 1}. ${p}`));

      console.log("\n════════════════════════════════════════");
      console.log("PRECEDENTS CITED:");
      console.log("════════════════════════════════════════");
      console.log((updated.precedentsCited || []).join(", ") || "None found");
      console.log("\n✅ Saved to MongoDB successfully\n");

      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`❌ Failed for ${judgment.title}:`, err.message);
    }
  }

  await mongoose.disconnect();
}

test();
