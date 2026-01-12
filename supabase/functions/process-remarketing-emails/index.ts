import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SendPulse token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSendPulseToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const clientId = Deno.env.get("SENDPULSE_CLIENT_ID");
  const clientSecret = Deno.env.get("SENDPULSE_CLIENT_SECRET");

  const response = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

function getUnsubscribeLink(email: string): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  return `${supabaseUrl}/functions/v1/email-unsubscribe?email=${encodeURIComponent(email)}`;
}

function addUnsubscribeFooter(html: string, email: string): string {
  const unsubscribeLink = getUnsubscribeLink(email);
  const footer = `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
      <p>Se você não deseja mais receber nossos emails, <a href="${unsubscribeLink}" style="color: #999;">clique aqui para se descadastrar</a>.</p>
    </div>
  `;
  
  if (html.includes("</body>")) {
    return html.replace("</body>", `${footer}</body>`);
  }
  return html + footer;
}

interface AbandonedCheckout {
  id: string;
  email: string;
  name: string | null;
  product_name: string | null;
  checkout_link: string | null;
  product_id: number | null;
  offer_hash: string | null;
  abandoned_at: string;
  platform: string | null;
  auto_remarketing_attempts: number;
}

interface EmailTemplate {
  id: string;
  subject: string;
  content: string;
  sender_name: string;
  sender_email: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results = {
    processed: 0,
    sent: 0,
    skipped_blacklist: 0,
    skipped_converted: 0,
    skipped_no_email: 0,
    skipped_max_attempts: 0,
    errors: 0,
    details: [] as string[],
  };

  try {
    // Get pending abandoned checkouts older than 15 minutes that haven't received remarketing email
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data: checkouts, error: checkoutsError } = await supabase
      .from("abandoned_checkouts")
      .select("*")
      .eq("remarketing_status", "pending")
      .is("remarketing_email_sent_at", null)
      .lt("auto_remarketing_attempts", 10)
      .lt("abandoned_at", fifteenMinutesAgo)
      .limit(50);

    // Also update any checkouts that have reached max attempts but are still pending
    await supabase
      .from("abandoned_checkouts")
      .update({ remarketing_status: "max_attempts_reached" })
      .eq("remarketing_status", "pending")
      .gte("auto_remarketing_attempts", 10);

    if (checkoutsError) {
      throw new Error(`Error fetching checkouts: ${checkoutsError.message}`);
    }

    if (!checkouts || checkouts.length === 0) {
      console.log("No pending remarketing emails to process");
      return new Response(
        JSON.stringify({ message: "No pending remarketing emails", results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${checkouts.length} abandoned checkouts for remarketing`);

    // Get the remarketing email template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("name", "REMARKETING")
      .single();

    if (templateError || !template) {
      throw new Error(`Remarketing template not found: ${templateError?.message}`);
    }

    // Get SendPulse token
    const sendPulseToken = await getSendPulseToken();

    for (const checkout of checkouts as AbandonedCheckout[]) {
      results.processed++;

      try {
        // Skip if no email
        if (!checkout.email) {
          results.skipped_no_email++;
          results.details.push(`${checkout.id}: No email`);
          continue;
        }

        // Check blacklist
        const { data: blacklisted } = await supabase
          .from("blacklisted_emails")
          .select("id")
          .eq("email", checkout.email.toLowerCase())
          .maybeSingle();

        if (blacklisted) {
          results.skipped_blacklist++;
          results.details.push(`${checkout.id}: Blacklisted - ${checkout.email}`);
          await supabase
            .from("abandoned_checkouts")
            .update({ remarketing_status: "blacklisted" })
            .eq("id", checkout.id);
          continue;
        }

        // Check if user already completed purchase
        // Check premium_artes_users (for artes platform)
        const { data: premiumArtes } = await supabase
          .from("premium_artes_users")
          .select("id")
          .eq("user_id", checkout.email.toLowerCase())
          .eq("is_active", true)
          .maybeSingle();

        if (premiumArtes) {
          results.skipped_converted++;
          results.details.push(`${checkout.id}: Already premium (artes) - ${checkout.email}`);
          await supabase
            .from("abandoned_checkouts")
            .update({ remarketing_status: "converted" })
            .eq("id", checkout.id);
          continue;
        }

        // Check user_pack_purchases
        const { data: packPurchase } = await supabase
          .from("user_pack_purchases")
          .select("id")
          .eq("user_id", checkout.email.toLowerCase())
          .eq("is_active", true)
          .maybeSingle();

        if (packPurchase) {
          results.skipped_converted++;
          results.details.push(`${checkout.id}: Already has pack - ${checkout.email}`);
          await supabase
            .from("abandoned_checkouts")
            .update({ remarketing_status: "converted" })
            .eq("id", checkout.id);
          continue;
        }

        // Prepare email content
        const customerName = checkout.name || "cliente";
        const productName = checkout.product_name || "seu produto";
        
        // Build checkout link
        let checkoutLink = checkout.checkout_link;
        if (!checkoutLink && checkout.product_id) {
          checkoutLink = `https://pay.greenn.com.br/${checkout.product_id}`;
          if (checkout.offer_hash) {
            checkoutLink += `?offer=${checkout.offer_hash}`;
          }
        }
        checkoutLink = checkoutLink || "https://artes.arcanolab.com.br/planos";

        // Replace placeholders in template
        let emailContent = template.content
          .replace(/\{\{nome\}\}/gi, customerName)
          .replace(/\{\{produto\}\}/gi, productName)
          .replace(/\{\{link\}\}/gi, checkoutLink);

        let emailSubject = template.subject
          .replace(/\{\{nome\}\}/gi, customerName)
          .replace(/\{\{produto\}\}/gi, productName);

        // Add unsubscribe footer
        emailContent = addUnsubscribeFooter(emailContent, checkout.email);

        // Send email via SendPulse
        const emailPayload = {
          email: {
            subject: emailSubject,
            from: {
              name: template.sender_name || "Artes Arcano",
              email: template.sender_email || "contato@arcanolab.com.br",
            },
            to: [{ email: checkout.email, name: customerName }],
            html: emailContent,
          },
        };

        const sendResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sendPulseToken}`,
          },
          body: JSON.stringify(emailPayload),
        });

        const sendResult = await sendResponse.json();

        if (sendResponse.ok && sendResult.result) {
          results.sent++;
          results.details.push(`${checkout.id}: Email sent to ${checkout.email}`);

          // Update checkout record
          await supabase
            .from("abandoned_checkouts")
            .update({
              remarketing_status: "auto_remarketing_sent",
              remarketing_email_sent_at: new Date().toISOString(),
              auto_remarketing_attempts: (checkout.auto_remarketing_attempts || 0) + 1,
            })
            .eq("id", checkout.id);

          console.log(`Remarketing email sent to ${checkout.email} for checkout ${checkout.id}`);
        } else {
          throw new Error(`SendPulse error: ${JSON.stringify(sendResult)}`);
        }

      } catch (itemError: any) {
        results.errors++;
        const newAttempts = (checkout.auto_remarketing_attempts || 0) + 1;
        
        // If reached 10 attempts, mark as max_attempts_reached
        if (newAttempts >= 10) {
          results.skipped_max_attempts++;
          results.details.push(`${checkout.id}: Max attempts reached (10) - ${checkout.email}`);
          await supabase
            .from("abandoned_checkouts")
            .update({
              auto_remarketing_attempts: newAttempts,
              remarketing_status: "max_attempts_reached",
            })
            .eq("id", checkout.id);
        } else {
          results.details.push(`${checkout.id}: Error (attempt ${newAttempts}/10) - ${itemError.message}`);
          await supabase
            .from("abandoned_checkouts")
            .update({
              auto_remarketing_attempts: newAttempts,
            })
            .eq("id", checkout.id);
        }
        
        console.error(`Error processing checkout ${checkout.id} (attempt ${newAttempts}/10):`, itemError);
      }
    }

    console.log("Remarketing processing complete:", results);

    return new Response(
      JSON.stringify({ message: "Remarketing processing complete", results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in process-remarketing-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message, results }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
