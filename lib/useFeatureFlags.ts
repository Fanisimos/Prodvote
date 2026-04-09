import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { FeatureFlag } from './types';

let cachedFlags: Record<string, boolean> = {};
let lastFetch = 0;

export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>(cachedFlags);

  useEffect(() => {
    // Cache for 5 minutes
    if (Date.now() - lastFetch < 5 * 60 * 1000 && Object.keys(cachedFlags).length > 0) {
      setFlags(cachedFlags);
      return;
    }
    supabase.from('feature_flags').select('key, enabled').then(({ data }) => {
      const map: Record<string, boolean> = {};
      (data || []).forEach((f: FeatureFlag) => { map[f.key] = f.enabled; });
      cachedFlags = map;
      lastFetch = Date.now();
      setFlags(map);
    });
  }, []);

  return flags;
}
