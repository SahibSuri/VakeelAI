/**
 * Run with: npm run seed
 * Seeds 3 sample judgments with AI summaries already written (no API call needed in dev)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Judgment = require("../models/Judgment");

const sampleJudgments = [
  {
    title: "Sharma v. State of Uttar Pradesh",
    caseNumber: "Criminal Appeal No. 1142/2026",
    court: "Supreme Court of India",
    bench: ["Justice A. K. Majumdar", "Justice R. Singh"],
    parties: { petitioner: "Rajesh Sharma", respondent: "State of Uttar Pradesh" },
    dateOfJudgment: new Date("2026-04-18"),
    subject: ["Criminal Law", "Section 302 IPC", "Right to Fair Trial"],
    verdict: "Upheld",
    fullTextUrl: "https://indiankanoon.org/doc/example1",
    aiSummary: {
      text: "The Supreme Court dismissed the appeal challenging a life sentence under Section 302 IPC. The bench held that eyewitness testimony corroborated by forensic evidence was sufficient for conviction. Significantly, the court reaffirmed that delays in filing an FIR do not automatically vitiate a prosecution case where the delay is satisfactorily explained. The judgment strengthens the precedent that corroborated witness accounts remain the backbone of criminal prosecutions under Indian law.",
      generatedAt: new Date(),
      model: "gpt-4o",
    },
    keyPoints: [
      "FIR delay does not automatically invalidate prosecution",
      "Corroborated eyewitness testimony is sufficient for Section 302 conviction",
      "Chain of custody of forensic evidence must be established",
      "Life sentence upheld — appeal dismissed",
    ],
    precedentsCited: ["Thulia Kali v. State of Tamil Nadu", "Lallu Manjhi v. State of Jharkhand"],
    avgRating: 8.2,
    totalRatings: 47,
    totalReviews: 31,
    isPublished: true,
    isFeatured: false,
  },
  {
    title: "Tech Startup India Pvt. Ltd. v. Intellect Corp",
    caseNumber: "CS(Comm) 89/2026",
    court: "Delhi High Court",
    bench: ["Justice P. Nandrajog"],
    parties: { petitioner: "Tech Startup India Pvt. Ltd.", respondent: "Intellect Corp" },
    dateOfJudgment: new Date("2026-04-22"),
    subject: ["IP Law", "Trade Secrets", "AI", "Injunction"],
    verdict: "Allowed",
    fullTextUrl: "https://indiankanoon.org/doc/example2",
    aiSummary: {
      text: "Delhi HC granted an interim injunction restraining a former employee from using trade secrets related to an AI algorithm. The court applied the balance of convenience test and held that the plaintiff demonstrated a prima facie case of misappropriation. Notably, the judgment recognises that AI model weights and training datasets can qualify as trade secrets under Indian law — a first-of-its-kind observation that will have major implications for the Indian tech sector and IP litigation.",
      generatedAt: new Date(),
      model: "gpt-4o",
    },
    keyPoints: [
      "AI model weights can qualify as trade secrets under Indian law",
      "Balance of convenience test applied for interim injunction",
      "Non-disclosure agreements must explicitly cover AI assets",
      "First Indian judgment to recognise training datasets as proprietary",
    ],
    precedentsCited: ["American Express Bank Ltd. v. Ms. Priya Puri", "Burlington Home Shopping v. Rajnish Chibber"],
    avgRating: 9.1,
    totalRatings: 83,
    totalReviews: 56,
    isPublished: true,
    isFeatured: true,
  },
  {
    title: "In Re: Privacy of Digital Communications",
    caseNumber: "Writ Petition (Civil) 441/2026",
    court: "Supreme Court of India",
    bench: ["CJI D. Y. Chandrachud", "Justice S. K. Kaul", "Justice B. R. Gavai"],
    parties: { petitioner: "Digital Rights Foundation", respondent: "Union of India" },
    dateOfJudgment: new Date("2026-04-28"),
    subject: ["Constitutional Law", "Article 21", "Right to Privacy", "Digital Rights"],
    verdict: "Partially Allowed",
    fullTextUrl: "https://indiankanoon.org/doc/example3",
    aiSummary: {
      text: "A constitutional bench partially allowed a writ challenging government interception of encrypted communications. While the court upheld citizens' right to digital privacy under Article 21, it carved out an exception for national security under a proportionality framework. Petitioners won on principle but not remedy — the court directed formation of a parliamentary oversight committee rather than striking down the impugned provisions. Critics argue this is a half-measure; supporters call it judicial restraint.",
      generatedAt: new Date(),
      model: "gpt-4o",
    },
    keyPoints: [
      "Digital privacy is a fundamental right under Article 21",
      "National security can override privacy under proportionality test",
      "Parliamentary oversight committee to be formed within 6 months",
      "Impugned interception provisions not struck down — stayed pending committee",
    ],
    precedentsCited: [
      "K.S. Puttaswamy v. Union of India",
      "PUCL v. Union of India",
      "Gobind v. State of Madhya Pradesh",
    ],
    avgRating: 6.4,
    totalRatings: 121,
    totalReviews: 89,
    isPublished: true,
    isFeatured: true,
  },
];

async function seed() {
  await connectDB();
  await Judgment.deleteMany({});
  const inserted = await Judgment.insertMany(sampleJudgments);
  console.log(`✅ Seeded ${inserted.length} judgments`);
  mongoose.disconnect();
}

seed().catch(console.error);
