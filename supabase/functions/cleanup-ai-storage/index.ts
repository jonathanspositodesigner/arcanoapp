import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const AI_FOLDERS = [
  "upscaler",
  "arcano-cloner",
  "pose-changer",
  "veste-ai",
  "character-generator",
  "flyer-maker",
  "video-upscaler",
  "image-generator",
  "video-generator",
];

const BUCKET = "artes-cloudinary";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[cleanup-ai-storage] Starting cleanup...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = Date.now();
    const report: Record<string, number> = {};
    let totalDeleted = 0;

    for (const folder of AI_FOLDERS) {
      let folderDeleted = 0;

      // List user_id subdirectories inside this AI folder
      const { data: userDirs, error: listError } = await supabase.storage
        .from(BUCKET)
        .list(folder, { limit: 1000 });

      if (listError) {
        console.error(`[cleanup-ai-storage] Error listing ${folder}:`, listError.message);
        report[folder] = 0;
        continue;
      }

      if (!userDirs || userDirs.length === 0) {
        report[folder] = 0;
        continue;
      }

      for (const item of userDirs) {
        // item.id is null for folders, non-null for files
        if (item.id) {
          // It's a file directly in the folder root
          const createdAt = new Date(item.created_at).getTime();
          if (now - createdAt > MAX_AGE_MS) {
            const filePath = `${folder}/${item.name}`;
            const { error: delError } = await supabase.storage
              .from(BUCKET)
              .remove([filePath]);
            if (!delError) folderDeleted++;
          }
          continue;
        }

        // It's a subdirectory (user_id) — list files inside
        const userPath = `${folder}/${item.name}`;
        const { data: files, error: filesError } = await supabase.storage
          .from(BUCKET)
          .list(userPath, { limit: 1000 });

        if (filesError || !files || files.length === 0) continue;

        const toDelete: string[] = [];
        for (const file of files) {
          if (!file.id) continue; // skip sub-subdirectories
          const createdAt = new Date(file.created_at).getTime();
          if (now - createdAt > MAX_AGE_MS) {
            toDelete.push(`${userPath}/${file.name}`);
          }
        }

        if (toDelete.length > 0) {
          // Delete in batches of 100
          for (let i = 0; i < toDelete.length; i += 100) {
            const batch = toDelete.slice(i, i + 100);
            const { error: delError } = await supabase.storage
              .from(BUCKET)
              .remove(batch);
            if (delError) {
              console.error(`[cleanup-ai-storage] Error deleting batch in ${userPath}:`, delError.message);
            } else {
              folderDeleted += batch.length;
            }
          }
        }
      }

      report[folder] = folderDeleted;
      totalDeleted += folderDeleted;
    }

    console.log(`[cleanup-ai-storage] Done. Total deleted: ${totalDeleted}`, JSON.stringify(report));

    return new Response(
      JSON.stringify({ success: true, total_deleted: totalDeleted, report }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[cleanup-ai-storage] Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
