import { supabase } from '@/integrations/supabase/client';

/**
 * Translates a cinema prompt to Chinese for better Seedance model efficiency.
 * Falls back to the original prompt if translation fails.
 */
export async function translatePromptToChinese(prompt: string): Promise<string> {
  if (!prompt || prompt.trim().length === 0) return prompt;

  try {
    const { data, error } = await supabase.functions.invoke('translate-prompt-chinese', {
      body: { prompt },
    });

    if (error || !data?.translatedPrompt) {
      console.warn('[translateToChinese] Fallback to original:', error?.message);
      return prompt;
    }

    return data.translatedPrompt;
  } catch (err) {
    console.warn('[translateToChinese] Fallback to original:', err);
    return prompt;
  }
}
