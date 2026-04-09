import { useEffect, useState } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Clock, Check, X, AlertTriangle } from "lucide-react";

interface SlotRequest {
  id: string;
  mentee_id: string;
  requested_date: string;
  requested_start_time: string;
  requested_end_time: string;
  message: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  meeting_link: string | null;
  meeting_passcode: string | null;
}

export default function SlotRequestsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<SlotRequest[]>([]);
  const [menteeNames, setMenteeNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      const { data } = await supabaseUntyped
        .from("booking_requests")
        .select("*")
        .eq("mentor_id", user.id)
        .in("status", ["pending_mentor_confirmation", "accepted", "rejected"])
        .order("created_at", { ascending: false });

      if (data) {
        setRequests(data);
        // Fetch mentee names
        const menteeIds = [...new Set(data.map((r: SlotRequest) => r.mentee_id))];
        if (menteeIds.length > 0) {
          const { data: profiles } = await supabaseUntyped
            .from("profiles")
            .select("id, name")
            .in("id", menteeIds);
          if (profiles) {
            const nameMap: Record<string, string> = {};
            profiles.forEach((p: any) => { nameMap[p.id] = p.name; });
            setMenteeNames(nameMap);
          }
        }
      }
      setLoading(false);
    };

    fetchRequests();

    // Subscribe to realtime changes
    const channel = supabaseUntyped
      .channel("slot-requests")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "booking_requests",
        filter: `mentor_id=eq.${user.id}`,
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => { supabaseUntyped.removeChannel(channel); };
  }, [user]);

  const handleAction = async (requestId: string, action: "accept" | "reject") => {
    setProcessing(requestId);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const sess = (await supabaseUntyped.auth.getSession()).data.session;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/handle-slot-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sess?.access_token}`,
          },
          body: JSON.stringify({ request_id: requestId, action }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Action failed");

      toast({ title: action === "accept" ? "Request accepted! Meeting link generated." : "Request rejected. Refund initiated." });

      setRequests((prev) =>
        prev.map((r) => r.id === requestId ? { ...r, status: action === "accept" ? "accepted" : "rejected", meeting_link: result.meeting_link, meeting_passcode: result.meeting_passcode } : r)
      );
    } catch (err: unknown) {
      toast({ title: "Action failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending_mentor_confirmation");
  const otherRequests = requests.filter((r) => r.status !== "pending_mentor_confirmation");

  if (loading) return null;
  if (requests.length === 0) return null;

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Slot Requests
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="ml-2">{pendingRequests.length} pending</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingRequests.map((r) => (
          <div key={r.id} className="rounded-lg border-2 border-accent/50 bg-accent/5 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">
                  {menteeNames[r.mentee_id] || "Mentee"} requested a session
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(r.requested_date), "EEE, MMM d, yyyy")} • {r.requested_start_time.slice(0, 5)} – {r.requested_end_time.slice(0, 5)}
                </p>
                {r.message && <p className="text-sm text-muted-foreground mt-1 italic">"{r.message}"</p>}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-accent" />
                {getTimeRemaining(r.expires_at)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAction(r.id, "accept")}
                disabled={processing === r.id}
              >
                <Check className="h-4 w-4 mr-1" /> Accept
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction(r.id, "reject")}
                disabled={processing === r.id}
              >
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
          </div>
        ))}

        {otherRequests.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium text-muted-foreground">Past Requests</p>
            {otherRequests.slice(0, 5).map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {menteeNames[r.mentee_id] || "Mentee"} — {format(new Date(r.requested_date), "MMM d")}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.requested_start_time.slice(0, 5)} – {r.requested_end_time.slice(0, 5)}</p>
                </div>
                <Badge variant={r.status === "accepted" ? "default" : "destructive"}>
                  {r.status === "accepted" ? "Accepted" : "Rejected"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
