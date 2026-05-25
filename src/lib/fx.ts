import { getDefaultEurUsdRate } from "@/lib/env";

export type LiveFxRate = {
  rate: number;
  usingFallback: boolean;
};

export async function getLiveEurUsdRate(): Promise<LiveFxRate> {
  const fallbackRate = getDefaultEurUsdRate();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD", {
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("Exchange rate request failed.");
    }

    const payload = (await response.json()) as { rates?: { USD?: unknown } };
    const rate = Number(payload.rates?.USD);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("Exchange rate response was invalid.");
    }

    return { rate, usingFallback: false };
  } catch {
    return { rate: fallbackRate, usingFallback: true };
  } finally {
    clearTimeout(timeout);
  }
}
