import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabaseUntyped } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { LogOut, Check, X, DollarSign, Clock, CheckCircle, Users, AlertTriangle, UserCog, Star, RotateCcw, Trash2, Search, Building2, Ban, ShieldAlert, Video, Copy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import StarRating from "@/components/StarRating";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminDashboardPage = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pendingMentors, setPendingMentors] = useState<any[]>([]);
  const [approvedMentors, setApprovedMentors] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [allOrgs, setAllOrgs] = useState<any[]>([]);
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewMentorFilter, setReviewMentorFilter] = useState("");
  const [reviewRatingFilter, setReviewRatingFilter] = useState("");
  const [reviewDateFilter, setReviewDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Secure deletion state
  const [deleteDialog, setDeleteDialog] = useState<{ type: string; id: string; name: string } | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deletePassword, setDeletePassword] = useState("");

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
    const [mentorsRes, approvedRes, bookingsRes, txRes, reviewsRes, orgsRes] = await Promise.all([
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
      supabaseUntyped
        .from("mentor_reviews")
        .select("*, mentor:profiles!mentor_reviews_mentor_id_fkey(name), mentee:profiles!mentor_reviews_mentee_id_fkey(name)")
        .order("created_at", { ascending: false }),
      supabaseUntyped
        .from("organisations")
        .select("*, profiles!organisations_created_by_fkey(name, email)")
        .order("created_at", { ascending: false }),
    ]);

    if (mentorsRes.data) setPendingMentors(mentorsRes.data);
    if (approvedRes.data) setApprovedMentors(approvedRes.data);
    if (bookingsRes.data) setAllBookings(bookingsRes.data);
    if (txRes.data) setTransactions(txRes.data);
    if (reviewsRes.data) setAllReviews(reviewsRes.data);
    if (orgsRes.data) setAllOrgs(orgsRes.data);
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

  const toggleFeatured = async (userId: string, featured: boolean) => {
    const { error } = await supabaseUntyped
      .from("mentor_profiles")
      .update({ is_featured: featured })
      .eq("user_id", userId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      setApprovedMentors(prev => prev.map(m => m.user_id === userId ? { ...m, is_featured: featured } : m));
      toast({ title: featured ? "Mentor featured" : "Mentor unfeatured" });
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

  const removeReview = async (reviewId: string) => {
    const { error } = await supabaseUntyped
      .from("mentor_reviews")
      .update({ status: "removed" })
      .eq("id", reviewId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      setAllReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: "removed" } : r));
      toast({ title: "Review removed" });
    }
  };

  const restoreReview = async (reviewId: string) => {
    const { error } = await supabaseUntyped
      .from("mentor_reviews")
      .update({ status: "active" })
      .eq("id", reviewId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      setAllReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: "active" } : r));
      toast({ title: "Review restored" });
    }
  };

  // Organisation management
  const approveOrg = async (orgId: string) => {
    const { error } = await supabaseUntyped.from("organisations").update({ is_approved: true }).eq("id", orgId);
    if (error) toast({ title: "Failed", variant: "destructive" });
    else { setAllOrgs(prev => prev.map(o => o.id === orgId ? { ...o, is_approved: true } : o)); toast({ title: "Organisation approved!" }); }
  };

  const suspendOrg = async (orgId: string) => {
    const org = allOrgs.find(o => o.id === orgId);
    const newSuspended = !org?.is_suspended;
    const { error } = await supabaseUntyped.from("organisations").update({ is_suspended: newSuspended }).eq("id", orgId);
    if (error) toast({ title: "Failed", variant: "destructive" });
    else { setAllOrgs(prev => prev.map(o => o.id === orgId ? { ...o, is_suspended: newSuspended } : o)); toast({ title: newSuspended ? "Organisation suspended" : "Organisation unsuspended" }); }
  };

  // Secure 2-step deletion
  const initiateDelete = (type: string, id: string, name: string) => {
    setDeleteDialog({ type, id, name });
    setDeleteStep(1);
    setDeletePassword("");
  };

  const confirmDelete = async () => {
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }
    // Step 2: Re-authenticate with password
    if (!deletePassword) { toast({ title: "Enter your password", variant: "destructive" }); return; }
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: deletePassword,
    });
    if (authError) { toast({ title: "Authentication failed", description: "Incorrect password", variant: "destructive" }); return; }

    if (!deleteDialog) return;
    try {
      if (deleteDialog.type === "organisation") {
        // Delete org mentors first, then org
        await supabaseUntyped.from("organisation_mentors").delete().eq("organisation_id", deleteDialog.id);
        const { error } = await supabaseUntyped.from("organisations").delete().eq("id", deleteDialog.id);
        if (error) throw error;
        setAllOrgs(prev => prev.filter(o => o.id !== deleteDialog.id));
      } else if (deleteDialog.type === "mentor") {
        // Use the existing delete edge function
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const session = (await supabaseUntyped.auth.getSession()).data.session;
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/delete-mentor-account`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ mentor_id: deleteDialog.id }),
        });
        if (!res.ok) throw new Error("Delete failed");
        setApprovedMentors(prev => prev.filter(m => m.user_id !== deleteDialog.id));
        setPendingMentors(prev => prev.filter(m => m.user_id !== deleteDialog.id));
      }
      toast({ title: `${deleteDialog.type === "organisation" ? "Organisation" : "Mentor"} permanently deleted` });
    } catch (err: any) {
      toast({ title: "Deletion failed", description: err.message, variant: "destructive" });
    }
    setDeleteDialog(null);
    setDeletePassword("");
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
            <TabsTrigger value="reviews" className="text-xs sm:text-sm">
              Reviews
              <span className="ml-1 rounded-full bg-primary/20 text-primary px-1.5 py-0.5 text-xs">{allReviews.length}</span>
            </TabsTrigger>
            <TabsTrigger value="organisations" className="text-xs sm:text-sm">
              <Building2 className="h-4 w-4 mr-1" /> Organisations
              {allOrgs.filter(o => !o.is_approved).length > 0 && <span className="ml-1 rounded-full bg-accent/20 text-accent px-1.5 py-0.5 text-xs">{allOrgs.filter(o => !o.is_approved).length}</span>}
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
                          <th className="pb-3 pr-4">Meeting</th>
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
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveMentor(m.user_id)}>
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => initiateDelete("mentor", m.user_id, m.profiles?.name || "Mentor")}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                          </Button>
                        </div>
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
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant={m.is_featured ? "default" : "outline"}
                            onClick={() => toggleFeatured(m.user_id, !m.is_featured)}
                          >
                            <Star className={`h-4 w-4 mr-1 ${m.is_featured ? "fill-current" : ""}`} />
                            {m.is_featured ? "Featured" : "Feature"}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => disableMentor(m.user_id)}>
                            <X className="h-4 w-4 mr-1" /> Disable
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => initiateDelete("mentor", m.user_id, m.profiles?.name || "Mentor")}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-400" /> Mentor Reviews
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by mentee name..."
                      value={reviewSearch}
                      onChange={(e) => setReviewSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter by mentor name..."
                      value={reviewMentorFilter}
                      onChange={(e) => setReviewMentorFilter(e.target.value)}
                      className="pl-9"
                    />
                   </div>
                   <select
                     value={reviewRatingFilter}
                     onChange={(e) => setReviewRatingFilter(e.target.value)}
                     className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                   >
                     <option value="">All Ratings</option>
                     <option value="5">5 Stars</option>
                     <option value="4">4 Stars</option>
                     <option value="3">3 Stars</option>
                     <option value="2">2 Stars</option>
                     <option value="1">1 Star</option>
                   </select>
                   <Input
                     type="date"
                     value={reviewDateFilter}
                     onChange={(e) => setReviewDateFilter(e.target.value)}
                     className="w-auto"
                   />
                 </div>
              </CardHeader>
              <CardContent>
                {allReviews.length === 0 ? (
                  <p className="text-muted-foreground">No reviews yet.</p>
                ) : (
                  <div className="space-y-3">
                    {allReviews
                      .filter(r => {
                        const menteeMatch = !reviewSearch || (r.mentee?.name || "").toLowerCase().includes(reviewSearch.toLowerCase());
                        const mentorMatch = !reviewMentorFilter || (r.mentor?.name || "").toLowerCase().includes(reviewMentorFilter.toLowerCase());
                        const ratingMatch = !reviewRatingFilter || r.rating === parseInt(reviewRatingFilter);
                        const dateMatch = !reviewDateFilter || (r.created_at && r.created_at.startsWith(reviewDateFilter));
                        return menteeMatch && mentorMatch && ratingMatch && dateMatch;
                      })
                      .map((r: any) => (
                        <div key={r.id} className={`rounded-lg border p-4 space-y-2 ${r.status === "removed" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {r.mentee?.name || "Unknown"} → {r.mentor?.name || "Unknown"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {r.created_at ? format(new Date(r.created_at), "MMM d, yyyy HH:mm") : "—"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <StarRating rating={r.rating} size="sm" />
                              <Badge variant={r.status === "active" ? "default" : "destructive"}>{r.status}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{r.review_text}</p>
                          <div className="flex gap-2">
                            {r.status === "active" ? (
                              <Button size="sm" variant="destructive" onClick={() => removeReview(r.id)}>
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => restoreReview(r.id)}>
                                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
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

          {/* Organisations Tab */}
          <TabsContent value="organisations">
            <div className="space-y-6">
              {/* Pending Orgs */}
              <Card>
                <CardHeader><CardTitle className="font-display">Pending Organisation Approvals</CardTitle></CardHeader>
                <CardContent>
                  {allOrgs.filter(o => !o.is_approved).length === 0 ? (
                    <p className="text-muted-foreground">No pending approvals.</p>
                  ) : (
                    <div className="space-y-3">
                      {allOrgs.filter(o => !o.is_approved).map((org: any) => (
                        <div key={org.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-accent/30 bg-accent/5 p-4 gap-3">
                          <div>
                            <p className="font-medium text-foreground">{org.name}</p>
                            <p className="text-sm text-muted-foreground">{org.contact_email || org.profiles?.email}</p>
                            {org.location && <p className="text-xs text-muted-foreground">📍 {org.location}</p>}
                            {org.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{org.description}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => approveOrg(org.id)}>
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => initiateDelete("organisation", org.id, org.name)}>
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* All Organisations */}
              <Card>
                <CardHeader><CardTitle className="font-display">All Organisations</CardTitle></CardHeader>
                <CardContent>
                  {allOrgs.filter(o => o.is_approved).length === 0 ? (
                    <p className="text-muted-foreground">No approved organisations.</p>
                  ) : (
                    <div className="space-y-3">
                      {allOrgs.filter(o => o.is_approved).map((org: any) => (
                        <div key={org.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border p-4 gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{org.name}</p>
                              {org.is_suspended && <Badge variant="destructive" className="text-xs">Suspended</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{org.contact_email || org.profiles?.email}</p>
                            {org.location && <p className="text-xs text-muted-foreground">📍 {org.location}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => suspendOrg(org.id)}>
                              <Ban className="h-3.5 w-3.5 mr-1" /> {org.is_suspended ? "Unsuspend" : "Suspend"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => initiateDelete("organisation", org.id, org.name)}>
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Secure 2-Step Deletion Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) { setDeleteDialog(null); setDeletePassword(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              {deleteStep === 1 ? "Confirm Deletion" : "Re-authenticate to Delete"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteStep === 1 ? (
                <>Are you sure you want to permanently delete <strong>{deleteDialog?.name}</strong>? This action cannot be undone.</>
              ) : (
                <>Enter your admin password to confirm permanent deletion of <strong>{deleteDialog?.name}</strong>.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteStep === 2 && (
            <Input
              type="password"
              placeholder="Enter your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="mt-2"
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteDialog(null); setDeletePassword(""); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteStep === 1 ? "Continue" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboardPage;
