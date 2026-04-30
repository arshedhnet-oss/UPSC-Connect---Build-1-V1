// Returns a short-lived signed URL for an invoice PDF after validating the caller.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { invoice_id, booking_id } = await req.json();
    const admin = createClient(supabaseUrl, serviceKey);

    let query = admin.from("invoices").select("id, mentee_id, mentor_id, pdf_path, invoice_number");
    if (invoice_id) query = query.eq("id", invoice_id);
    else if (booking_id) query = query.eq("booking_id", booking_id);
    else return new Response(JSON.stringify({ error: "invoice_id or booking_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { data: invoice } = await query.maybeSingle();
    if (!invoice || !invoice.pdf_path) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (invoice.mentee_id !== user.id && invoice.mentor_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error } = await admin.storage
      .from("invoices")
      .createSignedUrl(invoice.pdf_path, 300, { download: `${invoice.invoice_number}.pdf` });
    if (error || !signed) {
      return new Response(JSON.stringify({ error: "Could not sign URL" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: signed.signedUrl, invoice_number: invoice.invoice_number }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
