import { env } from "../config/env";
import { ProviderResilience } from "./resilience";

export class NvidiaProvider {
  public static readonly PRIMARY_MODEL = "meta/llama-3.2-11b-vision-instruct";
  public static readonly FALLBACK_MODEL = "mistralai/mixtral-8x22b-v0.1";
  public static readonly MODEL = NvidiaProvider.PRIMARY_MODEL;

  public static async callStructured<T = any>(
    systemPrompt: string,
    userPrompt: string,
    userApiKey?: string
  ): Promise<{ data: T; provider: string; model: string }> {
    const apiKey = userApiKey || env.NVIDIA_API_KEY;

    if (!apiKey || !ProviderResilience.isAvailable("nvidia")) {
      throw new Error("NVIDIA NIM provider unavailable or API key missing");
    }

    const modelsToTry = [this.PRIMARY_MODEL, this.FALLBACK_MODEL];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const resp = await ProviderResilience.fetchWithTimeout(
          "https://integrate.api.nvidia.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: `${systemPrompt}\nOutput MUST be strictly valid JSON.` },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.1,
              max_tokens: 1500,
            }),
          },
          18000
        );

        if (!resp.ok) {
          const errText = await resp.text();
          if ((resp.status === 404 || resp.status === 410) && model === this.PRIMARY_MODEL) {
            continue;
          }
          throw new Error(`NVIDIA NIM API error (${resp.status}): ${errText}`);
        }

        const json = await resp.json();
        const content = json.choices?.[0]?.message?.content || "";
        const parsed = ProviderResilience.extractJSON<T>(content);

        if (!parsed) {
          throw new Error("Failed to parse JSON from NVIDIA NIM response");
        }

        ProviderResilience.recordSuccess("nvidia");
        return { data: parsed, provider: "nvidia", model };
      } catch (err: any) {
        lastError = err;
        if (model === this.PRIMARY_MODEL) continue;
      }
    }

    ProviderResilience.recordFailure("nvidia");
    throw lastError || new Error("NVIDIA NIM call failed on all models");
  }
}
