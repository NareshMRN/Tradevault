import { env } from "../config/env";
import { ProviderResilience } from "./resilience";

export class GroqProvider {
  public static readonly PRIMARY_MODEL = "openai/gpt-oss-120b";
  public static readonly FALLBACK_MODEL = "qwen/qwen3.8-27b";
  public static readonly MODEL = GroqProvider.PRIMARY_MODEL;

  public static async callStructured<T = any>(
    systemPrompt: string,
    userPrompt: string,
    userApiKey?: string
  ): Promise<{ data: T; provider: string; model: string }> {
    const apiKey = userApiKey || env.GROQ_API_KEY;

    if (!apiKey || !ProviderResilience.isAvailable("groq")) {
      throw new Error("Groq provider unavailable or API key missing");
    }

    const modelsToTry = [this.PRIMARY_MODEL, this.FALLBACK_MODEL];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const resp = await ProviderResilience.fetchWithTimeout(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.1,
              max_tokens: 1500,
              response_format: { type: "json_object" },
            }),
          },
          16000
        );

        if (!resp.ok) {
          const errText = await resp.text();
          if (resp.status === 400 || resp.status === 404) {
            // Model decommissioned or not found, try fallback
            continue;
          }
          throw new Error(`Groq API error (${resp.status}): ${errText}`);
        }

        const json = await resp.json();
        const content = json.choices?.[0]?.message?.content || "";
        const parsed = ProviderResilience.extractJSON<T>(content);

        if (!parsed) {
          throw new Error("Failed to parse JSON from Groq response");
        }

        ProviderResilience.recordSuccess("groq");
        return { data: parsed, provider: "groq", model };
      } catch (err: any) {
        lastError = err;
        if (model === this.PRIMARY_MODEL) continue;
      }
    }

    ProviderResilience.recordFailure("groq");
    throw lastError || new Error("Groq call failed on all models");
  }
}
