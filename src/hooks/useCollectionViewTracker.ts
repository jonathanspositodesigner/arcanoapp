import { supabase } from "@/integrations/supabase/client";

export const trackCollectionView = async (
  collectionId: string,
  collectionSlug: string,
  collectionName: string
) => {
  try {
    const deviceType = /mobile|android|iphone|ipad|tablet/i.test(navigator.userAgent)
      ? "mobile"
      : "desktop";

    await supabase.from("collection_views").insert({
      collection_id: collectionId,
      collection_slug: collectionSlug,
      collection_name: collectionName,
      device_type: deviceType,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error("Error tracking collection view:", error);
  }
};
