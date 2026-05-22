export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function hasSupabaseEnv() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getDefaultEurUsdRate() {
  const configured = Number(process.env.NEXT_PUBLIC_DEFAULT_EUR_USD_RATE);
  return Number.isFinite(configured) && configured > 0 ? configured : 1.08;
}
