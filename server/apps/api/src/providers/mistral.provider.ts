import { env } from "../config/env";
import { ProviderResilience } from "./resilience";

export class MistralProvider {
  public static readonly PRIMARY_MODEL = "codestral-latest";
  public static readonly FALLBACK_MODEL = "mistral-small-latest";
  public static readonly MODEL = MistralProvider.PRIMARY_MODEL;

  public static async callStructured<T = any>(
    systemPrompt: string,
    userPrompt: string,
    userApiKey?: string
  ): Promise<{ data: T; provider: string; model: string }> {
    const apiKey = userApiKey || env.MISTRAL_API_KEY;

    if (!apiKey || !ProviderResilience.isAvailable("mistral")) {
      throw new Error("Mistral provider unavailable or API key missing");
    }

    const modelsToTry = [this.PRIMARY_MODEL, this.FALLBACK_MODEL];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const resp = await ProviderResilience.fetchWithTimeout(
          "https://api.mistral.ai/v1/chat/completions",
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
          18000
        );

        if (!resp.ok) {
          const errText = await resp.text();
          if ((resp.status === 403 || resp.status === 404) && model === this.PRIMARY_MODEL) {
            continue;
          }
          throw new Error(`Mistral API error (${resp.status}): ${errText}`);
        }

        const json = await resp.json();
        const content = json.choices?.[0]?.message?.content || "";
        const parsed = ProviderResilience.extractJSON<T>(content);

        if (!parsed) {
          throw new Error("Failed to parse JSON from Mistral response");
        }

        ProviderResilience.recordSuccess("mistral");
        return { data: parsed, provider: "mistral", model };
      } catch (err: any) {
        lastError = err;
        if (model === this.PRIMARY_MODEL) continue;
      }
    }

    ProviderResilience.recordFailure("mistral");
    throw lastError || new Error("Mistral call failed on all models");
  }
}
