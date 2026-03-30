import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    // Dynamically fetch storage folders from registry
    const { data: registryData, error: registryError } = await supabase
      .from("ai_tool_registry")
      .select("storage_folder")
      .eq("enabled", true)
      .not("storage_folder", "is", null);

    if (registryError) {
      console.error("[cleanup-ai-storage] Error fetching registry:", registryError.message);
      return new Response(JSON.stringify({ error: registryError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const folders = (registryData || []).map((r: any) => r.storage_folder as string).filter(Boolean);
    console.log("[cleanup-ai-storage] Folders to clean:", folders);

    const now = Date.now();
    const report: Record<string, number> = {};
    let totalDeleted = 0;

    for (const folder of folders) {
      let folderDeleted = 0;

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
        if (item.id) {
          // File directly in folder root
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

        // Subdirectory (user_id) — list files inside
        const userPath = `${folder}/${item.name}`;
        const { data: files, error: filesError } = await supabase.storage
          .from(BUCKET)
          .list(userPath, { limit: 1000 });

        if (filesError || !files || files.length === 0) continue;

        const toDelete: string[] = [];
        for (const file of files) {
          if (!file.id) continue;
          const createdAt = new Date(file.created_at).getTime();
          if (now - createdAt > MAX_AGE_MS) {
            toDelete.push(`${userPath}/${file.name}`);
          }
        }

        if (toDelete.length > 0) {
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

    // Also run DB cleanup
    const { data: dbReport, error: dbError } = await supabase.rpc("cleanup_expired_ai_jobs");
    if (dbError) {
      console.error("[cleanup-ai-storage] DB cleanup error:", dbError.message);
    }

    console.log(`[cleanup-ai-storage] Done. Storage deleted: ${totalDeleted}`, JSON.stringify(report));
    console.log(`[cleanup-ai-storage] DB cleanup:`, JSON.stringify(dbReport));

    return new Response(
      JSON.stringify({ success: true, storage_deleted: totalDeleted, storage_report: report, db_report: dbReport }),
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
