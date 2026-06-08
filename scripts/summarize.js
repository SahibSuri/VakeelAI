require("dotenv").config();
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const Judgment = require("../models/Judgment");

async function generateAISummary(judgmentId) {
  // 1. Fetch the judgment from MongoDB
  const judgment = await Judgment.findById(judgmentId);

  if (!judgment) throw new Error("Judgment not found");
  if (!judgment.rawText || judgment.rawText.trim() === "") {
    throw new Error("No rawText found on this judgment");
  }

  console.log(`📄 Summarizing: ${judgment.title}`);

  // 2. Truncate text — take first 6000 + last 6000 chars
  //    First part has the facts, last part has the holding/order
  let text = judgment.rawText;
  if (text.length > 12000) {
    text =
      text.slice(0, 6000) +
      "\n\n...[middle section omitted]...\n\n" +
      text.slice(-6000);
  }

  // 3. Build the prompt
  const prompt = `You are a senior Indian legal analyst writing for a legal news platform read by lawyers, law students, and educated citizens.
                  
                  Analyze the following court judgment and respond ONLY in this exact JSON format with no extra text outside the JSON:
                  {
                    "summary": "Write a detailed 4-6 paragraph summary covering: (1) Background and facts of the case - who the parties are and what dispute arose, (2) Arguments made by each side, (3) Legal issues the court had to decide, (4) The court's reasoning and analysis, (5) Final decision and order, (6) Significance of this judgment for Indian law. Each paragraph should be 3-4 sentences. Write clearly so a law student can understand without losing legal accuracy.",
                  
                    "keyPoints": [
                      "Key legal principle 1 established or reaffirmed",
                      "Key legal principle 2",
                      "Key legal principle 3",
                      "Key legal principle 4",
                      "Key legal principle 5"
                    ],
                  
                    "precedentsCited": ["Only case names explicitly mentioned in the text"],
                  
                    "legalIssues": ["Issue 1 the court decided", "Issue 2"],
                  
                    ""verdict": "one of: Upheld / Overruled / Modified / Dismissed / Allowed / Partially Allowed / Reaffirmed / N/A / Other"",
                  
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

  // 4. Call OpenAI
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  // 5. Parse the response
  const raw = response.choices[0].message.content;
  const parsed = JSON.parse(raw);

  // 6. Save back to MongoDB
  judgment.aiSummary = {
    text: parsed.summary,
    generatedAt: new Date(),
    model: "gpt-4o",
  };
  judgment.keyPoints       = parsed.keyPoints || [];
  judgment.precedentsCited = parsed.precedentsCited || [];
  judgment.legalIssues     = parsed.legalIssues || [];
  judgment.significance    = parsed.significance || "";
  if (parsed.verdict) judgment.verdict = parsed.verdict;
  
  await judgment.save();

  console.log(`✅ Done: ${judgment.title}`);
  return judgment.aiSummary;
}

module.exports = { generateAISummary };