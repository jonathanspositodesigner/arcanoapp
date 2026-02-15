import { useState, useCallback, useEffect } from "react";

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

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setEmail(saved.email);
      if (saved.verified && saved.usesRemaining > 0) {
        setPhase("active");
        setUsesRemaining(saved.usesRemaining);
      } else if (saved.verified && saved.usesRemaining <= 0) {
        setPhase("finished");
        setUsesRemaining(0);
      }
    }
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
