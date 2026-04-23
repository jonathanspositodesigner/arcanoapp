import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BADGE_INFO: Record<string, { name: string; icon: string }> = {
  first_prompt: { name: "Primeira Contribuição", icon: "⭐" },
  on_fire: { name: "Em Chamas", icon: "🔥" },
  diamond: { name: "Diamante", icon: "💎" },
  viral: { name: "Viral", icon: "⚡" },
  top3: { name: "Pódio", icon: "🏆" },
  millionaire: { name: "R$50 Ganhos", icon: "💰" },
  legendary: { name: "Lendário", icon: "👑" },
  ai_master: { name: "Mestre das IAs", icon: "🤖" },
  seedance_star: { name: "Estrela Seedance", icon: "🎬" },
};

/**
 * Hook that listens for realtime gamification events (badges, challenges, XP)
 * and shows toast notifications. Only activates for the given partnerId.
 */
export function usePartnerGamificationNotifications(partnerId: string | null) {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!partnerId || subscribedRef.current) return;
    subscribedRef.current = true;

    const channel = supabase
      .channel(`gamification-${partnerId}`)
      // New badge earned
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "partner_badges",
          filter: `partner_id=eq.${partnerId}`,
        },
        (payload) => {
          const slug = payload.new?.badge_slug as string;
          const info = BADGE_INFO[slug] || { name: slug, icon: "🏅" };
          toast.success(`${info.icon} Badge conquistado: ${info.name}!`, {
            description: "Parabéns! Confira suas conquistas.",
            duration: 6000,
          });
        }
      )
      // Challenge completed
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "partner_challenge_progress",
          filter: `partner_id=eq.${partnerId}`,
        },
        (payload) => {
          if (payload.new?.completed && !payload.old?.completed) {
            toast.success("🎯 Desafio semanal concluído!", {
              description: "Você completou um desafio e ganhou XP!",
              duration: 6000,
            });
          }
        }
      )
      // XP gained (only show for notable amounts)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "partner_xp_log",
          filter: `partner_id=eq.${partnerId}`,
        },
        (payload) => {
          const xp = payload.new?.xp_amount as number;
          const reason = payload.new?.reason as string;
          // Only notify for notable XP gains (>=20)
          if (xp >= 20) {
            const reasonMap: Record<string, string> = {
              prompt_aprovado: "Prompt aprovado",
              bonus_10_desbloqueios_dia: "10 prompts copiados no dia!",
              prompt_50_desbloqueios: "50 cópias em um prompt!",
              prompt_100_desbloqueios: "100 cópias em um prompt!",
               streak_3_dias: "3 dias seguidos enviando prompts",
               streak_7_dias: "7 dias seguidos enviando prompts",
               streak_14_dias: "14 dias seguidos enviando prompts",
               streak_30_dias: "30 dias seguidos enviando prompts!",
              uso_ferramenta_seedance_jobs: "Prompt usado no Seedance 2",
            };
            const label = reasonMap[reason] || reason;
            toast(`⚡ +${xp} XP`, {
              description: label,
              duration: 4000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [partnerId]);
}