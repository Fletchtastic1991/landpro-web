import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PRICING_PROFILE, PricingProfile, sanitizeProfile } from "@/engines/pricing";

/**
 * The contractor's rates, saved in this browser (localStorage).
 *
 * NOTE: there is no per-user settings table in Supabase yet (the `profiles`
 * table only has name/email/business_name), so rates are stored on this
 * device only. A follow-up PR can add a `pricing_profiles` table + migration.
 */
export const PRICING_STORAGE_KEY = "landpro.pricingProfile.v1";

function load(): PricingProfile {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(PRICING_STORAGE_KEY) : null;
    return raw ? sanitizeProfile(JSON.parse(raw)) : DEFAULT_PRICING_PROFILE;
  } catch {
    return DEFAULT_PRICING_PROFILE;
  }
}

export function usePricingProfile() {
  const [profile, setProfile] = useState<PricingProfile>(load);

  useEffect(() => {
    try {
      window.localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      /* storage full or blocked (private mode) — rates still work for this session */
    }
  }, [profile]);

  const update = useCallback((patch: Partial<PricingProfile>) => {
    setProfile(prev => sanitizeProfile({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setProfile(DEFAULT_PRICING_PROFILE), []);

  return { profile, update, reset };
}
