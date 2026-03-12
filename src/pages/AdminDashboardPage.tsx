import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { LogOut, Check } from "lucide-react";

const AdminDashboardPage = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pendingMentors, setPendingMentors] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      const { data } = await supabaseUntyped
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");
      if (data && data.length > 0) {
        setIsAdmin(true);
        await fetchAdminData();
      } else {
        navigate("/dashboard");
      }
      setLoading(false);
    };
    checkAdmin();
  }, [user]);

  const fetchAdminData = async () => {
    const { data: mentors } = await supabaseUntyped
      .from("mentor_profiles")
      .select("*, profiles!mentor_profiles_user_id_fkey(name, email)")
      .eq("is_approved", false);
    if (mentors) setPendingMentors(mentors);

    const { data: bk } = await supabaseUntyped
      .from("bookings")
      .select("*, slots(*), mentor:profiles!bookings_mentor_id_fkey(name), mentee:profiles!bookings_mentee_id_fkey(name)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (bk) setAllBookings(bk);
  };

  const approveMentor = async (userId: string) => {
    const { error } = await supabaseUntyped
      .from("mentor_profiles")
      .update({ is_approved: true })
      .eq("user_id", userId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      setPendingMentors(prev => prev.filter(m => m.user_id !== userId));
      toast({ title: "Mentor approved!" });
    }
  };

  const markCompleted = async (bookingId: string) => {
    const { error } = await supabaseUntyped
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", bookingId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "completed" } : b));
      toast({ title: "Session marked as completed" });
    }
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!isAdmin) return null;

  const confirmed = allBookings.filter(b => b.status === "confirmed").length;
  const completed = allBookings.filter(b => b.status === "completed").length;

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto border-b border-border">
        <Link to="/" className="font-display text-xl font-bold text-foreground">UPSC Connect</Link>
        <div className="flex items-center gap-3">
          <Badge>Admin</Badge>
          <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate("/"); }}><LogOut className="h-4 w-4" /></Button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Sessions</p><p className="text-3xl font-display font-bold text-foreground">{allBookings.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Confirmed</p><p className="text-3xl font-display font-bold text-primary">{confirmed}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Completed</p><p className="text-3xl font-display font-bold text-accent">{completed}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display">Pending Mentor Approvals</CardTitle></CardHeader>
          <CardContent>
            {pendingMentors.length === 0 ? (
              <p className="text-muted-foreground">No pending approvals.</p>
            ) : (
              <div className="space-y-3">
                {pendingMentors.map((m: any) => (
                  <div key={m.user_id} className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">{m.profiles?.name}</p>
                      <p className="text-sm text-muted-foreground">{m.profiles?.email}</p>
                    </div>
                    <Button size="sm" onClick={() => approveMentor(m.user_id)}><Check className="h-4 w-4 mr-1" /> Approve</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">All Sessions</CardTitle></CardHeader>
          <CardContent>
            {allBookings.length === 0 ? (
              <p className="text-muted-foreground">No sessions yet.</p>
            ) : (
              <div className="space-y-3">
                {allBookings.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">{b.mentor?.name} → {b.mentee?.name}</p>
                      {b.slots && <p className="text-sm text-muted-foreground">{format(new Date(b.slots.date), "MMM d, yyyy")} · {b.slots.start_time?.slice(0, 5)} – {b.slots.end_time?.slice(0, 5)}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>{b.status}</Badge>
                      {b.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => markCompleted(b.id)}>Mark Complete</Button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
