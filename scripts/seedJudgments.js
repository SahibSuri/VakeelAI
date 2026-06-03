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
    rawText: `SUPREME COURT OF INDIA
          CRIMINAL APPELLATE JURISDICTION
          Criminal Appeal No. 1142 of 2026

          CORAM: Justice A.K. Majumdar and Justice R. Singh

          JUDGMENT

          The appellant Rajesh Sharma was convicted by the Sessions Court, Lucknow under Section 302 of the Indian Penal Code and sentenced to life imprisonment. The High Court of Allahabad confirmed the conviction and sentence. The present appeal is filed against that order.

          FACTS:
          On the night of 14th March 2024, the deceased Mohan Lal was found dead in his residence. The informant, brother of the deceased, filed an FIR after a delay of 48 hours stating he was hospitalised due to shock. Three eyewitnesses testified that they saw the appellant leaving the deceased's house that night. Forensic evidence including fingerprint analysis and blood group matching also implicated the appellant.

          CONTENTIONS OF APPELLANT:
          Learned counsel for the appellant submitted that the delay of 48 hours in lodging the FIR creates serious doubt about the prosecution case and the eyewitness accounts are inconsistent on minor details rendering them unreliable.

          CONTENTIONS OF STATE:
          The learned Additional Advocate General submitted that the delay has been satisfactorily explained and minor inconsistencies in eyewitness accounts do not affect the credibility of the overall testimony when corroborated by forensic evidence.

          ANALYSIS AND FINDINGS:
          On the question of delay in FIR: This Court has consistently held that mere delay in lodging an FIR does not by itself render the prosecution case doubtful. What matters is whether the delay has been satisfactorily explained. In the present case the informant was hospitalised and this explanation is cogent and acceptable. We rely on the principle laid down in Thulia Kali v. State of Tamil Nadu wherein this Court held that FIR is not an encyclopedia of all facts and minor inconsistencies do not destroy its evidentiary value.

          On eyewitness testimony: The three eyewitnesses are independent witnesses with no apparent motive to falsely implicate the appellant. Minor inconsistencies on peripheral details do not destroy the credibility of witnesses when their core testimony is consistent and corroborated. The forensic evidence fully corroborates their account. Chain of custody of forensic samples was properly established through documentary evidence.

          CONCLUSION:
          We find no infirmity in the concurrent findings of the Sessions Court and the High Court. The prosecution has proved the guilt of the appellant beyond reasonable doubt. The appeal is dismissed. Conviction under Section 302 IPC and sentence of life imprisonment are confirmed.`,
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
    rawText: `HIGH COURT OF DELHI
          CS(COMM) 89 OF 2026

          CORAM: Justice P. Nandrajog

          ORDER ON APPLICATION FOR INTERIM INJUNCTION

          The plaintiff Tech Startup India Pvt Ltd has filed this suit alleging that the defendant, a former employee, has misappropriated trade secrets relating to an artificial intelligence algorithm developed by the plaintiff company.

          BACKGROUND:
          The defendant was employed as Senior AI Engineer with the plaintiff from 2022 to 2025. During this period he had access to proprietary AI model architecture, training datasets, and hyperparameter configurations. After resignation the defendant joined a competitor and the plaintiff alleges their competitor's product shows substantial similarity to its own AI system.

          PLAINTIFF'S CASE:
          The plaintiff submits that the AI model weights, training data, and architectural decisions constitute trade secrets. The defendant signed a non-disclosure agreement at the time of joining. There is prima facie evidence of misappropriation warranting an interim injunction.

          DEFENDANT'S CASE:
          The defendant submits that general skills and knowledge acquired during employment cannot be restrained. He denies copying any specific proprietary material.

          ANALYSIS:
          The threshold question is whether AI model weights and training datasets can constitute trade secrets under Indian law. This Court is of the opinion that they can. Trade secret protection requires that the information have commercial value, that steps were taken to maintain secrecy, and that the information not be generally known. All three conditions appear to be met here. The plaintiff took steps to secure the data, the AI architecture has clear commercial value, and it is not publicly available.

          On the balance of convenience: The plaintiff stands to suffer irreparable harm if the injunction is refused and the defendant uses this information to benefit the competitor. The defendant will not suffer disproportionate harm if injunction is granted as he can continue his employment in other capacities not involving the disputed technology.

          ORDER:
          The application for interim injunction is allowed. The defendant is restrained from using, disclosing, or causing to be used the AI model weights, training datasets, and proprietary architectural configurations of the plaintiff pending hearing of the suit. Matter listed for hearing on merits on 15th July 2026.`,
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
