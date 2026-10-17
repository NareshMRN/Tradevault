import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function checkAvailableModels() {
  console.log("Checking active models for each provider...\n");

  // 1. Groq models
  const groqKey = process.env.GROQ_API_KEY || "";
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${groqKey}` },
    });
    const data: any = await res.json();
    const ids = data.data?.map((m: any) => m.id) || [];
    console.log("✅ All Groq supported models:", ids);
  } catch (e: any) {
    console.log("Groq error:", e.message);
  }

  // 2. Mistral models
  const mistralKey = process.env.MISTRAL_API_KEY || "";
  try {
    const res = await fetch("https://api.mistral.ai/v1/models", {
      headers: { Authorization: `Bearer ${mistralKey}` },
    });
    const data: any = await res.json();
    const ids = data.data?.map((m: any) => m.id) || [];
    console.log("\n✅ Mistral supported models:", ids.slice(0, 10));
  } catch (e: any) {
    console.log("Mistral error:", e.message);
  }

  // 3. Gemini models
  const geminiKey = process.env.GEMINI_API_KEY || "";
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
    const data: any = await res.json();
    const names = data.models?.map((m: any) => m.name.replace("models/", "")) || [];
    console.log("\n✅ Gemini supported models:", names.filter((n: string) => n.includes("flash") || n.includes("pro")));
  } catch (e: any) {
    console.log("Gemini error:", e.message);
  }

  // 4. NVIDIA NIM models
  const nvidiaKey = process.env.NVIDIA_API_KEY || "";
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
      headers: { Authorization: `Bearer ${nvidiaKey}` },
    });
    const data: any = await res.json();
    const ids = data.data?.map((m: any) => m.id) || [];
    console.log("\n✅ NVIDIA supported models:", ids.filter((id: string) => id.includes("llama") || id.includes("nemotron")).slice(0, 5));
  } catch (e: any) {
    console.log("NVIDIA error:", e.message);
  }
}

checkAvailableModels();
