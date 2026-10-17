import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { Redis } from "@upstash/redis";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function runVerification() {
  console.log("==================================================");
  console.log("🔍 CONFLUENCE LIVE SYSTEM VERIFICATION");
  console.log("==================================================\n");

  const results: Record<string, { status: "PASS" | "FAIL" | "WARN"; message: string }> = {};

  // 1. Check MongoDB Atlas Connection
  console.log("1️⃣ Testing MongoDB Atlas Connection...");
  const mongoUri = process.env.MONGODB_URI || "";
  try {
    if (!mongoUri) throw new Error("MONGODB_URI missing in .env");
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    results["MongoDB Atlas"] = {
      status: "PASS",
      message: `Connected successfully to database: ${mongoose.connection.name}`,
    };
    console.log("   ✅ MongoDB Atlas: CONNECTED\n");
    await mongoose.disconnect();
  } catch (err: any) {
    results["MongoDB Atlas"] = { status: "FAIL", message: err.message };
    console.log(`   ❌ MongoDB Atlas: ${err.message}\n`);
  }

  // 2. Check Upstash Redis Connection
  console.log("2️⃣ Testing Upstash Redis REST Connection...");
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || "";
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  try {
    if (!upstashUrl || !upstashToken) throw new Error("Upstash REST credentials missing");
    const redis = new Redis({ url: upstashUrl, token: upstashToken });
    await redis.set("confluence_verify_ping", "active", { ex: 10 });
    const val = await redis.get("confluence_verify_ping");
    if (val === "active") {
      results["Upstash Redis"] = { status: "PASS", message: "Read/Write verified over HTTPS" };
      console.log("   ✅ Upstash Redis: PING SUCCESSFUL (Read/Write OK)\n");
    } else {
      throw new Error(`Unexpected value: ${val}`);
    }
  } catch (err: any) {
    results["Upstash Redis"] = { status: "FAIL", message: err.message };
    console.log(`   ❌ Upstash Redis: ${err.message}\n`);
  }

  // 3. Test Groq API (Reasoning Model)
  console.log("3️⃣ Testing Groq API Key...");
  const groqKey = process.env.GROQ_API_KEY || "";
  try {
    if (!groqKey) throw new Error("GROQ_API_KEY missing");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: [{ role: "user", content: "Reply with the word 'READY' only." }],
        max_tokens: 10,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    const data: any = await res.json();
    const reply = data.choices[0]?.message?.content || "";
    results["Groq API"] = { status: "PASS", message: `Model qwen/qwen3.8-27b online (${reply.trim()})` };
    console.log("   ✅ Groq API (qwen/qwen3.8-27b): ONLINE\n");
  } catch (err: any) {
    results["Groq API"] = { status: "FAIL", message: err.message };
    console.log(`   ❌ Groq API: ${err.message}\n`);
  }

  // 4. Test Mistral API
  console.log("4️⃣ Testing Mistral API Key...");
  const mistralKey = process.env.MISTRAL_API_KEY || "";
  try {
    if (!mistralKey) throw new Error("MISTRAL_API_KEY missing");
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mistralKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [{ role: "user", content: "Reply 'READY' only." }],
        max_tokens: 10,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    results["Mistral API"] = { status: "PASS", message: "Model mistral-small-latest reachable" };
    console.log("   ✅ Mistral API (mistral-small-latest): ONLINE\n");
  } catch (err: any) {
    results["Mistral API"] = { status: "FAIL", message: err.message };
    console.log(`   ❌ Mistral API: ${err.message}\n`);
  }

  // 5. Test NVIDIA NIM API
  console.log("5️⃣ Testing NVIDIA NIM API Key...");
  const nvidiaKey = process.env.NVIDIA_API_KEY || "";
  try {
    if (!nvidiaKey) throw new Error("NVIDIA_API_KEY missing");
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${nvidiaKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta/llama-3.2-11b-vision-instruct",
        messages: [{ role: "user", content: "Reply 'READY' only." }],
        max_tokens: 10,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    results["NVIDIA NIM API"] = { status: "PASS", message: "meta/llama-3.2-11b-vision-instruct online" };
    console.log("   ✅ NVIDIA NIM API (llama-3.2-11b): ONLINE\n");
  } catch (err: any) {
    results["NVIDIA NIM API"] = { status: "FAIL", message: err.message };
    console.log(`   ❌ NVIDIA NIM API: ${err.message}\n`);
  }

  // 6. Test OpenRouter API
  console.log("6️⃣ Testing OpenRouter API Key...");
  const openrouterKey = process.env.OPENROUTER_API_KEY || "";
  try {
    if (!openrouterKey) throw new Error("OPENROUTER_API_KEY missing");
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${openrouterKey}` },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    const data: any = await res.json();
    results["OpenRouter API"] = { status: "PASS", message: `Key active. Limit: ${data.data?.limit || "unlimited"}` };
    console.log("   ✅ OpenRouter API: ONLINE (Key validated)\n");
  } catch (err: any) {
    results["OpenRouter API"] = { status: "FAIL", message: err.message };
    console.log(`   ❌ OpenRouter API: ${err.message}\n`);
  }

  // 7. Test Gemini API
  console.log("7️⃣ Testing Gemini API Key...");
  const geminiKey = process.env.GEMINI_API_KEY || "";
  try {
    if (!geminiKey) throw new Error("GEMINI_API_KEY missing");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with READY." }] }],
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    results["Google Gemini API"] = { status: "PASS", message: "gemini-2.5-flash reachable" };
    console.log("   ✅ Google Gemini API (gemini-2.5-flash): ONLINE\n");
  } catch (err: any) {
    results["Google Gemini API"] = { status: "FAIL", message: err.message };
    console.log(`   ❌ Google Gemini API: ${err.message}\n`);
  }

  console.log("==================================================");
  console.log("📊 SUMMARY REPORT");
  console.log("==================================================");
  console.table(results);
}

runVerification();
