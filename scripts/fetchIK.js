require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Judgment = require("../models/Judgment");
const { generateAISummary } = require("./summarize");

const TOKEN = process.env.INDIANKANOON_API_KEY;
const BASE  = "https://api.indiankanoon.org";

// ─── Helper: make an API call to IndianKanoon ─────────────────────────────────
async function callAPI(url) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Token ${TOKEN}`,
      "Accept": "application/json"
    }
  });

  if (!res.ok) {
    throw new Error(`IndianKanoon API error: ${res.status} on ${url}`);
  }

  return res.json();
}

// ─── Step 1: Search for judgments ─────────────────────────────────────────────
async function searchJudgments(query, doctype = "supremecourt", pagenum = 0) {
  const url = `${BASE}/search/?formInput=${encodeURIComponent(query)}&doctypes=${doctype}&pagenum=${pagenum}`;
  const data = await callAPI(url);
  return data.docs || [];
}

// ─── Step 2: Fetch full text of one judgment ──────────────────────────────────
async function fetchFullDoc(tid) {
  const url = `${BASE}/doc/${tid}/`;
  const data = await callAPI(url);
  return {
    fullText:     data.doc        || "",
    citeList:     data.citeList   || [],
    citedByList:  data.citedbyList || [],
  };
}

// ─── Map IndianKanoon court code to your enum ─────────────────────────────────
function mapCourt(docsource = "") {
  const src = docsource.toLowerCase();
  if (src.includes("supremecourt")) return "Supreme Court of India";
  if (src.includes("delhi"))        return "Delhi High Court";
  if (src.includes("bombay"))       return "Bombay High Court";
  if (src.includes("chennai"))      return "Madras High Court";
  if (src.includes("kolkata"))      return "Calcutta High Court";
  if (src.includes("allahabad"))    return "Allahabad High Court";
  return "Other";
}

// ─── Main function: search + fetch + save + summarize ────────────────────────
async function importJudgments({ query, doctype = "supremecourt", maxDocs = 5 }) {
  console.log(`\n🔍 Searching: "${query}" in ${doctype}`);

  const docs = await searchJudgments(query, doctype);
  const toProcess = docs.slice(0, maxDocs);

  console.log(`   Found ${docs.length} results — processing ${toProcess.length}\n`);

  for (const doc of toProcess) {
    try {
      // ── Skip if already in your database ──────────────────────────────────
      const exists = await Judgment.findOne({ sourceId: String(doc.tid) });
      if (exists) {
        console.log(`   ⏭  Already exists: ${doc.title}`);
        continue;
      }

      // ── Skip very short or very long documents ────────────────────────────
      if (doc.docsize < 500) {
        console.log(`   ⏭  Too short: ${doc.title}`);
        continue;
      }
      if (doc.docsize > 150000) {
        console.log(`   ⏭  Too long: ${doc.title}`);
        continue;
      }

      console.log(`   📥 Fetching: ${doc.title}`);

      // ── Fetch full judgment text ───────────────────────────────────────────
      const { fullText, citeList, citedByList } = await fetchFullDoc(doc.tid);

      if (!fullText) {
        console.log(`     No text found, skipping`);
        continue;
      }

      // ── Save to MongoDB ────────────────────────────────────────────────────
      const judgment = await Judgment.create({
        title:          doc.title,
        court:          mapCourt(doc.docsource),
        dateOfJudgment: doc.publishdate ? new Date(doc.publishdate) : new Date(),
        subject:        [query],
        rawText:        fullText,
        fullTextUrl:    `https://indiankanoon.org/doc/${doc.tid}/`,
        sourceId:       String(doc.tid),
        sourceName:     "IndianKanoon",
        isPublished:    true,
        citedCases:     citeList.map(c => ({ tid: String(c.tid), title: c.title })),
        citedByCases:   citedByList.map(c => ({ tid: String(c.tid), title: c.title })),
      });

      console.log(`    Saved: ${judgment.title}`);

      // ── Generate AI summary ────────────────────────────────────────────────
      console.log(`   🤖 Generating AI summary...`);
      await generateAISummary(judgment._id);

      // ── Wait between calls — be polite to the API ─────────────────────────
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      console.error(`    Failed: ${err.message}`);
    }
  }
    // Get today's date and 7 days ago in DD-MM-YYYY format
  function getDateRange() {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
  
    const fmt = d => `${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`;
    return { from: fmt(weekAgo), to: fmt(today) };
  }
  
  const { from, to } = getDateRange();
  
  await importJudgments({ 
    query: `doctypes:supremecourt fromdate:${from} todate:${to}`,
    maxDocs: 10 
  });
  await importJudgments({ 
    query: `doctypes:delhi fromdate:${from} todate:${to}`,
    maxDocs: 5 
  });
}

// ─── Run ──────────────────────────────────────────────────────────────────────
async function run() {
  await connectDB();

  // Start small — 3 docs per query to test everything works
  // Increase maxDocs once you confirm it's working
  await importJudgments({ query: "crime",       doctype: "supremecourt", maxDocs: 3 });
  // await importJudgments({ query: "right to privacy",       doctype: "supremecourt", maxDocs: 3 });
  // await importJudgments({ query: "intellectual property",  doctype: "delhi",        maxDocs: 3 });
  // await importJudgments({ query: "cheque bounce",          doctype: "supremecourt", maxDocs: 3 });

  console.log("\n Import done! Check your site.");
  mongoose.disconnect();
}

run().catch(console.error);