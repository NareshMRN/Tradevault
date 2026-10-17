import { env } from "../config/env";
import { ProviderResilience } from "./resilience";

export class GeminiProvider {
  public static readonly PRIMARY_MODEL = "gemini-3.6-flash";
  public static readonly FALLBACK_MODEL = "gemini-2.5-flash";

  public static async callStructured<T = any>(
    systemPrompt: string,
    userPrompt: string,
    userApiKey?: string
  ): Promise<{ data: T; provider: string; model: string }> {
    const apiKey = userApiKey || env.GEMINI_API_KEY;

    if (!apiKey || !ProviderResilience.isAvailable("gemini")) {
      throw new Error("Gemini provider unavailable or API key missing");
    }

    // Try primary model first, fallback to secondary if 404 or unsupported
    const modelsToTry = [this.PRIMARY_MODEL, this.FALLBACK_MODEL];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const resp = await ProviderResilience.fetchWithTimeout(
          url,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: userPrompt }],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
              },
            }),
          },
          18000
        );

        if (!resp.ok) {
          const errText = await resp.text();
          if (resp.status === 404 && model === this.PRIMARY_MODEL) {
            // Model name not yet rolled to this key, fallback to secondary
            continue;
          }
          throw new Error(`Gemini API error (${resp.status}): ${errText}`);
        }

        const json = await resp.json();
        const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = ProviderResilience.extractJSON<T>(candidate);

        if (!parsed) {
          throw new Error("Failed to parse JSON from Gemini response");
        }

        ProviderResilience.recordSuccess("gemini");
        return { data: parsed, provider: "gemini", model };
      } catch (err) {
        lastError = err;
        if (model === this.PRIMARY_MODEL) continue;
      }
    }

    ProviderResilience.recordFailure("gemini");
    throw lastError || new Error("Gemini call failed on all models");
  }
}
