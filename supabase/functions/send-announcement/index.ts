import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnnouncementRequest {
  push_title: string;
  push_body: string;
  push_url?: string;
  email_subject: string;
  email_content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { push_title, push_body, push_url, email_subject, email_content }: AnnouncementRequest = await req.json();

    console.log("Starting announcement send:", { push_title, email_subject });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let pushSent = 0;
    let pushFailed = 0;
    let emailSent = 0;
    let emailFailed = 0;

    // Send push notifications to all subscribers
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subscriptions && subscriptions.length > 0) {
      console.log(`Found ${subscriptions.length} push subscriptions`);
      
      // Call send-push-notification function
      const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          title: push_title,
          body: push_body,
          url: push_url || "/biblioteca-artes",
        }),
      });

      if (pushResponse.ok) {
        const pushResult = await pushResponse.json();
        pushSent = pushResult.sent || 0;
        pushFailed = pushResult.failed || 0;
        console.log(`Push notifications sent: ${pushSent}, failed: ${pushFailed}`);
      } else {
        console.error("Push notification error:", await pushResponse.text());
      }
    }

    // Send emails to all artes clients
    if (resendApiKey) {
      // Fetch all users with pack purchases (artes clients)
      const allEmails: string[] = [];
      let page = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: purchases } = await supabase
          .from("user_pack_purchases")
          .select("user_id")
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (!purchases || purchases.length === 0) break;
        
        const userIds = [...new Set(purchases.map(p => p.user_id))];
        
        // Get emails from profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", userIds)
          .not("email", "is", null);
        
        if (profiles) {
          allEmails.push(...profiles.map(p => p.email!).filter(Boolean));
        }
        
        if (purchases.length < pageSize) break;
        page++;
      }

      const uniqueEmails = [...new Set(allEmails)];
      console.log(`Found ${uniqueEmails.length} unique email addresses`);

      // Send emails in batches using Resend API directly
      for (const email of uniqueEmails) {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "ArcanoApp <contato@voxvisual.com.br>",
              to: [email],
              subject: email_subject,
              html: email_content,
            }),
          });

          if (response.ok) {
            emailSent++;
          } else {
            console.error(`Failed to send email to ${email}:`, await response.text());
            emailFailed++;
          }
          
          // Rate limit: 2 requests per second
          await new Promise(resolve => setTimeout(resolve, 600));
        } catch (error) {
          console.error(`Failed to send email to ${email}:`, error);
          emailFailed++;
        }
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email send");
    }

    console.log(`Announcement complete. Push: ${pushSent} sent, ${pushFailed} failed. Email: ${emailSent} sent, ${emailFailed} failed.`);

    return new Response(
      JSON.stringify({
        success: true,
        push: { sent: pushSent, failed: pushFailed },
        email: { sent: emailSent, failed: emailFailed },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-announcement:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
