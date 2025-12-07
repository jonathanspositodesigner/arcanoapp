import { supabase } from "@/integrations/supabase/client";

// Session key for tracking clicks - resets when user closes browser/tab
const SESSION_CLICKS_KEY = "promptverso_session_clicks";

const getSessionClicks = (): Set<string> => {
  const stored = sessionStorage.getItem(SESSION_CLICKS_KEY);
  if (stored) {
    try {
      return new Set(JSON.parse(stored));
    } catch {
      return new Set();
    }
  }
  return new Set();
};

const addSessionClick = (promptId: string): void => {
  const clicks = getSessionClicks();
  clicks.add(promptId);
  sessionStorage.setItem(SESSION_CLICKS_KEY, JSON.stringify([...clicks]));
};

export const hasClickedInSession = (promptId: string): boolean => {
  return getSessionClicks().has(promptId);
};

export const trackPromptClick = async (
  promptId: string,
  promptTitle: string,
  isAdminPrompt: boolean
): Promise<boolean> => {
  // Only track if not already clicked in this session
  if (hasClickedInSession(promptId)) {
    return false; // Did not register a new click
  }

  try {
    await supabase.from("prompt_clicks").insert({
      prompt_id: promptId,
      prompt_title: promptTitle,
      is_admin_prompt: isAdminPrompt,
    });
    // Mark as clicked in this session
    addSessionClick(promptId);
    return true; // Successfully registered a new click
  } catch (error) {
    console.error("Error tracking prompt click:", error);
    return false;
  }
};
