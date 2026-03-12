import { supabase } from "@/integrations/supabase/client";

// The auto-generated types don't reflect our tables yet.
// This helper provides typed access using the untyped client.
export const db = {
  profiles: () => supabase.from("profiles" as any),
  mentor_profiles: () => supabase.from("mentor_profiles" as any),
  user_roles: () => supabase.from("user_roles" as any),
  slots: () => supabase.from("slots" as any),
  bookings: () => supabase.from("bookings" as any),
  transactions: () => supabase.from("transactions" as any),
};
