import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AUTO_RESPONSE_MESSAGE = `Hi! I'd love to understand where you are in your UPSC journey so I can guide you better.

Could you share:
• Number of attempts so far
• The year you're preparing for

This will help me give you more relevant guidance.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { conversation_id, mentor_id, mentee_id } = await req.json();

    if (!conversation_id || !mentor_id || !mentee_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if auto response already sent
    const { data: conv } = await supabase
      .from("conversations")
      .select("auto_response_sent")
      .eq("id", conversation_id)
      .single();

    if (conv?.auto_response_sent) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "already_sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if mentor has already replied
    const { data: mentorMessages } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversation_id)
      .eq("sender_id", mentor_id)
      .limit(1);

    if (mentorMessages && mentorMessages.length > 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "mentor_replied" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send auto-response message as the mentor
    const { error: insertErr } = await supabase.from("messages").insert({
      conversation_id,
      sender_id: mentor_id,
      receiver_id: mentee_id,
      message_text: AUTO_RESPONSE_MESSAGE,
    });

    if (insertErr) {
      console.error("Failed to insert auto-response:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to send auto-response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark auto response as sent
    await supabase
      .from("conversations")
      .update({ auto_response_sent: true })
      .eq("id", conversation_id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Auto-response error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
