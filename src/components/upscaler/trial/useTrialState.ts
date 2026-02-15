import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TrialPhase = "locked" | "signup" | "active" | "finished";

interface TrialState {
  email: string;
  verified: boolean;
  usesRemaining: number;
}

const STORAGE_KEY = "upscaler_landing_trial";

function loadState(): TrialState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state: TrialState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useTrialState() {
  const [phase, setPhase] = useState<TrialPhase>("locked");
  const [email, setEmail] = useState("");
  const [usesRemaining, setUsesRemaining] = useState(3);

  // Restore from localStorage on mount, then sync with backend
  useEffect(() => {
    const saved = loadState();
    if (!saved || !saved.verified) return;

    setEmail(saved.email);
    // Temporarily use localStorage values
    setPhase(saved.usesRemaining > 0 ? "active" : "finished");
    setUsesRemaining(saved.usesRemaining);

    // Sync with backend: "send" endpoint returns real uses_remaining for verified users
    supabase.functions.invoke("landing-trial-code/send", {
      body: { email: saved.email, name: "sync" },
    }).then(({ data }) => {
      if (data?.already_verified) {
        const serverUses = data.uses_remaining ?? 0;
        setUsesRemaining(serverUses);
        saveState({ email: saved.email, verified: true, usesRemaining: serverUses });
        setPhase(serverUses > 0 ? "active" : "finished");
      }
    }).catch(() => {
      // Fallback to localStorage values (already set above)
    });
  }, []);

  const openSignup = useCallback(() => setPhase("signup"), []);
  const closeSignup = useCallback(() => setPhase("locked"), []);

  const onVerified = useCallback((verifiedEmail: string, uses: number) => {
    setEmail(verifiedEmail);
    setUsesRemaining(uses);
    setPhase("active");
    saveState({ email: verifiedEmail, verified: true, usesRemaining: uses });
  }, []);

  const consumeUse = useCallback(() => {
    const newRemaining = Math.max(0, usesRemaining - 1);
    setUsesRemaining(newRemaining);
    saveState({ email, verified: true, usesRemaining: newRemaining });
  }, [usesRemaining, email]);

  const finishTrial = useCallback(() => {
    setPhase("finished");
  }, []);

  return { phase, email, usesRemaining, openSignup, closeSignup, onVerified, consumeUse, finishTrial };
}
