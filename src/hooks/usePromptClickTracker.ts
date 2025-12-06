import { supabase } from "@/integrations/supabase/client";

export const trackPromptClick = async (
  promptId: string,
  promptTitle: string,
  isAdminPrompt: boolean
) => {
  try {
    await supabase.from("prompt_clicks").insert({
      prompt_id: promptId,
      prompt_title: promptTitle,
      is_admin_prompt: isAdminPrompt,
    });
  } catch (error) {
    console.error("Error tracking prompt click:", error);
  }
};
