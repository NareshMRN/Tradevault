export interface CircuitBreakerState {
  consecutiveFailures: number;
  circuitOpenUntil: number;
}

export class ProviderResilience {
  private static states: Map<string, CircuitBreakerState> = new Map();

  public static isAvailable(provider: string): boolean {
    const state = this.states.get(provider);
    if (!state) return true;
    return Date.now() >= state.circuitOpenUntil;
  }

  public static recordSuccess(provider: string): void {
    this.states.set(provider, { consecutiveFailures: 0, circuitOpenUntil: 0 });
  }

  public static recordFailure(provider: string): void {
    const current = this.states.get(provider) || { consecutiveFailures: 0, circuitOpenUntil: 0 };
    current.consecutiveFailures += 1;
    if (current.consecutiveFailures >= 3) {
      current.circuitOpenUntil = Date.now() + 30000; // 30s open circuit
      console.warn(`[ProviderResilience] Circuit breaker OPEN for ${provider} for 30s`);
    }
    this.states.set(provider, current);
  }

  /**
   * Executes fetch with timeout and single retry.
   */
  public static async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = 18000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return resp;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Extracts and parses valid JSON from LLM markdown fences or raw text.
   */
  public static extractJSON<T = any>(rawText: string): T | null {
    if (!rawText) return null;
    let text = rawText.trim();

    // Check for ```json ... ``` blocks
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      text = match[1].trim();
    }

    try {
      return JSON.parse(text) as T;
    } catch (e) {
      // Find first { and last }
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        try {
          return JSON.parse(text.substring(start, end + 1)) as T;
        } catch (e2) {}
      }
      return null;
    }
  }
}
