/**
 * summarize.js — How AI summaries actually work
 *
 * FLOW:
 *  1. Admin adds a judgment (via API or seed script) with rawText
 *  2. This script is called — it sends the text to OpenAI with a legal prompt
 *  3. The response (summary + key points) is saved back to the Judgment document
 *  4. Frontend reads aiSummary.text — not the rawText
 *
 * HOW WE GET THE JUDGMENTS:
 *  Option A: IndianKanoon API  → fetch(indiankanoon.org/api/search/?formInput=...)
 *  Option B: Supreme Court website — scrape PDF, extract text with pdf-parse
 *  Option C: Manual admin entry (for MVP)
 */

const OpenAI = require("openai");
const Judgment = require("../models/Judgment");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Main summarization function ─────────────────────────────────────────────
async function generateAISummary(judgmentId) {
  const judgment = await Judgment.findById(judgmentId);
  if (!judgment || !judgment.rawText) throw new Error("No raw text to summarize");

  // Truncate to ~12,000 chars (~3000 tokens) to stay within context limits
  // For long judgments, we take the beginning + end (most important parts)
  const text =
    judgment.rawText.length > 12000
      ? judgment.rawText.slice(0, 6000) + "\n...[middle section truncated]...\n" + judgment.rawText.slice(-6000)
      : judgment.rawText;

  const prompt = `You are a senior Indian legal assistant. Summarize the following court judgment for lawyers and the general public.

Your output must be in this exact JSON format:
{
  "summary": "2–3 paragraph plain-language summary of the judgment. Mention the court, parties, key issue, holding, and significance. Max 250 words.",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4"],
  "precedentsCited": ["Case name 1", "Case name 2"]
}

Rules:
- Never fabricate case names or citations. If you are not sure, omit.
- Write for an Indian audience. Reference relevant Indian laws by name.
- keyPoints: 3–5 bullet takeaways a lawyer can use at a glance.
- Do NOT give legal advice. This is a summary only.
- Output valid JSON only. No extra text.

JUDGMENT TEXT:
${text}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2, // low temp = more factual, less creative
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(response.choices[0].message.content);

  // Save back to database
  judgment.aiSummary = {
    text: parsed.summary,
    generatedAt: new Date(),
    model: "gpt-4o",
  };
  judgment.keyPoints = parsed.keyPoints || [];
  judgment.precedentsCited = parsed.precedentsCited || [];
  await judgment.save();

  console.log(`✅ AI summary generated for: ${judgment.title}`);
  return judgment.aiSummary;
}

// ─── IndianKanoon fetcher — Option A for getting real judgment data ────────────
// Register at https://indiankanoon.org/api/ to get a token
async function fetchFromIndianKanoon(query, maxResults = 5) {
  const token = process.env.INDIANKANOON_API_KEY;
  if (!token) throw new Error("INDIANKANOON_API_KEY not set");

  // Search endpoint
  const searchUrl = `https://api.indiankanoon.org/search/?formInput=${encodeURIComponent(query)}&pagenum=0`;
  const searchRes = await fetch(searchUrl, {
    method: "POST",
    headers: { Authorization: `Token ${token}` },
  });
  const searchData = await searchRes.json();
  const docs = (searchData.docs || []).slice(0, maxResults);

  const results = [];

  for (const doc of docs) {
    // Fetch full document text
    const docUrl = `https://api.indiankanoon.org/doc/${doc.tid}/`;
    const docRes = await fetch(docUrl, {
      method: "POST",
      headers: { Authorization: `Token ${token}` },
    });
    const docData = await docRes.json();

    results.push({
      title: doc.title,
      court: mapCourtName(doc.docsource),
      dateOfJudgment: new Date(doc.publishdate || doc.judgmentdate),
      rawText: docData.doc || "",
      fullTextUrl: `https://indiankanoon.org/doc/${doc.tid}/`,
      sourceId: doc.tid,
      sourceName: "IndianKanoon",
    });
  }

  return results;
}

// ─── Map IndianKanoon court codes to our enum ─────────────────────────────────
function mapCourtName(source = "") {
  if (source.includes("supremecourt")) return "Supreme Court of India";
  if (source.includes("delhihc")) return "Delhi High Court";
  if (source.includes("bombayhc")) return "Bombay High Court";
  if (source.includes("madrashc")) return "Madras High Court";
  if (source.includes("calcuttahc")) return "Calcutta High Court";
  if (source.includes("allahabadhc")) return "Allahabad High Court";
  return "Other";
}

module.exports = { generateAISummary, fetchFromIndianKanoon };
