require("dotenv").config();
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function test() {
  console.log("🔌 Testing OpenAI connection...");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Reply with just the word: CONNECTED" }],
    temperature: 0,
  });

  console.log("✅ OpenAI says:", response.choices[0].message.content);
}

test().catch(err => {
  console.error("❌ OpenAI Error:", err.message);
  console.log("\nCheck:");
  console.log("1. Is OPENAI_API_KEY correct in your .env?");
  console.log("2. Do you have billing set up at platform.openai.com?");
});