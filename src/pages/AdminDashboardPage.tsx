import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { LogOut, Check, X, DollarSign, Clock, CheckCircle, Users, AlertTriangle, UserCog } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminDashboardPage = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pendingMentors, setPendingMentors] = useState<any[]>([]);
  const [approvedMentors, setApprovedMentors] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
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
    const [mentorsRes, approvedRes, bookingsRes, txRes] = await Promise.all([
      supabaseUntyped
        .from("mentor_profiles")
        .select("*, profiles!mentor_profiles_user_id_fkey(name, email, phone, avatar_url)")
        .eq("is_approved", false),
      supabaseUntyped
        .from("mentor_profiles")
        .select("*, profiles!mentor_profiles_user_id_fkey(name, email, phone, avatar_url)")
        .eq("is_approved", true),
      supabaseUntyped
        .from("bookings")
        .select("*, slots(*), mentor:profiles!bookings_mentor_id_fkey(name, email, phone), mentee:profiles!bookings_mentee_id_fkey(name, email, phone)")
        .order("created_at", { ascending: false }),
      supabaseUntyped
        .from("transactions")
        .select("*, bookings(*, mentor:profiles!bookings_mentor_id_fkey(name), mentee:profiles!bookings_mentee_id_fkey(name))")
        .order("created_at", { ascending: false }),
    ]);

    if (mentorsRes.data) setPendingMentors(mentorsRes.data);
    if (approvedRes.data) setApprovedMentors(approvedRes.data);
    if (bookingsRes.data) setAllBookings(bookingsRes.data);
    if (txRes.data) setTransactions(txRes.data);
  };

  const approveMentor = async (userId: string) => {
    const { error } = await supabaseUntyped
      .from("mentor_profiles")
      .update({ is_approved: true })
      .eq("user_id", userId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      const approved = pendingMentors.find(m => m.user_id === userId);
      setPendingMentors(prev => prev.filter(m => m.user_id !== userId));
      if (approved) setApprovedMentors(prev => [...prev, { ...approved, is_approved: true }]);
      toast({ title: "Mentor approved!" });
    }
  };

  const disableMentor = async (userId: string) => {
    const { error } = await supabaseUntyped
      .from("mentor_profiles")
      .update({ is_approved: false })
      .eq("user_id", userId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      const disabled = approvedMentors.find(m => m.user_id === userId);
      setApprovedMentors(prev => prev.filter(m => m.user_id !== userId));
      if (disabled) setPendingMentors(prev => [...prev, { ...disabled, is_approved: false }]);
      toast({ title: "Mentor profile disabled" });
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

  const pendingSessions = allBookings.filter(b => b.status === "pending_payment" || b.status === "confirmed");
  const completedSessions = allBookings.filter(b => b.status === "completed");
  const totalTransactionAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  const statusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "default";
      case "completed": return "secondary";
      case "pending_payment": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto border-b border-border">
        <Link to="/" className="font-display text-lg sm:text-xl font-bold text-foreground">UPSC Connect</Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Badge>Admin</Badge>
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/profile")} title="Admin Profile"><UserCog className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate("/"); }}><LogOut className="h-4 w-4" /></Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-6 flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2"><CheckCircle className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Sessions</p>
                <p className="text-3xl font-display font-bold text-foreground">{completedSessions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-start gap-3">
              <div className="rounded-lg bg-accent/10 p-2"><Clock className="h-5 w-5 text-accent" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Sessions</p>
                <p className="text-3xl font-display font-bold text-foreground">{pendingSessions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-start gap-3">
              <div className="rounded-lg bg-green-500/10 p-2"><DollarSign className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-3xl font-display font-bold text-foreground">₹{totalTransactionAmount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{transactions.length} payments</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2"><Users className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Active Mentors</p>
                <p className="text-3xl font-display font-bold text-foreground">{approvedMentors.length}</p>
                {pendingMentors.length > 0 && (
                  <p className="text-xs text-accent">{pendingMentors.length} pending approval</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="sessions" className="text-xs sm:text-sm">All Sessions</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">
              Pending
              {pendingSessions.length > 0 && <span className="ml-1 rounded-full bg-accent/20 text-accent px-1.5 py-0.5 text-xs">{pendingSessions.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs sm:text-sm">Transactions</TabsTrigger>
            <TabsTrigger value="mentors" className="text-xs sm:text-sm">
              Mentors
              {pendingMentors.length > 0 && <span className="ml-1 rounded-full bg-accent/20 text-accent px-1.5 py-0.5 text-xs">{pendingMentors.length}</span>}
            </TabsTrigger>
          </TabsList>

          {/* All Sessions Tab */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader><CardTitle className="font-display">Session Details</CardTitle></CardHeader>
              <CardContent>
                {allBookings.length === 0 ? (
                  <p className="text-muted-foreground">No sessions yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                         <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="pb-3 pr-4">Mentor</th>
                          <th className="pb-3 pr-4">Mentee</th>
                          <th className="pb-3 pr-4">Date & Time</th>
                          <th className="pb-3 pr-4">Booking Time</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 pr-4">Payment</th>
                          <th className="pb-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allBookings.map((b: any) => {
                          const tx = transactions.find(t => t.booking_id === b.id);
                          return (
                            <tr key={b.id} className="border-b border-border/50">
                              <td className="py-3 pr-4">
                                <p className="font-medium text-foreground">{b.mentor?.name || "—"}</p>
                                <p className="text-xs text-muted-foreground">{b.mentor?.email}</p>
                              </td>
                              <td className="py-3 pr-4">
                                <p className="font-medium text-foreground">{b.mentee?.name || "—"}</p>
                                <p className="text-xs text-muted-foreground">{b.mentee?.email}</p>
                              </td>
                              <td className="py-3 pr-4">
                                {b.slots ? (
                                  <>
                                    <p className="text-foreground">{format(new Date(b.slots.date), "MMM d, yyyy")}</p>
                                    <p className="text-xs text-muted-foreground">{b.slots.start_time?.slice(0, 5)} – {b.slots.end_time?.slice(0, 5)}</p>
                                  </>
                                ) : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="py-3 pr-4 text-foreground text-xs">
                                {b.created_at ? format(new Date(b.created_at), "MMM d, yyyy HH:mm") : "—"}
                              </td>
                              <td className="py-3 pr-4">
                                <Badge variant={statusColor(b.status)}>{b.status}</Badge>
                              </td>
                              <td className="py-3 pr-4">
                                {tx ? (
                                  <div>
                                    <p className="text-foreground font-medium">₹{tx.amount}</p>
                                    {tx.razorpay_payment_id && (
                                      <p className="text-xs text-muted-foreground font-mono">{tx.razorpay_payment_id}</p>
                                    )}
                                    <Badge variant={tx.status === "paid" ? "default" : "outline"} className="mt-1 text-xs">{tx.status}</Badge>
                                  </div>
                                ) : <span className="text-muted-foreground text-xs">No payment</span>}
                              </td>
                              <td className="py-3">
                                {b.status === "confirmed" && (
                                  <Button size="sm" variant="outline" onClick={() => markCompleted(b.id)}>
                                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Sessions Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-accent" /> Pending Sessions</CardTitle></CardHeader>
              <CardContent>
                {pendingSessions.length === 0 ? (
                  <p className="text-muted-foreground">No pending sessions.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingSessions.map((b: any) => (
                      <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border p-4 gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-foreground">{b.mentor?.name}</p>
                            <span className="text-muted-foreground">→</span>
                            <p className="font-medium text-foreground">{b.mentee?.name}</p>
                          </div>
                          {b.slots && (
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(b.slots.date), "MMM d, yyyy")} · {b.slots.start_time?.slice(0, 5)} – {b.slots.end_time?.slice(0, 5)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">Mentor: {b.mentor?.phone || b.mentor?.email}</p>
                            <span className="text-muted-foreground">·</span>
                            <p className="text-xs text-muted-foreground">Mentee: {b.mentee?.phone || b.mentee?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusColor(b.status)}>{b.status}</Badge>
                          {b.status === "confirmed" && (
                            <Button size="sm" onClick={() => markCompleted(b.id)}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center justify-between">
                  <span>All Transactions</span>
                  <span className="text-lg text-primary">Total: ₹{totalTransactionAmount.toLocaleString()}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-muted-foreground">No transactions yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="pb-3 pr-4">Date</th>
                          <th className="pb-3 pr-4">Mentor → Mentee</th>
                          <th className="pb-3 pr-4">Amount</th>
                          <th className="pb-3 pr-4">Payment ID</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx: any) => (
                          <tr key={tx.id} className="border-b border-border/50">
                            <td className="py-3 pr-4 text-foreground">
                              {tx.created_at ? format(new Date(tx.created_at), "MMM d, yyyy HH:mm") : "—"}
                            </td>
                            <td className="py-3 pr-4 text-foreground">
                              {tx.bookings?.mentor?.name || "—"} → {tx.bookings?.mentee?.name || "—"}
                            </td>
                            <td className="py-3 pr-4 font-medium text-foreground">₹{tx.amount}</td>
                            <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                              {tx.razorpay_payment_id || "—"}
                            </td>
                            <td className="py-3">
                              <Badge variant={tx.status === "paid" ? "default" : "outline"}>{tx.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mentor Management Tab */}
          <TabsContent value="mentors" className="space-y-6">
            {/* Pending Approvals */}
            <Card>
              <CardHeader><CardTitle className="font-display">Pending Mentor Approvals</CardTitle></CardHeader>
              <CardContent>
                {pendingMentors.length === 0 ? (
                  <p className="text-muted-foreground">No pending approvals.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingMentors.map((m: any) => (
                      <div key={m.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-accent/30 bg-accent/5 p-4 gap-3">
                        <div>
                          <p className="font-medium text-foreground">{m.profiles?.name}</p>
                          <p className="text-sm text-muted-foreground">{m.profiles?.email}</p>
                          {m.profiles?.phone && <p className="text-sm text-muted-foreground">{m.profiles.phone}</p>}
                          {m.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.bio}</p>}
                          {m.subjects?.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {m.subjects.map((s: string) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                            </div>
                          )}
                        </div>
                        <Button size="sm" onClick={() => approveMentor(m.user_id)}>
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Mentors */}
            <Card>
              <CardHeader><CardTitle className="font-display">Active Mentors</CardTitle></CardHeader>
              <CardContent>
                {approvedMentors.length === 0 ? (
                  <p className="text-muted-foreground">No active mentors.</p>
                ) : (
                  <div className="space-y-3">
                    {approvedMentors.map((m: any) => (
                      <div key={m.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border p-4 gap-3">
                        <div>
                          <p className="font-medium text-foreground">{m.profiles?.name}</p>
                          <p className="text-sm text-muted-foreground">{m.profiles?.email}</p>
                          {m.subjects?.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {m.subjects.map((s: string) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">₹{m.price_per_session}/session</p>
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => disableMentor(m.user_id)}>
                          <X className="h-4 w-4 mr-1" /> Disable
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
