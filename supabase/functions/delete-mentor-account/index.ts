import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Check user is a mentor
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await adminClient.from("profiles").select("role, name, email").eq("id", user.id).single();
    if (!profile || profile.role !== "mentor") throw new Error("Only mentors can delete their account");

    // Cancel future bookings
    const { data: futureBookings } = await adminClient
      .from("bookings")
      .select("id, slots(date)")
      .eq("mentor_id", user.id)
      .in("status", ["confirmed", "pending_payment"]);

    if (futureBookings && futureBookings.length > 0) {
      const bookingIds = futureBookings.map((b: any) => b.id);
      await adminClient.from("bookings").update({ status: "cancelled" }).in("id", bookingIds);
    }

    // Delete mentor_profiles, slots, user_roles, profiles
    await adminClient.from("slots").delete().eq("mentor_id", user.id);
    await adminClient.from("mentor_profiles").delete().eq("user_id", user.id);
    await adminClient.from("user_roles").delete().eq("user_id", user.id);
    await adminClient.from("profiles").delete().eq("id", user.id);

    // Delete auth user
    await adminClient.auth.admin.deleteUser(user.id);

    // Log for admin notification
    console.log(`[ADMIN NOTIFY] Mentor account deleted: ${profile.name} (${profile.email}), ID: ${user.id}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
