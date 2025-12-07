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

const hasClickedInSession = (promptId: string): boolean => {
  return getSessionClicks().has(promptId);
};

export const trackPromptClick = async (
  promptId: string,
  promptTitle: string,
  isAdminPrompt: boolean
) => {
  // Only track if not already clicked in this session
  if (hasClickedInSession(promptId)) {
    return;
  }

  try {
    await supabase.from("prompt_clicks").insert({
      prompt_id: promptId,
      prompt_title: promptTitle,
      is_admin_prompt: isAdminPrompt,
    });
    // Mark as clicked in this session
    addSessionClick(promptId);
  } catch (error) {
    console.error("Error tracking prompt click:", error);
  }
};
