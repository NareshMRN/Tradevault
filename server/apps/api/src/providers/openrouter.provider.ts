import { env } from "../config/env";
import { ProviderResilience } from "./resilience";

export class OpenRouterProvider {
  public static readonly DEFAULT_MODEL = "deepseek/deepseek-chat";

  public static async callStructured<T = any>(
    systemPrompt: string,
    userPrompt: string,
    model: string = this.DEFAULT_MODEL,
    userApiKey?: string
  ): Promise<{ data: T; provider: string; model: string }> {
    const apiKey = userApiKey || env.OPENROUTER_API_KEY;

    if (!apiKey || !ProviderResilience.isAvailable("openrouter")) {
      throw new Error("OpenRouter provider unavailable or API key missing");
    }

    try {
      const resp = await ProviderResilience.fetchWithTimeout(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://confluence.trading",
            "X-Title": "Confluence Multi-Agent Engine",
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
        ProviderResilience.recordFailure("openrouter");
        throw new Error(`OpenRouter API error (${resp.status}): ${errText}`);
      }

      const json = await resp.json();
      const content = json.choices?.[0]?.message?.content || "";
      const parsed = ProviderResilience.extractJSON<T>(content);

      if (!parsed) {
        throw new Error("Failed to parse JSON from OpenRouter response");
      }

      ProviderResilience.recordSuccess("openrouter");
      return { data: parsed, provider: "openrouter", model };
    } catch (err: any) {
      ProviderResilience.recordFailure("openrouter");
      throw err;
    }
  }
}
